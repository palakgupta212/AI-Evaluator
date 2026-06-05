import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all students (for teacher dashboard)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, roll_number, student_name, date_of_birth, is_password_set, created_at FROM students ORDER BY roll_number'
    );
    res.json({ 
      status: 'success',
      students: rows 
    });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get student by roll number
router.get('/:rollNumber', async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const { rows } = await pool.query(
      'SELECT id, roll_number, student_name, date_of_birth, is_password_set FROM students WHERE roll_number = $1',
      [rollNumber]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({ 
      status: 'success',
      student: rows[0] 
    });
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create or update student (for teachers)
router.post('/', async (req, res) => {
  try {
    const { rollNumber, studentName, dateOfBirth } = req.body;
    
    if (!rollNumber || !studentName || !dateOfBirth) {
      return res.status(400).json({ error: 'Roll number, student name, and date of birth are required' });
    }

    // Validate date format
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({ error: 'Invalid date of birth format' });
    }

    // Check if student already exists
    const { rows: existing } = await pool.query(
      'SELECT id, student_name FROM students WHERE roll_number = $1',
      [rollNumber]
    );

    if (existing.length > 0) {
      // Update existing student (only name and DOB if they match)
      if (existing[0].student_name.toLowerCase().trim() !== studentName.toLowerCase().trim()) {
        return res.status(400).json({ 
          error: `Student with roll number ${rollNumber} already exists with name "${existing[0].student_name}". Name mismatch detected.` 
        });
      }

      await pool.query(
        'UPDATE students SET student_name = $1, date_of_birth = $2, updated_at = NOW() WHERE roll_number = $3',
        [studentName, dateOfBirth, rollNumber]
      );

      res.json({ 
        status: 'success',
        message: 'Student updated successfully',
        student: { roll_number: rollNumber, student_name: studentName, date_of_birth: dateOfBirth }
      });
    } else {
      // Create new student
      const { rows } = await pool.query(
        'INSERT INTO students (roll_number, student_name, date_of_birth) VALUES ($1, $2, $3) RETURNING id, roll_number, student_name, date_of_birth',
        [rollNumber, studentName, dateOfBirth]
      );

      res.json({ 
        status: 'success',
        message: 'Student created successfully',
        student: rows[0]
      });
    }
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Student with this roll number already exists' });
    }
    console.error('Error creating/updating student:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify name and roll number match
router.post('/verify', async (req, res) => {
  try {
    const { rollNumber, studentName } = req.body;
    
    if (!rollNumber || !studentName) {
      return res.status(400).json({ error: 'Roll number and student name are required' });
    }

    const { rows } = await pool.query(
      'SELECT id, student_name, roll_number FROM students WHERE roll_number = $1',
      [rollNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: `Student with roll number "${rollNumber}" not found. Please add the student first.`,
        exists: false
      });
    }

    const student = rows[0];
    const nameMatches = student.student_name.toLowerCase().trim() === studentName.toLowerCase().trim();

    if (!nameMatches) {
      return res.status(400).json({ 
        error: `Name mismatch. The provided name "${studentName}" does not match the registered name "${student.student_name}" for roll number ${rollNumber}.`,
        exists: true,
        registered_name: student.student_name
      });
    }

    res.json({ 
      status: 'success',
      verified: true,
      student: {
        roll_number: student.roll_number,
        student_name: student.student_name
      }
    });
  } catch (err) {
    console.error('Error verifying student:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

