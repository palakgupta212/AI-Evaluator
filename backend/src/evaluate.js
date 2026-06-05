import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import pool from '../db.js';
import { extractAnswerSheet, evaluateAnswer } from '../model.js';

const router = express.Router();
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB limit per file
const uploadMultiple = multer({ dest: uploadsDir, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB limit per file, max 10 files via array size

// Helper: Load and base64 encode file (image or PDF)
function encodeFile(filePath, mimeType) {
  const base64 = fs.readFileSync(filePath, { encoding: 'base64' });
  return { data: base64, mimeType };
}

// Helper: Get MIME type from file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg'; // default
}

// Student submission endpoint (no auth required) - supports multiple files
router.post('/student-submit', (req, res, next) => {
  // Accept both 'file' (singular) and 'files' (plural) for backward compatibility
  uploadMultiple.fields([
    { name: 'files', maxCount: 10 },
    { name: 'file', maxCount: 10 }
  ])(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.code, err.message, err.field);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  // Combine files from both 'files' and 'file' fields
  const files = [
    ...(req.files?.files || []),
    ...(req.files?.file || [])
  ];
  const filePaths = files.map(f => f.path);
  
  try {
    const { studentName, rollNumber, termId, subjectId } = req.body;
    
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded.' });
    if (!studentName || !rollNumber) return res.status(400).json({ error: 'Name and roll number required.' });
    if (!termId) return res.status(400).json({ error: 'Exam term is required.' });
    if (!subjectId) return res.status(400).json({ error: 'Subject is required.' });

    // Verify that student name and roll number match in students table
    const { rows: studentRows } = await pool.query(
      'SELECT id, student_name, roll_number, date_of_birth FROM students WHERE roll_number = $1',
      [rollNumber]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ 
        error: `Student with roll number "${rollNumber}" not found in the database. Please add the student first with their name and date of birth.` 
      });
    }

    const student = studentRows[0];
    
    // Verify name matches (case-insensitive, trimmed)
    const registeredName = student.student_name.toLowerCase().trim();
    const providedName = studentName.toLowerCase().trim();
    
    if (registeredName !== providedName) {
      return res.status(400).json({ 
        error: `Name mismatch. The provided name "${studentName}" does not match the registered name "${student.student_name}" for roll number ${rollNumber}. Please verify the name and try again.` 
      });
    }

    // Step 1: Extract Q&A from all uploaded files and merge results
    let mergedStudentAnswers = {};
    
    for (const file of files) {
      try {
        // Use originalname to get the correct extension (multer saves files without extensions)
        const mimeType = getMimeType(file.originalname || file.path);
        const fileData = encodeFile(file.path, mimeType);
        console.log(`Processing file: ${file.originalname}, detected MIME type: ${mimeType}`);
        const extractedAnswers = await extractAnswerSheet(fileData.data, fileData.mimeType);
        
        // Merge extracted answers (later files override earlier ones for same question numbers)
        if (extractedAnswers && typeof extractedAnswers === 'object') {
          mergedStudentAnswers = { ...mergedStudentAnswers, ...extractedAnswers };
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        // Continue with other files even if one fails
      }
    }
    
    if (!mergedStudentAnswers || Object.keys(mergedStudentAnswers).length === 0) {
      return res.status(400).json({ 
        error: 'No questions found in the uploaded files. Please ensure the files (images/PDFs) contain questions in format: Q1. Question text\\nA. Answer text' 
      });
    }

    // Normalize question numbers from student answers to match database format
    const normalizedStudentAnswers = {};
    const sequentialAnswers = []; // Store sequential answers (seq-1, seq-2, etc.) separately
    
    for (const [key, value] of Object.entries(mergedStudentAnswers)) {
      const trimmedKey = key.trim();
      
      // Preserve sequential answers (seq-1, seq-2, etc.) - these don't have question numbers
      if (trimmedKey.startsWith('seq-')) {
        const seqIndex = parseInt(trimmedKey.replace('seq-', '')) || 0;
        sequentialAnswers.push({ index: seqIndex, key: trimmedKey, data: value });
        continue;
      }
      
      // Normalize various formats: Q1, 1, Q1(a), 1-a, 1a, etc. to database format
      let normalizedKey = trimmedKey;
      
      // Remove Q prefix if present
      normalizedKey = normalizedKey.replace(/^Q/i, '');
      
      // Handle formats like "1(a)", "1-a", "1a" → "1-a"
      const match = normalizedKey.match(/^(\d+)[\s\-_]?([a-z])?$/i);
      if (match) {
        const num = match[1];
        const subpart = match[2] ? `-${match[2].toLowerCase()}` : '';
        normalizedKey = num + subpart;
      }
      
      // If key already exists, merge answers
      if (normalizedStudentAnswers[normalizedKey]) {
        normalizedStudentAnswers[normalizedKey].answer = 
          (normalizedStudentAnswers[normalizedKey].answer + ' ' + (value.answer || '')).trim();
      } else {
        normalizedStudentAnswers[normalizedKey] = value;
      }
    }
    
    // Sort sequential answers by index
    sequentialAnswers.sort((a, b) => a.index - b.index);
    
    // Validate that we extracted at least some answers (with or without question numbers)
    const hasValidAnswers = Object.keys(normalizedStudentAnswers).length > 0 || sequentialAnswers.length > 0;
    if (!hasValidAnswers) {
      return res.status(400).json({ 
        error: 'Could not extract answers from the image. Please ensure the files contain readable answers.' 
      });
    }
    
    const studentAnswers = normalizedStudentAnswers;

    // Step 2: Load ALL correct answers from database for this term and subject (FULL ANSWER KEY)
    const { rows: answerKeys } = await pool.query(
      'SELECT question_number, question_text, answer_text, max_marks FROM answer_keys WHERE term_id = $1 AND subject_id = $2 ORDER BY question_number',
      [termId, subjectId]
    );
    
    if (answerKeys.length === 0) {
      return res.status(400).json({ error: 'No answer key found for this term and subject. Teacher must upload answer key first.' });
    }
    
    // Calculate total max marks for ALL questions in this term+subject (for proper percentage calculation)
    const totalMaxMarksForTermSubject = answerKeys.reduce((sum, key) => sum + (key.max_marks || 10), 0);
    
    // Helper function to calculate content similarity between student answer and answer key
    function calculateContentSimilarity(studentAnswer, answerKeyQuestion, answerKeyAnswer) {
      const studentLower = (studentAnswer || '').toLowerCase().trim();
      const questionLower = (answerKeyQuestion || '').toLowerCase();
      const answerLower = (answerKeyAnswer || '').toLowerCase();
      
      if (!studentLower) return 0;
      
      // Extract meaningful keywords (length > 3)
      const questionKeywords = questionLower.split(/\s+/).filter(w => w.length > 3);
      const answerKeywords = answerLower.split(/\s+/).filter(w => w.length > 3);
      const studentWords = studentLower.split(/\s+/).filter(w => w.length > 3);
      
      let similarity = 0;
      
      // Check keyword matches in question
      questionKeywords.forEach(kw => {
        if (studentLower.includes(kw)) similarity += 2;
      });
      
      // Check keyword matches in answer
      answerKeywords.forEach(kw => {
        if (studentLower.includes(kw)) similarity += 3; // Answer keywords are more important
      });
      
      // Check for common technical terms and concepts
      const technicalTerms = ['algorithm', 'function', 'method', 'process', 'system', 'data', 'structure', 
                              'analysis', 'design', 'implementation', 'example', 'explain', 'define', 
                              'calculate', 'solve', 'derive', 'prove', 'show', 'demonstrate'];
      technicalTerms.forEach(term => {
        if (questionLower.includes(term) && studentLower.includes(term)) similarity += 1;
        if (answerLower.includes(term) && studentLower.includes(term)) similarity += 1.5;
      });
      
      return similarity;
    }
    
    // Step 3: Match each student answer to the best matching answer key question
    const evaluationResults = {};
    let totalMarks = 0;
    const processedStudentAnswers = new Set();
    const matchedAnswerKeys = new Set();
    
    // First, try exact question number matches
    for (const [studentQNum, studentData] of Object.entries(studentAnswers)) {
      const studentAnswerText = (studentData.answer || '').trim();
      if (!studentAnswerText) continue;
      
      // Check for exact match
      const exactMatch = answerKeys.find(key => key.question_number === studentQNum);
      if (exactMatch) {
        processedStudentAnswers.add(studentQNum);
        matchedAnswerKeys.add(exactMatch.question_number);
        
        const evaluation = await evaluateAnswer(
          exactMatch.question_text || '',
          exactMatch.answer_text,
          studentAnswerText,
          exactMatch.max_marks || 10
        );
        
        evaluationResults[exactMatch.question_number] = {
          ...evaluation,
          student_answer: studentAnswerText,
          correct_answer: exactMatch.answer_text,
          question_text: exactMatch.question_text,
          matched_from: studentQNum
        };
        
        totalMarks += evaluation.marks;
        continue;
      }
    }
    
    // Then, match remaining student answers to best matching answer key questions by content
    for (const [studentQNum, studentData] of Object.entries(studentAnswers)) {
      if (processedStudentAnswers.has(studentQNum)) continue;
      
      const studentAnswerText = (studentData.answer || '').trim();
      if (!studentAnswerText) continue;
      
      // Find the best matching answer key question by content similarity
      let bestMatch = null;
      let bestSimilarity = 0;
      
      for (const answerKey of answerKeys) {
        // Skip if this answer key is already matched
        if (matchedAnswerKeys.has(answerKey.question_number)) continue;
        
        // Calculate similarity
        let similarity = calculateContentSimilarity(
          studentAnswerText,
          answerKey.question_text,
          answerKey.answer_text
        );
        
        // Also check question number similarity (e.g., "1" matches "1-a", "1-b")
        const qNumMatch = answerKey.question_number.match(/^(\d+)(?:-([a-z]))?$/);
        const studentQNumMatch = studentQNum.match(/^(\d+)(?:-([a-z]))?$/);
        if (qNumMatch && studentQNumMatch) {
          if (qNumMatch[1] === studentQNumMatch[1]) {
            // Same main question number - boost similarity
            similarity += 5;
          }
        }
        
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = answerKey;
        }
      }
      
      // If we found a reasonable match (similarity >= 3), evaluate it
      if (bestMatch && bestSimilarity >= 3) {
        processedStudentAnswers.add(studentQNum);
        matchedAnswerKeys.add(bestMatch.question_number);
        
        console.log(`Matched student answer "${studentQNum}" to answer key question "${bestMatch.question_number}" (similarity: ${bestSimilarity.toFixed(2)})`);
        
        const evaluation = await evaluateAnswer(
          bestMatch.question_text || '',
          bestMatch.answer_text,
          studentAnswerText,
          bestMatch.max_marks || 10
        );
        
        evaluationResults[bestMatch.question_number] = {
          ...evaluation,
          student_answer: studentAnswerText,
          correct_answer: bestMatch.answer_text,
          question_text: bestMatch.question_text,
          matched_from: studentQNum
        };
        
        totalMarks += evaluation.marks;
      } else {
        console.log(`No good match found for student answer "${studentQNum}" (best similarity: ${bestSimilarity.toFixed(2)})`);
      }
    }
    
    // Step 4: Handle sequential answers (answers without question numbers)
    // Match them to unmatched answer keys in order, using content similarity
    for (const seqAnswer of sequentialAnswers) {
      const studentAnswerText = (seqAnswer.data.answer || '').trim();
      if (!studentAnswerText) continue;
      
      // Find the best matching unmatched answer key question by content similarity
      let bestMatch = null;
      let bestSimilarity = 0;
      
      for (const answerKey of answerKeys) {
        // Skip if this answer key is already matched
        if (matchedAnswerKeys.has(answerKey.question_number)) continue;
        
        // Calculate similarity
        let similarity = calculateContentSimilarity(
          studentAnswerText,
          answerKey.question_text,
          answerKey.answer_text
        );
        
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = answerKey;
        }
      }
      
      // If we found a reasonable match (similarity >= 2), evaluate it
      // Lower threshold for sequential answers since they don't have question numbers
      if (bestMatch && bestSimilarity >= 2) {
        matchedAnswerKeys.add(bestMatch.question_number);
        
        console.log(`Matched sequential answer "${seqAnswer.key}" (index ${seqAnswer.index}) to answer key question "${bestMatch.question_number}" (similarity: ${bestSimilarity.toFixed(2)})`);
        
        const evaluation = await evaluateAnswer(
          bestMatch.question_text || '',
          bestMatch.answer_text,
          studentAnswerText,
          bestMatch.max_marks || 10
        );
        
        evaluationResults[bestMatch.question_number] = {
          ...evaluation,
          student_answer: studentAnswerText,
          correct_answer: bestMatch.answer_text,
          question_text: bestMatch.question_text,
          matched_from: seqAnswer.key,
          matched_type: 'sequential'
        };
        
        totalMarks += evaluation.marks;
      } else {
        // If no good match found, try sequential matching (match first seq answer to first unmatched question, etc.)
        const unmatchedKeys = answerKeys.filter(key => !matchedAnswerKeys.has(key.question_number));
        if (unmatchedKeys.length > 0 && seqAnswer.index <= unmatchedKeys.length) {
          const sequentialMatch = unmatchedKeys[seqAnswer.index - 1]; // seq-1 → index 0, seq-2 → index 1, etc.
          
          matchedAnswerKeys.add(sequentialMatch.question_number);
          
          console.log(`Matched sequential answer "${seqAnswer.key}" (index ${seqAnswer.index}) to answer key question "${sequentialMatch.question_number}" using sequential order`);
          
          const evaluation = await evaluateAnswer(
            sequentialMatch.question_text || '',
            sequentialMatch.answer_text,
            studentAnswerText,
            sequentialMatch.max_marks || 10
          );
          
          evaluationResults[sequentialMatch.question_number] = {
            ...evaluation,
            student_answer: studentAnswerText,
            correct_answer: sequentialMatch.answer_text,
            question_text: sequentialMatch.question_text,
            matched_from: seqAnswer.key,
            matched_type: 'sequential-order'
          };
          
          totalMarks += evaluation.marks;
        } else {
          console.log(`No match found for sequential answer "${seqAnswer.key}" (index ${seqAnswer.index})`);
        }
      }
    }
    
    // Initialize results for unmatched answer key questions (student didn't answer)
    for (const answerKey of answerKeys) {
      if (!matchedAnswerKeys.has(answerKey.question_number)) {
        evaluationResults[answerKey.question_number] = {
          marks: 0,
          max_marks: answerKey.max_marks || 10,
          reason: 'Question not answered by student',
          matched_concepts: [],
          missing_concepts: [],
          student_answer: '',
          correct_answer: answerKey.answer_text,
          question_text: answerKey.question_text
        };
      }
    }
    
    const percentage = totalMaxMarksForTermSubject > 0 ? ((totalMarks / totalMaxMarksForTermSubject) * 100).toFixed(2) : 0;
    
    // Calculate SGPA (Grade Point Average) - Convert percentage to 9.8-point scale
    // Formula: SGPA = (Percentage / 100) * 10
    const sgpa = (parseFloat(percentage) / 100) * 10;
    
    // Step 4: Store submission in database (upsert for term+subject+roll uniqueness)
    await pool.query(`
      INSERT INTO student_submissions (term_id, subject_id, student_name, roll_number, total_marks, total_max_marks, percentage, sgpa, submission_data) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (term_id, subject_id, roll_number) 
      DO UPDATE SET 
        student_name = EXCLUDED.student_name,
        total_marks = EXCLUDED.total_marks,
        total_max_marks = EXCLUDED.total_max_marks,
        percentage = EXCLUDED.percentage,
        sgpa = EXCLUDED.sgpa,
        submission_data = EXCLUDED.submission_data,
        submission_time = NOW()
    `, [termId, subjectId, studentName, rollNumber, totalMarks, totalMaxMarksForTermSubject, parseFloat(percentage), sgpa, JSON.stringify(evaluationResults)]);
    
    res.json({
      status: 'success',
      student_name: studentName,
      roll_number: rollNumber,
      summary: {
        total_marks: totalMarks,
        total_max_marks: totalMaxMarksForTermSubject,
        percentage: parseFloat(percentage),
        sgpa: sgpa.toFixed(2),
        questions_answered: Object.keys(evaluationResults).filter(q => evaluationResults[q].student_answer).length,
        total_questions: answerKeys.length
      },
      question_wise_results: evaluationResults
    });
    
  } catch (err) {
    console.error('Evaluation error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    // Clean up uploaded files
    filePaths.forEach(filePath => {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
    });
  }
});

// Teacher upload answer key endpoint (requires auth token in future) - supports multiple files
router.post('/teacher-upload', (req, res, next) => {
  // Accept both 'file' (singular) and 'files' (plural) for backward compatibility
  uploadMultiple.fields([
    { name: 'files', maxCount: 10 },
    { name: 'file', maxCount: 10 }
  ])(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.code, err.message, err.field);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  // Combine files from both 'files' and 'file' fields
  const files = [
    ...(req.files?.files || []),
    ...(req.files?.file || [])
  ];
  const filePaths = files.map(f => f.path);
  
  try {
    const { termId, subjectId } = req.body;
    
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded.' });
    if (!termId) return res.status(400).json({ error: 'Exam term is required.' });
    if (!subjectId) return res.status(400).json({ error: 'Subject is required.' });

    // Extract Q&A from all uploaded files and merge results
    let mergedExtractedAnswers = {};
    
    for (const file of files) {
      try {
        // Use originalname to get the correct extension (multer saves files without extensions)
        const mimeType = getMimeType(file.originalname || file.path);
        const fileData = encodeFile(file.path, mimeType);
        console.log(`Processing file: ${file.originalname}, detected MIME type: ${mimeType}`);
        const extractedAnswers = await extractAnswerSheet(fileData.data, fileData.mimeType);
        
        // Merge extracted answers (later files override earlier ones for same question numbers)
        if (extractedAnswers && typeof extractedAnswers === 'object') {
          mergedExtractedAnswers = { ...mergedExtractedAnswers, ...extractedAnswers };
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        // Continue with other files even if one fails
      }
    }
    
    if (!mergedExtractedAnswers || Object.keys(mergedExtractedAnswers).length === 0) {
      return res.status(400).json({ error: 'No valid Q&A found in uploaded files (images/PDFs).' });
    }
    
    const extractedAnswers = mergedExtractedAnswers;

    const insertedQuestions = [];
    const conflicts = [];
    
    // Check for conflicts and prepare data (term+subject specific)
    for (const [qNum, qData] of Object.entries(extractedAnswers)) {
      const { rows } = await pool.query(
        'SELECT id FROM answer_keys WHERE term_id = $1 AND subject_id = $2 AND question_number = $3',
        [termId, subjectId, qNum]
      );
      
      if (rows.length > 0) {
        conflicts.push({
          questionNumber: qNum,
          question: qData.question,
          answer: qData.answer
        });
      } else {
        insertedQuestions.push({
          questionNumber: qNum,
          question: qData.question,
          answer: qData.answer
        });
      }
    }
    
    // Return conflicts for user confirmation
    if (conflicts.length > 0) {
      return res.json({
        conflicts: true,
        conflictQuestions: conflicts.map(c => c.questionNumber),
        allQuestions: extractedAnswers,
        message: 'Some questions already exist. Confirm to overwrite.'
      });
    }
    
    // Insert all new questions (with max_marks default to 10)
    for (const qa of insertedQuestions) {
      await pool.query(
        'INSERT INTO answer_keys (term_id, subject_id, question_number, question_text, answer_text, max_marks) VALUES ($1, $2, $3, $4, $5, $6)',
        [termId, subjectId, qa.questionNumber, qa.question, qa.answer, 10]
      );
    }
    
    res.json({
      status: 'success',
      inserted: insertedQuestions.length,
      questions: extractedAnswers,
      message: 'Answer key uploaded successfully'
    });
    
  } catch (err) {
    console.error('Teacher upload error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    // Clean up uploaded files
    filePaths.forEach(filePath => {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
    });
  }
});

// Confirm overwrite for conflicting questions
router.post('/teacher-confirm-overwrite', async (req, res) => {
  try {
    const { questions, termId, subjectId } = req.body; // Object: { "Q1": {question, answer}, "Q2": {...} }
    
    if (!questions || Object.keys(questions).length === 0) {
      return res.status(400).json({ error: 'No questions provided' });
    }
    if (!termId || !subjectId) {
      return res.status(400).json({ error: 'Term and subject are required' });
    }
    
    let overwritten = 0;
    for (const [qNum, qData] of Object.entries(questions)) {
      // Upsert: Delete existing and insert new (term+subject specific)
      await pool.query('DELETE FROM answer_keys WHERE term_id = $1 AND subject_id = $2 AND question_number = $3', [termId, subjectId, qNum]);
      await pool.query(
        'INSERT INTO answer_keys (term_id, subject_id, question_number, question_text, answer_text, max_marks) VALUES ($1, $2, $3, $4, $5, $6)',
        [termId, subjectId, qNum, qData.question, qData.answer, qData.max_marks || 10]
      );
      overwritten++;
    }
    
    res.json({ status: 'success', overwritten, message: 'Questions overwritten successfully' });
    
  } catch (err) {
    console.error('Overwrite error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
