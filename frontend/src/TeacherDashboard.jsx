import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Alert, Card, CardContent, 
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Chip, IconButton,
  Tabs, Tab, FormControl, InputLabel, Select, MenuItem, TextField, Divider,
  useMediaQuery, useTheme
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

function TeacherDashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [conflicts, setConflicts] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  // Student sheet evaluation states
  const [studentSheetFiles, setStudentSheetFiles] = useState([]);
  const [studentName, setStudentName] = useState('');
  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [studentDOB, setStudentDOB] = useState('');
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [studentVerified, setStudentVerified] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Fetch exam terms and students on load
  useEffect(() => {
    fetchTerms();
    fetchAllStudents();
  }, []);

  // Refetch questions when term or subject changes
  useEffect(() => {
    if (selectedTerm && selectedSubject) {
      fetchExistingQuestions();
    }
  }, [selectedTerm, selectedSubject]);

  const fetchTerms = async () => {
    try {
      console.log('Fetching terms...');
      const res = await axios.get(`${API_BASE_URL}/terms`);
      console.log('Terms response:', res.data);
      setTerms(res.data.terms || []);
      if (res.data.terms && res.data.terms.length > 0) {
        setSelectedTerm(res.data.terms[0].id);
        console.log('Selected term:', res.data.terms[0]);
      } else {
        console.log('No terms found');
      }
    } catch (err) {
      console.error('Failed to fetch terms:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
      }
    }
  };

  const fetchSubjects = async (semester = null) => {
    try {
      let url = `${API_BASE_URL}/subjects`;
      if (semester && semester !== 'all') {
        url += `?semester=${semester}`;
      }
      const res = await axios.get(url);
      setSubjects(res.data.subjects || []);
      if (res.data.subjects.length > 0) {
        setSelectedSubject(res.data.subjects[0].id);
      } else {
        setSelectedSubject('');
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  };

  // Fetch subjects when semester changes
  useEffect(() => {
    if (selectedSemester) {
      fetchSubjects(selectedSemester);
    } else {
      fetchSubjects();
    }
  }, [selectedSemester]);

  const fetchExistingQuestions = async () => {
    setLoadingQuestions(true);
    try {
      let url = `${API_BASE_URL}/dashboard/answer-keys?`;
      const params = [];
      if (selectedTerm) params.push(`termId=${selectedTerm}`);
      if (selectedSubject) params.push(`subjectId=${selectedSubject}`);
      url += params.join('&');
      
      const res = await axios.get(url);
      setExistingQuestions(res.data.questions || []);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const fetchAllStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/dashboard/all-submissions`);
      setAllStudents(res.data.students || []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedTerm) {
      setError('Please select an exam term first.');
      return;
    }
    
    setLoading(true);
    setResult(null);
    setError(null);
    setConflicts(null);

    try {
      const formData = new FormData();
      // Append all files
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('termId', selectedTerm);
      formData.append('subjectId', selectedSubject);

      const res = await axios.post(`${API_BASE_URL}/evaluate/teacher-upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.conflicts) {
        setConflicts(res.data);
        setPendingData(res.data.pendingInserts);
      } else {
        setResult(res.data);
        setFiles([]);
        setUploadProgress('');
        fetchExistingQuestions();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setUploadProgress('');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOverwrite = async () => {
    setLoading(true);
    setError(null);

    try {
      await axios.post(`${API_BASE_URL}/evaluate/teacher-confirm-overwrite`, {
        questions: pendingData,
        termId: selectedTerm,
        subjectId: selectedSubject
      });

      setResult({ success: true, overwritten: pendingData.length });
      setConflicts(null);
      setPendingData(null);
      setFiles([]);
      setUploadProgress('');
      fetchExistingQuestions();
    } catch (err) {
      setError(err.response?.data?.error || 'Overwrite failed.');
      setUploadProgress('');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOverwrite = () => {
    setConflicts(null);
    setPendingData(null);
    setFiles([]);
  };

  const handleDeleteQuestion = async (termId, subjectId, questionNumber) => {
    if (!window.confirm(`Are you sure you want to delete Question ${questionNumber}?`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/dashboard/answer-keys/${termId}/${subjectId}/${questionNumber}`);
      setResult({ success: true, message: `Question ${questionNumber} deleted successfully.` });
      fetchExistingQuestions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete question');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStudent = async () => {
    if (!studentName || !studentRollNumber) {
      setError('Please enter student name and roll number first.');
      return;
    }

    setVerifying(true);
    setError(null);
    setStudentVerified(false);

    try {
      const res = await axios.post(`${API_BASE_URL}/students/verify`, {
        rollNumber: studentRollNumber.trim(),
        studentName: studentName.trim()
      });

      setStudentVerified(true);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please check the name and roll number.');
      setStudentVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleEvaluateStudentSheet = async (e) => {
    e.preventDefault();
    if (!selectedTerm) {
      setError('Please select an exam term first.');
      return;
    }
    if (!selectedSubject) {
      setError('Please select a subject first.');
      return;
    }
    if (!studentName || !studentRollNumber) {
      setError('Please enter student name and roll number.');
      return;
    }
    if (!studentVerified) {
      setError('Please verify the student name and roll number first by clicking the "Verify Student" button.');
      return;
    }
    if (!studentSheetFiles || studentSheetFiles.length === 0) {
      setError('Please select at least one student answer sheet file.');
      return;
    }

    setEvaluating(true);
    setError(null);
    setEvaluationResult(null);
    setEvaluationProgress('Uploading answer sheets...');

    try {
      const formData = new FormData();
      // Append all files
      studentSheetFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('studentName', studentName);
      formData.append('rollNumber', studentRollNumber);
      formData.append('termId', selectedTerm);
      formData.append('subjectId', selectedSubject);

      setEvaluationProgress('Extracting questions and answers from sheets...');
      
      const res = await axios.post(`${API_BASE_URL}/evaluate/student-submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setEvaluationProgress(`Uploading files... ${percentCompleted}%`);
          }
        }
      });

      setEvaluationProgress('Evaluating answers...');
      
      // Simulate progress updates during evaluation
      setTimeout(() => setEvaluationProgress('Comparing answers with answer key...'), 500);
      setTimeout(() => setEvaluationProgress('Calculating scores...'), 1000);

      setEvaluationResult(res.data);
      setEvaluationProgress('');
      setStudentSheetFiles([]);
      setStudentName('');
      setStudentRollNumber('');
      setStudentDOB('');
      setStudentVerified(false);
      fetchAllStudents(); // Refresh student list
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to evaluate student sheet. Please try again.');
      setEvaluationProgress('');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <Box 
      sx={{ 
        background: 'var(--surface-light)', 
        minHeight: '100vh',
        width: '100%',
        position: 'relative'
      }}
    >
      <Box
        p={{ xs: 2, sm: 3, md: 4 }} 
        sx={{ 
          width: '100%',
          maxWidth: { xs: '100%', sm: '99.5%', md: '99%', lg: '1600px' },
          mx: 'auto',
          px: { xs: 0.5, sm: 0.75, md: 1, lg: 0.75 }
        }}
      >
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={{ xs: 2, sm: 0 }}
        mb={{ xs: 3, md: 4 }}
      >
        <Typography 
          className="headline-serif"
          variant="h3" 
          sx={{ 
            fontWeight: 500,
            color: 'var(--text-primary)',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
          }}
        >
          Teacher Dashboard
        </Typography>
        <Button 
          className="btn-secondary"
          onClick={handleLogout}
          sx={{ 
            py: 1,
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          Logout
        </Button>
      </Box>

      <Box 
        display="flex" 
        gap={2} 
        mb={{ xs: 3, md: 4 }} 
        flexWrap="wrap"
        flexDirection={{ xs: 'column', sm: 'row' }}
      >
          <FormControl
            sx={{
              minWidth: { xs: '100%', sm: 200 },
              width: { xs: '100%', sm: 'auto' },
              bgcolor: 'var(--surface-light)',
              border: '1px solid var(--border-color)'
            }}
          >
            <InputLabel>Select Semester</InputLabel>
            <Select
              value={selectedSemester}
              onChange={e => {
                setSelectedSemester(e.target.value);
                setSelectedSubject(''); // Reset subject when semester changes
              }}
              label="Select Semester"
              sx={{
                borderRadius: '0px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--border-color)'
                }
              }}
            >
              <MenuItem value="all">All Semesters</MenuItem>
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
        <FormControl 
          sx={{ 
            minWidth: { xs: '100%', sm: 250 },
            width: { xs: '100%', sm: 'auto' },
            bgcolor: 'var(--surface-light)', 
            border: '1px solid var(--border-color)' 
          }}
        >
          <InputLabel>Select Exam Term</InputLabel>
          <Select
            value={selectedTerm}
            onChange={e => setSelectedTerm(e.target.value)}
            label="Select Exam Term"
            sx={{
              borderRadius: '0px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--border-color)'
              }
            }}
          >
            {terms.map(term => (
              <MenuItem key={term.id} value={term.id}>
                {term.term_code}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl 
          sx={{ 
            minWidth: { xs: '100%', sm: 300 },
            width: { xs: '100%', sm: 'auto' },
            bgcolor: 'var(--surface-light)', 
            border: '1px solid var(--border-color)' 
          }}
        >
          <InputLabel>Select Subject</InputLabel>
          <Select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            label="Select Subject"
            disabled={subjects.length === 0}
            sx={{
              borderRadius: '0px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--border-color)'
              }
            }}
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
      </Box>

      <Box sx={{ 
        overflowX: 'auto',
        mb: 4,
        borderBottom: '1px solid var(--border-color)',
        '&::-webkit-scrollbar': {
          height: '4px'
        }
      }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, v) => setActiveTab(v)} 
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          sx={{ 
            minWidth: { xs: '100%', sm: 'auto' },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
              minWidth: { xs: 100, sm: 120 },
              px: { xs: 1, sm: 2 }
            }
          }}
        >
          <Tab label="All Students" />
          <Tab label="Manage Students" />
          <Tab label="Answer Key" />
          <Tab label="Evaluate Sheet" />
        </Tabs>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            borderRadius: '0px'
          }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      {result && result.success && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 2,
            borderRadius: '0px'
          }} 
          onClose={() => setResult(null)}
        >
          {result.message || `Successfully ${result.overwritten ? `overwritten ${result.overwritten}` : `inserted ${result.inserted}`} question(s)!`}
        </Alert>
      )}

      {/* Tab 0: All Students */}
      {activeTab === 0 && (
        <Card sx={{ mb: 4, background: 'var(--surface-light)', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
          <CardContent>
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              flexDirection={{ xs: 'column', sm: 'row' }}
              gap={{ xs: 2, sm: 0 }}
              mb={3}
            >
              <Typography 
                className="headline-serif"
                variant="h5" 
                sx={{ 
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' }
                }}
              >
                All Students Performance ({allStudents.length} students)
              </Typography>
              <IconButton 
                onClick={fetchAllStudents} 
                disabled={loadingStudents}
                sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
              >
                {loadingStudents ? <CircularProgress size={24} /> : <RefreshIcon />}
              </IconButton>
            </Box>

            {loadingStudents && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}
            {!loadingStudents && allStudents.length === 0 && (
              <Typography variant="body1" color="text.secondary">
                No student submissions yet.
              </Typography>
            )}
            {!loadingStudents && allStudents.length > 0 && (
              <Box>
                {allStudents.map((student) => (
                    <Card key={student.roll_number} sx={{ 
                      mb: 3, 
                      background: 'var(--surface-light)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '0px',
                      width: '100%'
                    }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box 
                        display="flex" 
                        justifyContent="space-between" 
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        flexDirection={{ xs: 'column', sm: 'row' }}
                        gap={{ xs: 1.5, sm: 0 }}
                        mb={2}
                      >
                        <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                          <Typography 
                            className="headline-serif"
                            variant="h6" 
                            sx={{ 
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                              fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' },
                              wordBreak: 'break-word'
                            }}
                          >
                            {student.student_name}
                          </Typography>
                          <Typography 
                            className="meta-mono"
                            variant="body2" 
                            sx={{ 
                              color: 'var(--text-subtle)', 
                              mt: 0.5, 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' } 
                            }}
                          >
                            {student.roll_number}
                          </Typography>
                        </Box>
                        <Chip 
                          label={`Overall: ${student.average.toFixed(1)}%`} 
                          color={student.average >= 60 ? 'success' : student.average >= 40 ? 'warning' : 'error'}
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: { xs: '0.7rem', sm: '0.875rem' },
                            alignSelf: { xs: 'flex-start', sm: 'auto' }
                          }}
                        />
                      </Box>
                      {student.terms && student.terms.length > 0 ? (
                        student.terms.map((term) => (
                          <Box key={term.term_code} sx={{ mb: 3, p: 2, bgcolor: 'var(--surface-light)', border: '1px solid var(--border-color)' }}>
                            <Typography 
                              className="meta-mono"
                              variant="subtitle1" 
                              sx={{ 
                                fontWeight: 500, 
                                mb: 1, 
                                color: 'var(--text-primary)'
                              }}
                            >
                              {term.term_code}
                            </Typography>
                            {term.subjects && Object.keys(term.subjects).length > 0 ? (
                              <Paper sx={{ 
                                overflowX: 'auto', 
                                mt: 1, 
                                borderRadius: '0px', 
                                border: '1px solid var(--border-color)',
                                width: '100%'
                              }}>
                                <Box sx={{ minWidth: { xs: '500px', sm: 'auto' } }}>
                                  <Table size={isMobile ? 'small' : 'medium'}>
                                    <TableHead sx={{ bgcolor: 'var(--surface-light)' }}>
                                      <TableRow>
                                        <TableCell className="meta-mono" sx={{ 
                                          fontWeight: 500, 
                                          color: 'var(--text-subtle)', 
                                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                                          minWidth: { xs: '150px', sm: 'auto' }
                                        }}>Subject</TableCell>
                                        <TableCell align="center" className="meta-mono" sx={{ 
                                          fontWeight: 500, 
                                          color: 'var(--text-subtle)', 
                                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' }
                                        }}>Marks</TableCell>
                                        <TableCell align="center" className="meta-mono" sx={{ 
                                          fontWeight: 500, 
                                          color: 'var(--text-subtle)', 
                                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                                          display: { xs: 'none', sm: 'table-cell' }
                                        }}>Max</TableCell>
                                        <TableCell align="center" className="meta-mono" sx={{ 
                                          fontWeight: 500, 
                                          color: 'var(--text-subtle)', 
                                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' }
                                        }}>%</TableCell>
                                        <TableCell align="center" className="meta-mono" sx={{ 
                                          fontWeight: 500, 
                                          color: 'var(--text-subtle)', 
                                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' }
                                        }}>Status</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {Object.values(term.subjects).map((subject) => (
                                        <TableRow key={subject.subject_code} hover>
                                          <TableCell sx={{ py: { xs: 1, sm: 1.5 } }}>
                                            <Chip 
                                              label={subject.subject_code} 
                                              size="small" 
                                              color="secondary" 
                                              sx={{ 
                                                mr: { xs: 0.5, sm: 1 },
                                                fontSize: { xs: '0.65rem', sm: '0.75rem' }
                                              }} 
                                            />
                                            <Typography 
                                              variant="body2" 
                                              component="span"
                                              sx={{ 
                                                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                                                display: { xs: 'block', sm: 'inline' },
                                                mt: { xs: 0.5, sm: 0 }
                                              }}
                                            >
                                              {isMobile ? subject.subject_name.substring(0, 25) + '...' : subject.subject_name}
                                            </Typography>
                                          </TableCell>
                                          <TableCell align="center" sx={{ 
                                            py: { xs: 1, sm: 1.5 },
                                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                          }}>
                                            {subject.marks.toFixed(1)}{isMobile ? '' : `/${subject.maxMarks}`}
                                          </TableCell>
                                          <TableCell align="center" sx={{ 
                                            py: { xs: 1, sm: 1.5 },
                                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                            display: { xs: 'none', sm: 'table-cell' }
                                          }}>
                                            {subject.maxMarks}
                                          </TableCell>
                                          <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 } }}>
                                            <Chip
                                              label={`${subject.percentage.toFixed(1)}%`}
                                              size="small"
                                              color={subject.percentage >= 60 ? 'success' : subject.percentage >= 40 ? 'warning' : 'error'}
                                              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                                            />
                                          </TableCell>
                                          <TableCell align="center" sx={{ 
                                            py: { xs: 1, sm: 1.5 },
                                            fontSize: { xs: '0.7rem', sm: '0.875rem' }
                                          }}>
                                            {subject.percentage >= 60 ? '✅ Pass' : '❌ Fail'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Paper>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                No submissions for this term
                              </Typography>
                            )}
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No submissions yet
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 1: Manage Students */}
      {activeTab === 1 && (
        <Box>
          <Card sx={{ 
            mb: 4, 
            background: 'var(--surface-light)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '0px',
            width: '100%'
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography 
                className="headline-serif"
                variant="h5" 
                gutterBottom 
                sx={{ 
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  mb: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' }
                }}
              >
                Add/Update Student
              </Typography>
              <Typography 
                className="body-text"
                sx={{ 
                  color: 'var(--text-subtle)', 
                  mb: { xs: 2, sm: 3 },
                  fontSize: { xs: '0.85rem', sm: '0.9rem' }
                }}
              >
                Add students to the database with their name, roll number, and date of birth. Students must be added before their answer sheets can be evaluated.
              </Typography>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!studentName || !studentRollNumber || !studentDOB) {
                  setError('Please fill in all fields');
                  return;
                }
                setLoading(true);
                try {
                  await axios.post(`${API_BASE_URL}/students`, {
                    rollNumber: studentRollNumber.trim(),
                    studentName: studentName.trim(),
                    dateOfBirth: studentDOB
                  });
                  setResult({ success: true, message: 'Student added/updated successfully!' });
                  setStudentName('');
                  setStudentRollNumber('');
                  setStudentDOB('');
                  fetchAllStudents();
                } catch (err) {
                  setError(err.response?.data?.error || 'Failed to add student');
                } finally {
                  setLoading(false);
                }
              }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Student Name"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  required
                  placeholder="e.g., John Doe"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0px',
                      '& fieldset': {
                        borderColor: 'var(--border-color)'
                      }
                    }
                  }}
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="University Roll Number"
                  value={studentRollNumber}
                  onChange={e => setStudentRollNumber(e.target.value)}
                  required
                  placeholder="e.g., 12345"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0px',
                      '& fieldset': {
                        borderColor: 'var(--border-color)'
                      }
                    }
                  }}
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="Date of Birth"
                  type="date"
                  value={studentDOB}
                  onChange={e => setStudentDOB(e.target.value)}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0px',
                      '& fieldset': {
                        borderColor: 'var(--border-color)'
                      }
                    }
                  }}
                />
                <Button
                  className="btn-primary"
                  type="submit"
                  fullWidth
                  sx={{ mt: 2 }}
                  disabled={loading || !studentName || !studentRollNumber || !studentDOB}
                >
                  {loading ? <CircularProgress size={24} /> : 'Add/Update Student'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 2: Answer Key (Merged: Existing Questions + Upload) */}
      {activeTab === 2 && (
        <Box>
          {/* Existing Questions Section */}
          <Card sx={{ mb: 4, background: 'var(--surface-light)', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
            <CardContent>
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                flexDirection={{ xs: 'column', sm: 'row' }}
                gap={{ xs: 2, sm: 0 }}
                mb={3}
              >
                <Typography 
                  className="headline-serif"
                  variant="h5" 
                  sx={{ 
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' }
                  }}
                >
                  Existing Answer Keys ({existingQuestions.length} questions)
                </Typography>
                <IconButton 
                  onClick={fetchExistingQuestions} 
                  disabled={loadingStudents}
                  sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
                >
                  {loadingQuestions ? <CircularProgress size={24} /> : <RefreshIcon />}
                </IconButton>
              </Box>

              {loadingQuestions && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}
              {!loadingQuestions && existingQuestions.length === 0 && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  No answer keys uploaded for this term and subject yet. Upload one below.
                </Typography>
              )}
              {!loadingQuestions && existingQuestions.length > 0 && (
                <Paper sx={{ overflowX: 'auto', borderRadius: '0px', border: '1px solid var(--border-color)' }}>
                  <Table size={isMobile ? 'small' : 'medium'}>
                    <TableHead sx={{ bgcolor: 'var(--surface-light)' }}>
                      <TableRow>
                        <TableCell className="meta-mono" sx={{ fontWeight: 500, color: 'var(--text-subtle)', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Q#</TableCell>
                        <TableCell className="meta-mono" sx={{ fontWeight: 500, color: 'var(--text-subtle)', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Term</TableCell>
                        <TableCell className="meta-mono" sx={{ fontWeight: 500, color: 'var(--text-subtle)', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Subject</TableCell>
                        <TableCell className="meta-mono" sx={{ fontWeight: 500, color: 'var(--text-subtle)', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Question</TableCell>
                        <TableCell className="meta-mono" sx={{ fontWeight: 500, color: 'var(--text-subtle)', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Answer Preview</TableCell>
                        <TableCell className="meta-mono" sx={{ fontWeight: 500, color: 'var(--text-subtle)', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Max Marks</TableCell>
                        <TableCell className="meta-mono" sx={{ fontWeight: 500, color: 'var(--text-subtle)', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {existingQuestions.map((q) => (
                        <TableRow key={`${q.term_id}-${q.subject_id}-${q.question_number}`} hover>
                          <TableCell><Chip label={q.question_number} size="small" color="primary" /></TableCell>
                          <TableCell><Chip label={q.term_code} size="small" /></TableCell>
                          <TableCell><Chip label={q.subject_code} size="small" color="secondary" /></TableCell>
                          <TableCell>{q.question_text || 'N/A'}</TableCell>
                          <TableCell>{q.answer_text.substring(0, 50)}...</TableCell>
                          <TableCell>{q.max_marks}</TableCell>
                          <TableCell>
                            <IconButton 
                              color="error" 
                              size="small" 
                              onClick={() => handleDeleteQuestion(q.term_id, q.subject_id, q.question_number)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </CardContent>
          </Card>

          {/* Upload Answer Key Section */}
          <Card sx={{ mb: 4, background: 'var(--surface-light)', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
            <CardContent>
              <Typography 
                className="headline-serif"
                variant="h5" 
                gutterBottom 
                sx={{ 
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  mb: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' }
                }}
              >
                Upload New Answer Key
              </Typography>
              <Typography 
                className="body-text"
                sx={{ 
                  color: 'var(--text-subtle)', 
                  mb: { xs: 2, sm: 3 },
                  fontSize: { xs: '0.85rem', sm: '0.9rem' }
                }}
              >
                Upload one or more images/PDFs containing questions and their correct answers for the selected term and subject. You can upload multiple files to extract questions from all of them.
              </Typography>

              <form onSubmit={handleUpload}>
                <Button
                  className="btn-secondary"
                  component="label"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Select Answer Key Files (Images/PDFs) - Multiple files supported
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
                    <Typography 
                      className="meta-mono"
                      sx={{ 
                        color: 'var(--text-subtle)', 
                        mb: 1,
                        fontSize: '0.75rem'
                      }}
                    >
                      Selected {files.length} file{files.length > 1 ? 's' : ''}:
                    </Typography>
                    {files.map((file, index) => (
                      <Typography 
                        key={index}
                        className="meta-mono"
                        sx={{ 
                          color: 'var(--text-subtle)', 
                          fontSize: '0.75rem',
                          ml: 2,
                          mb: 0.5
                        }}
                      >
                        • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </Typography>
                    ))}
                  </Box>
                )}
                <Button
                  className="btn-primary"
                  type="submit"
                  fullWidth
                  disabled={files.length === 0 || loading || !selectedTerm || !selectedSubject}
                  sx={{ position: 'relative' }}
                >
                  {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={24} sx={{ color: 'var(--text-inverted)' }} />
                      <Typography sx={{ fontSize: '0.875rem' }}>
                        {uploadProgress || 'Processing...'}
                      </Typography>
                    </Box>
                  ) : (
                    `Upload Answer Key${files.length > 0 ? ` (${files.length} file${files.length > 1 ? 's' : ''})` : ''}`
                  )}
                </Button>
                {loading && uploadProgress && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mt: 1, 
                      textAlign: 'center',
                      color: 'var(--text-subtle)',
                      fontSize: '0.75rem'
                    }}
                  >
                    {uploadProgress}
                  </Typography>
                )}
              </form>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 3: Evaluate Student Sheet */}
      {activeTab === 3 && (
        <Box>
          <Card sx={{ mb: 4, background: 'var(--surface-light)', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
            <CardContent>
              <Typography 
                className="headline-serif"
                variant="h5" 
                gutterBottom 
                sx={{ 
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  mb: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' }
                }}
              >
                Evaluate Student Answer Sheet
              </Typography>
              <Typography 
                className="body-text"
                sx={{ 
                  color: 'var(--text-subtle)', 
                  mb: { xs: 2, sm: 3 },
                  fontSize: { xs: '0.85rem', sm: '0.9rem' }
                }}
              >
                Upload one or more student answer sheet files (images/PDFs) to evaluate using AI. The system will extract answers from all files, compare with the answer key, and store the results.
              </Typography>

              <form onSubmit={handleEvaluateStudentSheet}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Student Name"
                  value={studentName}
                  onChange={e => {
                    setStudentName(e.target.value);
                    setStudentVerified(false); // Reset verification when name changes
                  }}
                  required
                  placeholder="e.g., John Doe"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0px',
                      '& fieldset': {
                        borderColor: 'var(--border-color)'
                      }
                    }
                  }}
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="University Roll Number"
                  value={studentRollNumber}
                  onChange={e => {
                    setStudentRollNumber(e.target.value);
                    setStudentVerified(false); // Reset verification when roll number changes
                  }}
                  required
                  placeholder="e.g., 12345"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0px',
                      '& fieldset': {
                        borderColor: 'var(--border-color)'
                      }
                    }
                  }}
                />
                <Box 
                  display="flex" 
                  gap={2} 
                  alignItems="center" 
                  flexDirection={{ xs: 'column', sm: 'row' }}
                  sx={{ mt: 2, mb: 2 }}
                >
                  <Button
                    className="btn-secondary"
                    onClick={handleVerifyStudent}
                    disabled={!studentName || !studentRollNumber || verifying}
                    fullWidth={{ xs: true, sm: false }}
                    sx={{ 
                      flex: { xs: 'none', sm: 1 },
                      width: { xs: '100%', sm: 'auto' }
                    }}
                  >
                    {verifying ? <CircularProgress size={24} /> : 'Verify Student'}
                  </Button>
                  {studentVerified && (
                    <Chip 
                      label="✓ Verified" 
                      color="success" 
                      sx={{ 
                        fontWeight: 'bold',
                        width: { xs: '100%', sm: 'auto' },
                        justifyContent: { xs: 'center', sm: 'flex-start' }
                      }}
                    />
                  )}
                </Box>
                {studentVerified && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: '0px' }}>
                    Student verified successfully. You can now proceed with evaluation.
                  </Alert>
                )}
                <Button
                  className="btn-secondary"
                  component="label"
                  fullWidth
                  sx={{ 
                    mt: 2, 
                    mb: 2,
                    py: { xs: 1.5, sm: 1.5 },
                    fontSize: { xs: '0.85rem', sm: '0.875rem' }
                  }}
                >
                  <Typography sx={{ 
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    textAlign: 'center',
                    width: '100%'
                  }}>
                    {isMobile ? 'Select Answer Sheet Files' : 'Select Student Answer Sheet Files (Images/PDFs) - Multiple files supported'}
                  </Typography>
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*,application/pdf"
                    onChange={e => setStudentSheetFiles(Array.from(e.target.files || []))}
                  />
                </Button>
                {studentSheetFiles.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      className="meta-mono"
                      sx={{ 
                        color: 'var(--text-subtle)', 
                        mb: 1,
                        fontSize: '0.75rem'
                      }}
                    >
                      Selected {studentSheetFiles.length} file{studentSheetFiles.length > 1 ? 's' : ''}:
                    </Typography>
                    {studentSheetFiles.map((file, index) => (
                      <Typography 
                        key={index}
                        className="meta-mono"
                        sx={{ 
                          color: 'var(--text-subtle)', 
                          fontSize: '0.75rem',
                          ml: 2,
                          mb: 0.5
                        }}
                      >
                        • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </Typography>
                    ))}
                  </Box>
                )}
                <Button
                  className="btn-primary"
                  type="submit"
                  fullWidth
                  sx={{ mt: 2 }}
                  disabled={studentSheetFiles.length === 0 || !studentName || !studentRollNumber || !selectedTerm || !selectedSubject || !studentVerified || evaluating}
                >
                  {evaluating ? <CircularProgress size={24} /> : 'Evaluate Student Sheet'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Evaluation Results */}
          {evaluationResult && (
            <Card sx={{ mb: 4, background: 'var(--surface-light)', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
              <CardContent>
                <Typography 
                  className="headline-serif"
                  variant="h5" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    mb: 2
                  }}
                >
                  Evaluation Complete!
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1">
                    <strong>Student:</strong> {evaluationResult.student_name}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Roll Number:</strong> {evaluationResult.roll_number}
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    📊 Summary
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Chip
                      label={`Total: ${evaluationResult.summary.total_marks.toFixed(1)}/${evaluationResult.summary.total_max_marks}`}
                      color="primary"
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Chip
                      label={`Percentage: ${evaluationResult.summary.percentage.toFixed(1)}%`}
                      color={evaluationResult.summary.percentage >= 60 ? 'success' : evaluationResult.summary.percentage >= 40 ? 'warning' : 'error'}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  📝 Question-wise Results
                </Typography>
                <Paper sx={{ p: 2, bgcolor: '#f8f6f3', maxHeight: 400, overflowY: 'auto' }}>
                  {Object.keys(evaluationResult.question_wise_results).map((qNum) => {
                    const qData = evaluationResult.question_wise_results[qNum];
                    return (
                      <Box key={qNum} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {qNum}
                          </Typography>
                          <Chip
                            label={`${qData.marks}/${qData.max_marks} marks`}
                            color={qData.marks >= qData.max_marks * 0.6 ? 'success' : 'error'}
                            size="small"
                          />
                        </Box>
                        {qData.reason && (
                          <Typography variant="body2" color="text.secondary">
                            {qData.reason}
                          </Typography>
                        )}
                        {qData.matched_concepts && qData.matched_concepts.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                              ✅ Matched: {qData.matched_concepts.join(', ')}
                            </Typography>
                          </Box>
                        )}
                        {qData.missing_concepts && qData.missing_concepts.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                              ❌ Missing: {qData.missing_concepts.join(', ')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Paper>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => {
                    setEvaluationResult(null);
                    setStudentSheetFiles([]);
                    setStudentName('');
                    setStudentRollNumber('');
                  }}
                >
                  Evaluate Another Sheet
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Conflict Dialog */}
      <Dialog 
        open={!!conflicts} 
        onClose={handleCancelOverwrite}
        PaperProps={{
          sx: {
            borderRadius: '0px',
            border: '1px solid var(--border-color)'
          }
        }}
      >
        <DialogTitle 
          className="headline-serif"
          sx={{ 
            fontWeight: 500,
            color: 'var(--text-primary)'
          }}
        >
          Question Conflicts Detected
        </DialogTitle>
        <DialogContent>
          <Typography>
            The following question numbers already exist in the database for this term:
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold' }}>
            {conflicts?.conflictQuestions?.join(', ')}
          </Typography>
          <Typography sx={{ mt: 2 }}>
            Do you want to overwrite these answers with the new uploaded data?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            className="btn-secondary"
            onClick={handleCancelOverwrite}
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button 
            className="btn-primary"
            onClick={handleConfirmOverwrite}
          >
            Yes, Overwrite
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}

export default TeacherDashboard;
