import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all answer keys for teacher dashboard (optionally filtered by term and subject)
router.get('/answer-keys', async (req, res) => {
  try {
    const { termId, subjectId } = req.query;
    
    let query = `
      SELECT 
        a.question_number, 
        a.question_text, 
        a.answer_text, 
        a.max_marks, 
        a.created_at,
        a.term_id,
        a.subject_id,
        t.term_code,
        s.subject_code,
        s.subject_name
      FROM answer_keys a
      JOIN exam_terms t ON a.term_id = t.id
      JOIN subjects s ON a.subject_id = s.id
    `;
    const params = [];
    const conditions = [];
    
    if (termId) {
      params.push(termId);
      conditions.push(`a.term_id = $${params.length}`);
    }
    
    if (subjectId) {
      params.push(subjectId);
      conditions.push(`a.subject_id = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' ORDER BY a.term_id, a.subject_id, a.question_number';
    
    const { rows } = await pool.query(query, params);
    res.json({ 
      status: 'success',
      count: rows.length,
      questions: rows 
    });
  } catch (err) {
    console.error('Error fetching answer keys:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a specific answer key (requires termId, subjectId and questionNumber)
router.delete('/answer-keys/:termId/:subjectId/:questionNumber', async (req, res) => {
  try {
    const { termId, subjectId, questionNumber } = req.params;
    const result = await pool.query(
      'DELETE FROM answer_keys WHERE term_id = $1 AND subject_id = $2 AND question_number = $3 RETURNING *',
      [termId, subjectId, questionNumber]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json({ 
      status: 'success',
      message: `Question ${questionNumber} deleted successfully` 
    });
  } catch (err) {
    console.error('Error deleting answer key:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get student submissions summary (optionally filtered by term)
router.get('/submissions', async (req, res) => {
  try {
    const { termId } = req.query;
    
    let query = `
      SELECT 
        s.id, 
        s.student_name, 
        s.roll_number, 
        s.total_marks,
        s.total_max_marks,
        s.percentage,
        s.submission_time,
        t.term_code
      FROM student_submissions s
      JOIN exam_terms t ON s.term_id = t.id
    `;
    const params = [];
    
    if (termId) {
      params.push(termId);
      query += ` WHERE s.term_id = $1`;
    }
    
    query += ' ORDER BY s.submission_time DESC LIMIT 100';
    
    const { rows } = await pool.query(query, params);
    res.json({ 
      status: 'success',
      count: rows.length,
      submissions: rows 
    });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all submissions grouped by student (for term+subject-wise table view)
router.get('/all-submissions', async (req, res) => {
  try {
    // Get all unique students
    const { rows: students } = await pool.query(`
      SELECT DISTINCT student_name, roll_number
      FROM student_submissions
      ORDER BY roll_number
    `);
    
    // For each student, get their results for all terms and subjects
    const studentResults = [];
    
    for (const student of students) {
      const { rows: allResults } = await pool.query(`
        SELECT 
          t.term_code,
          t.id as term_id,
          sub.subject_code,
          sub.subject_name,
          sub.id as subject_id,
          s.percentage,
          s.total_marks,
          s.total_max_marks
        FROM student_submissions s
        JOIN exam_terms t ON s.term_id = t.id
        JOIN subjects sub ON s.subject_id = sub.id
        WHERE s.roll_number = $1
        ORDER BY t.id, sub.subject_code
      `, [student.roll_number]);
      
      // Group by term, then by subject
      const termMap = {};
      allResults.forEach(r => {
        if (!termMap[r.term_code]) {
          termMap[r.term_code] = {
            term_code: r.term_code,
            term_id: r.term_id,
            subjects: {}
          };
        }
        termMap[r.term_code].subjects[r.subject_code] = {
          subject_code: r.subject_code,
          subject_name: r.subject_name,
          subject_id: r.subject_id,
          percentage: r.percentage,
          marks: r.total_marks,
          maxMarks: r.total_max_marks
        };
      });
      
      // Calculate overall average across all subjects and terms
      const avgPercentage = allResults.length > 0
        ? (allResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / allResults.length).toFixed(2)
        : 0;
      
      // Sort terms by term_id
      const sortedTerms = Object.values(termMap).sort((a, b) => a.term_id - b.term_id);
      
      studentResults.push({
        student_name: student.student_name,
        roll_number: student.roll_number,
        terms: sortedTerms,
        average: parseFloat(avgPercentage),
        total_submissions: allResults.length
      });
    }
    
    res.json({ 
      status: 'success',
      count: studentResults.length,
      students: studentResults 
    });
  } catch (err) {
    console.error('Error fetching all submissions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Legacy teacher analytics endpoint
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM student_submissions ORDER BY submission_time DESC LIMIT 20'
    );
    res.json({ submissions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy student scores endpoint
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM student_submissions WHERE roll_number = $1 ORDER BY submission_time DESC',
      [studentId]
    );
    res.json({ results: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
