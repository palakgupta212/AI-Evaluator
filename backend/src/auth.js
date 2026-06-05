import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', [username, hash, role]);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
  if (!rows[0]) return res.status(400).json({ error: 'Invalid username or password' });
  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return res.status(400).json({ error: 'Invalid username or password' });
  const token = jwt.sign({ userId: rows[0].id, role: rows[0].role }, JWT_SECRET, { expiresIn: '5h' });
  res.json({ token, role: rows[0].role });
});

export default router;
