import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

// Verify DOB and check if password is set
router.post('/verify-dob', async (req, res) => {
  try {
    const { rollNumber, dateOfBirth } = req.body;
    
    if (!rollNumber || !dateOfBirth) {
      return res.status(400).json({ error: 'Roll number and date of birth are required' });
    }

    // Check if student exists with this roll number and DOB
    const { rows } = await pool.query(
      'SELECT id, roll_number, student_name, date_of_birth, is_password_set FROM students WHERE roll_number = $1 AND date_of_birth = $2',
      [rollNumber, dateOfBirth]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invalid roll number or date of birth' });
    }

    const student = rows[0];
    
    res.json({
      status: 'success',
      student_name: student.student_name,
      roll_number: student.roll_number,
      is_password_set: student.is_password_set,
      requires_password_setup: !student.is_password_set
    });
  } catch (err) {
    console.error('Error verifying DOB:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create password for student (first time setup)
router.post('/create-password', async (req, res) => {
  try {
    const { rollNumber, dateOfBirth, password } = req.body;
    
    if (!rollNumber || !dateOfBirth || !password) {
      return res.status(400).json({ error: 'Roll number, date of birth, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Verify DOB first
    const { rows: verifyRows } = await pool.query(
      'SELECT id FROM students WHERE roll_number = $1 AND date_of_birth = $2',
      [rollNumber, dateOfBirth]
    );

    if (verifyRows.length === 0) {
      return res.status(404).json({ error: 'Invalid roll number or date of birth' });
    }

    // Hash password and update student record
    const passwordHash = await bcrypt.hash(password, 10);
    
    await pool.query(
      'UPDATE students SET password_hash = $1, is_password_set = true, updated_at = NOW() WHERE roll_number = $2 AND date_of_birth = $3',
      [passwordHash, rollNumber, dateOfBirth]
    );

    res.json({
      status: 'success',
      message: 'Password created successfully'
    });
  } catch (err) {
    console.error('Error creating password:', err);
    res.status(500).json({ error: err.message });
  }
});

// Student login with roll number, DOB, and password
router.post('/login', async (req, res) => {
  try {
    const { rollNumber, dateOfBirth, password } = req.body;
    
    if (!rollNumber || !dateOfBirth || !password) {
      return res.status(400).json({ error: 'Roll number, date of birth, and password are required' });
    }

    // Get student with DOB verification
    const { rows } = await pool.query(
      'SELECT id, roll_number, student_name, date_of_birth, password_hash, is_password_set FROM students WHERE roll_number = $1 AND date_of_birth = $2',
      [rollNumber, dateOfBirth]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid roll number or date of birth' });
    }

    const student = rows[0];

    if (!student.is_password_set || !student.password_hash) {
      return res.status(401).json({ error: 'Password not set. Please set your password first.' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        studentId: student.id, 
        rollNumber: student.roll_number,
        role: 'student' 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      status: 'success',
      token,
      student_name: student.student_name,
      roll_number: student.roll_number,
      role: 'student'
    });
  } catch (err) {
    console.error('Error in student login:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

