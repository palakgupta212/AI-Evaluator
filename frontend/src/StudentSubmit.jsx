import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, TextField, Alert, Card, CardContent, 
  CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, Paper,
  Select, MenuItem, FormControl, InputLabel, Chip
} from '@mui/material';
import axios from 'axios';
import { API_BASE_URL } from '../config';

function StudentSubmit() {
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [termId, setTermId] = useState('');
  const [terms, setTerms] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Fetch exam terms on load
  useEffect(() => {
    fetchTerms();
  }, []);

  // Fetch subjects when semester changes
  useEffect(() => {
    if (selectedSemester) {
      fetchSubjects(selectedSemester);
    }
  }, [selectedSemester]);

  const fetchTerms = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/terms`);
      setTerms(res.data.terms || []);
      if (res.data.terms.length > 0) {
        setTermId(res.data.terms[0].id); // Default to first term
      }
    } catch (err) {
      console.error('Failed to fetch terms:', err);
    }
  };

  const fetchSubjects = async (semester = null) => {
    try {
      let url = `${API_BASE_URL}/subjects`;
      if (semester) {
        url += `?semester=${semester}`;
      }
      const res = await axios.get(url);
      setSubjects(res.data.subjects || []);
      if (res.data.subjects.length > 0) {
        setSubjectId(res.data.subjects[0].id); // Default to first subject
      } else {
        setSubjectId(''); // Reset if no subjects
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      // Append all files
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('studentName', studentName);
      formData.append('rollNumber', rollNumber);
      formData.append('termId', termId);
      formData.append('subjectId', subjectId);

      const res = await axios.post(`${API_BASE_URL}/evaluate/student-submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={4} maxWidth="900px" mx="auto">
      <Typography variant="h4" gutterBottom>
        Submit Your Answer Sheet
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Upload one or more answer sheet files (images/PDFs) and get instant AI evaluation. You can upload multiple files to extract questions from all of them.
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Select Semester</InputLabel>
              <Select
                value={selectedSemester}
                onChange={e => {
                  setSelectedSemester(e.target.value);
                  setSubjectId(''); // Reset subject when semester changes
                }}
                label="Select Semester"
              >
                <MenuItem value="1">Semester 1</MenuItem>
                <MenuItem value="2">Semester 2</MenuItem>
                <MenuItem value="3">Semester 3</MenuItem>
                <MenuItem value="4">Semester 4</MenuItem>
                <MenuItem value="5">Semester 5</MenuItem>
                <MenuItem value="6">Semester 6</MenuItem>
                <MenuItem value="7">Semester 7</MenuItem>
                <MenuItem value="8">Semester 8</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Select Exam Term</InputLabel>
              <Select
                value={termId}
                onChange={e => setTermId(e.target.value)}
                label="Select Exam Term"
              >
                {terms.map(term => (
                  <MenuItem key={term.id} value={term.id}>
                    {term.term_code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Select Subject</InputLabel>
              <Select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                label="Select Subject"
                disabled={subjects.length === 0 || !selectedSemester}
              >
                {subjects.length === 0 ? (
                  <MenuItem disabled>No subjects available. Please select a semester first.</MenuItem>
                ) : (
                  subjects.map(subject => (
                    <MenuItem key={subject.id} value={subject.id}>
                      {subject.subject_code} - {subject.subject_name} {subject.semester ? `(Sem ${subject.semester})` : ''}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              margin="normal"
              label="Your Name"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="University Roll Number"
              value={rollNumber}
              onChange={e => setRollNumber(e.target.value)}
              required
            />
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ mt: 2, mb: 2 }}
            >
              Select Answer Sheet Files (Images/PDFs) - Multiple files supported
              <input
                type="file"
                hidden
                multiple
                accept="image/*,application/pdf"
                onChange={e => setFiles(Array.from(e.target.files || []))}
              />
            </Button>
            {files.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Selected {files.length} file{files.length > 1 ? 's' : ''}:
                </Typography>
                {files.map((file, index) => (
                  <Typography key={index} variant="body2" color="text.secondary" sx={{ ml: 2, mb: 0.5 }}>
                    • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                ))}
              </Box>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
              disabled={files.length === 0 || loading || !termId || !subjectId || !selectedSemester}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit & Evaluate'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && result.question_wise_results && (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom color="success.main">
              ✅ Evaluation Complete!
            </Typography>
            
            <Box sx={{ bgcolor: '#f8f6f3', color: '#000000', p: 2, borderRadius: 0, mb: 3, border: '1px solid #E5E5E5' }}>
              <Typography variant="body1" gutterBottom>
                <strong>Student:</strong> {result.student_name}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Roll Number:</strong> {result.roll_number}
              </Typography>
              <Typography variant="h4" sx={{ mt: 2 }}>
                📊 Score: {result.summary.total_marks} / {result.summary.total_max_marks}
              </Typography>
              <Typography variant="h6">
                Percentage: {result.summary.percentage}%
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              📝 Question-wise Results:
            </Typography>

            <Paper sx={{ mt: 2, overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Q#</strong></TableCell>
                    <TableCell><strong>Your Answer</strong></TableCell>
                    <TableCell><strong>Correct Answer</strong></TableCell>
                    <TableCell><strong>Marks</strong></TableCell>
                    <TableCell><strong>Evaluation</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(result.question_wise_results).map(([qNum, qData]) => (
                    <TableRow key={qNum}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {qNum}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2">
                          {qData.student_answer ? 
                            (typeof qData.student_answer === 'string' ? 
                              qData.student_answer.substring(0, 100) : 
                              qData.student_answer.answer?.substring(0, 100) || 'No answer') 
                            : 'No answer'}
                          {(qData.student_answer?.length > 100 || qData.student_answer?.answer?.length > 100) && '...'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" color="text.secondary">
                          {qData.correct_answer ? 
                            qData.correct_answer.substring(0, 100) : 
                            'Not found'}
                          {qData.correct_answer?.length > 100 && '...'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography 
                            variant="h6" 
                            color={qData.marks >= qData.max_marks * 0.7 ? 'success.main' : 
                                   qData.marks >= qData.max_marks * 0.4 ? 'warning.main' : 
                                   'error.main'}
                          >
                            {qData.marks}/{qData.max_marks}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 400 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Reason:</strong> {qData.reason}
                        </Typography>
                        {qData.matched_concepts && qData.matched_concepts.length > 0 && (
                          <Typography variant="caption" display="block" color="success.main">
                            ✓ Matched: {qData.matched_concepts.join(', ')}
                          </Typography>
                        )}
                        {qData.missing_concepts && qData.missing_concepts.length > 0 && (
                          <Typography variant="caption" display="block" color="error.main">
                            ✗ Missing: {qData.missing_concepts.join(', ')}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Button
              variant="outlined"
              sx={{ mt: 3 }}
              onClick={() => {
                setResult(null);
                setFiles([]);
                setStudentName('');
                setRollNumber('');
              }}
            >
              Submit Another Answer Sheet
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default StudentSubmit;
