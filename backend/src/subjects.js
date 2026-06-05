import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all subjects (optionally filtered by semester)
router.get('/', async (req, res) => {
  try {
    const { semester } = req.query;
    let query = 'SELECT id, subject_code, subject_name, semester, is_active FROM subjects';
    const params = [];
    
    if (semester) {
      query += ' WHERE semester = $1';
      params.push(parseInt(semester));
    }
    
    query += ' ORDER BY semester, subject_code';
    
    const { rows } = await pool.query(query, params);
    res.json({ 
      status: 'success',
      subjects: rows 
    });
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get specific subject by ID
router.get('/:subjectId', async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM subjects WHERE id = $1',
      [subjectId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    res.json({ 
      status: 'success',
      subject: rows[0] 
    });
  } catch (err) {
    console.error('Error fetching subject:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new subject (with semester)
router.post('/', async (req, res) => {
  try {
    const { subject_code, subject_name, semester } = req.body;
    
    if (!subject_code || !subject_name || !semester) {
      return res.status(400).json({ error: 'Subject code, name, and semester are required' });
    }
    
    if (semester < 1 || semester > 8) {
      return res.status(400).json({ error: 'Semester must be between 1 and 8' });
    }
    
    const { rows } = await pool.query(
      'INSERT INTO subjects (subject_code, subject_name, semester, is_active) VALUES ($1, $2, $3, true) RETURNING *',
      [subject_code, subject_name, parseInt(semester)]
    );
    
    res.json({ 
      status: 'success',
      subject: rows[0] 
    });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Subject code already exists' });
    }
    console.error('Error creating subject:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
