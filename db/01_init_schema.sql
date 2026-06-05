-- Initial schema setup
-- This file runs automatically when the database is first created

-- Users (teacher only, students don't need accounts)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('teacher')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exam Terms (CIA1, CIA2, CIA3)
CREATE TABLE IF NOT EXISTS exam_terms (
  id SERIAL PRIMARY KEY,
  term_code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default terms
INSERT INTO exam_terms (term_code, description) VALUES
  ('CIA1', 'First Continuous Internal Assessment'),
  ('CIA2', 'Second Continuous Internal Assessment'),
  ('CIA3', 'Third Continuous Internal Assessment')
ON CONFLICT (term_code) DO NOTHING;

-- Students table (for authentication and DOB)
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  roll_number VARCHAR(100) UNIQUE NOT NULL,
  student_name VARCHAR(200) NOT NULL,
  date_of_birth DATE NOT NULL,
  password_hash VARCHAR(255),
  is_password_set BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  subject_code VARCHAR(20) UNIQUE NOT NULL,
  subject_name VARCHAR(200) NOT NULL,
  semester INTEGER CHECK (semester IN (1, 2, 3, 4, 5, 6, 7, 8)),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Delete all existing subjects and insert only the required ones
DELETE FROM subjects;

INSERT INTO subjects (subject_code, subject_name, semester, is_active) VALUES
  -- 1st Year (Semester I)
  ('BAS101', 'Engineering Physics', 1, true),
  ('BAS103', 'Engineering Mathematics-I', 1, true),
  ('BEE101', 'Fundamentals of Electrical Engineering', 1, true),
  ('BME101', 'Fundamentals of Mechanical Engineering', 1, true),
  ('BAS105', 'Soft Skills', 1, true),

  -- 1st Year (Semester II)
  ('BAS102', 'Engineering Chemistry', 2, true),
  ('BAS203', 'Engineering Mathematics-II', 2, true),
  ('BEC101', 'Fundamentals of Electronics Engineering', 2, true),
  ('BCS101', 'Programming for Problem Solving', 2, true),
  ('BAS104', 'Environment and Ecology', 2, true),

  -- 2nd Year (Semester III)
  ('BAS303', 'Mathematics-IV', 3, true),
  ('BVE301', 'Universal Human Value and Professional Ethics', 3, true),
  ('BCS301', 'Data Structure', 3, true),
  ('BCS302', 'Computer Organization and Architecture', 3, true),
  ('BCS303', 'Discrete Structures & Theory of Logic', 3, true),
  ('BCC302', 'Python Programming', 3, true),

  -- 2nd Year (Semester IV)
  ('BOE404', 'Energy Science & Engineering', 4, true),
  ('BAS401', 'Technical Communication', 4, true),
  ('BCS401', 'Operating System', 4, true),
  ('BCS402', 'Theory of Automata and Formal Languages', 4, true),
  ('BCS403', 'Object Oriented Programming with Java', 4, true),
  ('BCC401', 'Cyber Security', 4, true),

  -- 3rd Year (Semester V)
  ('BCS501', 'Database Management System', 5, true),
  ('BCDS501', 'Introduction to Data Analytics and Visualization', 5, true),
  ('BCS503', 'Design and Analysis of Algorithm', 5, true),
  ('BCDS051', 'Business Intelligence and Analytics', 5, true),
  ('BCS056', 'Application of Soft Computing', 5, true),
  ('BNC501', 'Constitution of India', 5, true),

  -- 3rd Year (Semester VI)
  ('BCS601', 'Software Engineering', 6, true),
  ('BCDS601', 'Big Data and Analytics', 6, true),
  ('BCS603', 'Computer Networks', 6, true),
  ('BCDS062', 'Machine Learning Techniques', 6, true),
  ('BOE068', 'Software Project Management', 6, true),
  ('BNC602', 'Essence of Indian Traditional Knowledge', 6, true),

  -- 4th Year (Semester VII)
  ('BAI701', 'Deep Learning', 7, true),
  ('BCS072', 'Cryptography & Network Security', 7, true),
  ('BOE074', 'Renewable Energy Resources', 7, true),

  -- 4th Year (Semester VIII)
  ('BCS070', 'Internet of Things', 8, true),
  ('BAI071', 'Blockchain Architecture Design', 8, true)
ON CONFLICT (subject_code) DO UPDATE SET
  subject_name = EXCLUDED.subject_name,
  semester = EXCLUDED.semester,
  is_active = EXCLUDED.is_active;

-- Answer Keys (now linked to exam terms and subjects)
CREATE TABLE IF NOT EXISTS answer_keys (
  id SERIAL PRIMARY KEY,
  term_id INTEGER REFERENCES exam_terms(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  question_number VARCHAR(10) NOT NULL,
  question_text TEXT,
  answer_text TEXT NOT NULL,
  max_marks INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(term_id, subject_id, question_number)
);

-- Student Submissions (now linked to exam terms and subjects)
CREATE TABLE IF NOT EXISTS student_submissions (
  id SERIAL PRIMARY KEY,
  term_id INTEGER REFERENCES exam_terms(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  student_name VARCHAR(200) NOT NULL,
  roll_number VARCHAR(100) NOT NULL,
  total_marks FLOAT DEFAULT 0,
  total_max_marks FLOAT DEFAULT 0,
  percentage FLOAT DEFAULT 0,
  sgpa FLOAT DEFAULT 0,
  submission_data JSONB,
  submission_time TIMESTAMP DEFAULT NOW(),
  UNIQUE(term_id, subject_id, roll_number),
  FOREIGN KEY (roll_number) REFERENCES students(roll_number) ON DELETE CASCADE
);

-- Create indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_dob ON students(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_submissions_roll ON student_submissions(roll_number);
CREATE INDEX IF NOT EXISTS idx_submissions_name ON student_submissions(student_name);
CREATE INDEX IF NOT EXISTS idx_submissions_term ON student_submissions(term_id);
CREATE INDEX IF NOT EXISTS idx_submissions_subject ON student_submissions(subject_id);
CREATE INDEX IF NOT EXISTS idx_submissions_term_subject ON student_submissions(term_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_answer_keys_term_subject ON answer_keys(term_id, subject_id);

-- Analytics (optional, for future dashboard)
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
