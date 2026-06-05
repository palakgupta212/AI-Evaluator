import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all exam terms
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, term_code, description, is_active FROM exam_terms ORDER BY id'
    );
    res.json({ 
      status: 'success',
      terms: rows 
    });
  } catch (err) {
    console.error('Error fetching terms:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get specific term by ID
router.get('/:termId', async (req, res) => {
  try {
    const { termId } = req.params;
    const { rows } = await pool.query(
      'SELECT id, term_code, description, is_active FROM exam_terms WHERE id = $1',
      [termId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Term not found' });
    }
    
    res.json({ 
      status: 'success',
      term: rows[0] 
    });
  } catch (err) {
    console.error('Error fetching term:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get term by code (CIA1, CIA2, CIA3, etc.)
router.get('/code/:termCode', async (req, res) => {
  try {
    const { termCode } = req.params;
    const { rows } = await pool.query(
      'SELECT id, term_code, description, is_active FROM exam_terms WHERE term_code = $1',
      [termCode]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Term not found' });
    }
    
    res.json({ 
      status: 'success',
      term: rows[0] 
    });
  } catch (err) {
    console.error('Error fetching term:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
