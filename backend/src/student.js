import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Search student by name and/or roll number
router.get('/search', async (req, res) => {
  try {
    const { name, rollNumber } = req.query;
    
    if (!name && !rollNumber) {
      return res.status(400).json({ error: 'Please provide name or roll number' });
    }

    let query = `
      SELECT DISTINCT 
        s.student_name, 
        s.roll_number,
        COUNT(s.id) as total_submissions
      FROM student_submissions s
      WHERE 1=1
    `;
    const params = [];
    
    if (name) {
      params.push(`%${name}%`);
      query += ` AND LOWER(s.student_name) LIKE LOWER($${params.length})`;
    }
    
    if (rollNumber) {
      params.push(rollNumber);
      query += ` AND s.roll_number = $${params.length}`;
    }
    
    query += ' GROUP BY s.student_name, s.roll_number';
    
    const { rows } = await pool.query(query, params);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'No results found for the given name/roll number' 
      });
    }
    
    res.json({ 
      status: 'success',
      students: rows 
    });
  } catch (err) {
    console.error('Error searching student:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all results for a student (all terms)
router.get('/results/:rollNumber', async (req, res) => {
  try {
    const { rollNumber } = req.params;
    
    const { rows } = await pool.query(`
      SELECT 
        s.id,
        s.student_name,
        s.roll_number,
        s.total_marks,
        s.total_max_marks,
        s.percentage,
        s.sgpa,
        s.submission_data,
        s.submission_time,
        t.term_code,
        t.id as term_id,
        sub.subject_code,
        sub.subject_name,
        sub.semester,
        sub.id as subject_id
      FROM student_submissions s
      JOIN exam_terms t ON s.term_id = t.id
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE s.roll_number = $1
      ORDER BY sub.semester, t.id, sub.subject_code
    `, [rollNumber]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'No submissions found for this roll number' 
      });
    }
    
    // Calculate overall statistics
    const totalMarks = rows.reduce((sum, r) => sum + (r.total_marks || 0), 0);
    const totalMaxMarks = rows.reduce((sum, r) => sum + (r.total_max_marks || 0), 0);
    const overallPercentage = totalMaxMarks > 0 ? ((totalMarks / totalMaxMarks) * 100).toFixed(2) : 0;
    
    // Calculate SGPA and GPA by semester
    const sem5Results = rows.filter(r => r.semester === 5);
    const sem6Results = rows.filter(r => r.semester === 6);
    
    const calculateSemesterSGPA = (semResults) => {
      if (semResults.length === 0) return null;
      const totalSGPA = semResults.reduce((sum, r) => sum + (r.sgpa || 0), 0);
      return (totalSGPA / semResults.length).toFixed(2);
    };
    
    const sem5SGPA = calculateSemesterSGPA(sem5Results);
    const sem6SGPA = calculateSemesterSGPA(sem6Results);
    
    // Calculate overall GPA (average of all SGPA values)
    const allResults = [...sem5Results, ...sem6Results];
    const overallGPA = allResults.length > 0 
      ? (allResults.reduce((sum, r) => sum + (r.sgpa || 0), 0) / allResults.length).toFixed(2)
      : '0.00';
    
    res.json({ 
      status: 'success',
      student_name: rows[0].student_name,
      roll_number: rollNumber,
      overall: {
        total_marks: totalMarks,
        total_max_marks: totalMaxMarks,
        percentage: parseFloat(overallPercentage),
        gpa: overallGPA,
        terms_completed: rows.length
      },
      semester_wise: {
        semester_5: {
          sgpa: sem5SGPA,
          subjects_count: sem5Results.length
        },
        semester_6: {
          sgpa: sem6SGPA,
          subjects_count: sem6Results.length
        }
      },
      term_results: rows.map(r => ({
        term_code: r.term_code,
        term_id: r.term_id,
        subject_code: r.subject_code,
        subject_name: r.subject_name,
        subject_id: r.subject_id,
        semester: r.semester,
        marks: r.total_marks,
        max_marks: r.total_max_marks,
        percentage: r.percentage,
        sgpa: r.sgpa ? parseFloat(r.sgpa).toFixed(2) : '0.00',
        submission_time: r.submission_time,
        detailed_results: r.submission_data
      }))
    });
  } catch (err) {
    console.error('Error fetching student results:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get analytics data for student (for charts)
router.get('/analytics/:rollNumber', async (req, res) => {
  try {
    const { rollNumber } = req.params;
    
    const { rows } = await pool.query(`
      SELECT 
        t.term_code,
        t.id as term_id,
        sub.subject_code,
        sub.subject_name,
        sub.semester,
        sub.id as subject_id,
        s.percentage,
        s.sgpa,
        s.total_marks,
        s.total_max_marks
      FROM student_submissions s
      JOIN exam_terms t ON s.term_id = t.id
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE s.roll_number = $1
      ORDER BY sub.semester, t.id, sub.subject_code
    `, [rollNumber]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'No data found for this student' 
      });
    }
    
    // Format for charts - group by subject and term, include semester
    const chartData = rows.map(r => ({
      term: r.term_code,
      termId: r.term_id,
      subject: r.subject_code,
      subjectName: r.subject_name,
      subjectId: r.subject_id,
      semester: r.semester,
      percentage: parseFloat(r.percentage) || 0,
      sgpa: parseFloat(r.sgpa) || 0,
      marks: r.total_marks,
      maxMarks: r.total_max_marks,
      label: `${r.subject_code} - ${r.term_code} (Sem ${r.semester})`
    }));
    
    res.json({ 
      status: 'success',
      chart_data: chartData 
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get specific term result for a student
router.get('/result/:termId/:rollNumber', async (req, res) => {
  try {
    const { termId, rollNumber } = req.params;
    
    const { rows } = await pool.query(`
      SELECT 
        s.*,
        t.term_code
      FROM student_submissions s
      JOIN exam_terms t ON s.term_id = t.id
      WHERE s.term_id = $1 AND s.roll_number = $2
    `, [termId, rollNumber]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'No submission found for this term and roll number' 
      });
    }
    
    res.json({ 
      status: 'success',
      result: rows[0] 
    });
  } catch (err) {
    console.error('Error fetching result:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
