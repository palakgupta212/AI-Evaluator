import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';

// Routers
import authRouter from './routes/auth.js';
import evaluateRouter from './routes/evaluate.js';
import dashboardRouter from './routes/dashboard.js';
import termsRouter from './routes/terms.js';
import studentRouter from './routes/student.js';
import studentAuthRouter from './routes/studentAuth.js';
import studentsRouter from './routes/students.js';
import subjectsRouter from './routes/subjects.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const UPLOADS_DIR = path.resolve('uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/evaluate', evaluateRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/terms', termsRouter);
app.use('/api/student', studentRouter);
app.use('/api/student-auth', studentAuthRouter);
app.use('/api/students', studentsRouter);
app.use('/api/subjects', subjectsRouter);

// Health check
app.get('/api/health', (req, res) => res.send({ status: 'ok' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Backend listening on :${PORT}`);
});
