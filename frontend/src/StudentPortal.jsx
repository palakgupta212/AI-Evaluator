import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Alert, Card, CardContent,
  CircularProgress, Table, TableBody, TableCell, TableHead, TableRow,
  Paper, Chip, Divider, FormControl, InputLabel, Select, MenuItem,
  useMediaQuery, useTheme, Tabs, Tab
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

function StudentPortal() {
  const [step, setStep] = useState('dob'); // 'dob', 'password-setup', 'login', 'dashboard'
  const [rollNumber, setRollNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [terms, setTerms] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  // Filters for detailed question-wise evaluation
  const [detailSemester, setDetailSemester] = useState('');
  const [detailTermId, setDetailTermId] = useState('');
  const [detailSubjectId, setDetailSubjectId] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('studentToken');
    const studentData = localStorage.getItem('studentData');
    if (token && studentData) {
      try {
        const parsed = JSON.parse(studentData);
        setStudentInfo(parsed);
        setStep('dashboard');
        fetchStudentData(parsed.roll_number);
      } catch (e) {
        localStorage.removeItem('studentToken');
        localStorage.removeItem('studentData');
      }
    }
  }, []);

  // Fetch terms on component mount
  useEffect(() => {
    if (step === 'dashboard') {
      fetchTerms();
    }
  }, [step]);

  const fetchTerms = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/terms`);
      setTerms(res.data.terms || []);
    } catch (err) {
      console.error('Failed to fetch terms:', err);
    }
  };

  const handleDOBVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/student-auth/verify-dob`, {
        rollNumber: rollNumber.trim(),
        dateOfBirth: dateOfBirth
      });

      setStudentInfo(res.data);
      
      if (res.data.requires_password_setup) {
        setStep('password-setup');
      } else {
        setStep('login');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid roll number or date of birth');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/student-auth/create-password`, {
        rollNumber: rollNumber.trim(),
        dateOfBirth: dateOfBirth,
        password: password
      });

      setStep('login');
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/student-auth/login`, {
        rollNumber: rollNumber.trim(),
        dateOfBirth: dateOfBirth,
        password: password
      });

      localStorage.setItem('studentToken', res.data.token);
      localStorage.setItem('studentData', JSON.stringify({
        roll_number: res.data.roll_number,
        student_name: res.data.student_name
      }));

      setStudentInfo({
        roll_number: res.data.roll_number,
        student_name: res.data.student_name
      });
      setStep('dashboard');
      await fetchStudentData(res.data.roll_number);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async (rollNum) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/student/results/${rollNum}`);
      setStudentData(res.data);

      const chartRes = await axios.get(`${API_BASE_URL}/student/analytics/${rollNum}`);
      setChartData(chartRes.data?.chart_data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch student data');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentData');
    setStep('dob');
    setStudentData(null);
    setStudentInfo(null);
    setRollNumber('');
    setDateOfBirth('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleBack = () => {
    navigate('/');
  };

  // Filter data by semester
  const getFilteredData = () => {
    if (!studentData || !studentData.term_results) return [];
    
    if (selectedSemester === 'all') {
      return studentData.term_results;
    }
    
    return studentData.term_results.filter(r => r.semester === parseInt(selectedSemester));
  };

  // Get chart data filtered by semester
  const getFilteredChartData = () => {
    if (selectedSemester === 'all') {
      return chartData;
    }
    return chartData.filter(d => d.semester === parseInt(selectedSemester));
  };

  // DOB Verification Step
  if (step === 'dob') {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{ 
          background: 'var(--surface-light)',
          p: 3
        }}
      >
        <Card sx={{ 
          width: { xs: '100%', sm: 450 },
          background: 'var(--surface-light)',
          border: '1px solid var(--border-color)',
          borderRadius: '0px'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography 
              className="headline-serif"
              variant="h4" 
              gutterBottom 
              textAlign="center"
              sx={{ 
                mb: 4,
                color: 'var(--text-primary)',
                fontWeight: 500
              }}
            >
              Verify Your Identity
            </Typography>
            <Typography 
              className="body-text"
              sx={{ 
                color: 'var(--text-subtle)', 
                mb: { xs: 2, sm: 3 },
                fontSize: { xs: '0.85rem', sm: '0.9rem' }
              }}
            >
              Enter your university roll number and date of birth to access your results.
            </Typography>

            <form onSubmit={handleDOBVerification}>
              <TextField
                fullWidth
                margin="normal"
                label="University Roll Number"
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
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
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
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
              {error && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: '0px' }}>
                  {error}
                </Alert>
              )}
              <Button
                className="btn-primary"
                type="submit"
                fullWidth
                sx={{ mt: 3, py: 1.5 }}
                disabled={loading || !rollNumber || !dateOfBirth}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify & Continue'}
              </Button>
              <Button 
                className="btn-secondary"
                fullWidth 
                sx={{ mt: 2, py: 1.5 }}
                onClick={handleBack}
              >
                Back to Home
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Password Setup Step
  if (step === 'password-setup') {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{
          background: 'var(--surface-light)',
          p: 3
        }}
      >
        <Card sx={{
          width: { xs: '100%', sm: 450 },
          background: 'var(--surface-light)',
          border: '1px solid var(--border-color)',
          borderRadius: '0px'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography
              className="headline-serif"
              variant="h4"
              gutterBottom
              textAlign="center"
              sx={{
                mb: 4,
                color: 'var(--text-primary)',
                fontWeight: 500
              }}
            >
              Create Password
            </Typography>
            <Typography
              className="headline-serif"
              variant="h5"
              sx={{
                color: 'var(--text-primary)',
                fontWeight: 500,
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem', lg: '2rem' },
                mb: 1
              }}
            >
              {studentInfo?.student_name || 'Student'}
            </Typography>
            <Typography
              className="meta-mono"
              sx={{
                color: 'var(--text-subtle)',
                fontSize: { xs: '0.85rem', sm: '0.9rem' }
              }}
            >
              {studentInfo?.roll_number || 'Roll Number'}
            </Typography>
            <Typography
              className="meta-mono"
              sx={{
                color: 'var(--text-subtle)',
                mt: 2,
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            >
              Please create a password to access your results
            </Typography>

            <form onSubmit={handlePasswordSetup}>
              <TextField
                fullWidth
                margin="normal"
                label="New Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                helperText="Password must be at least 6 characters long"
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
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '0px',
                    '& fieldset': {
                      borderColor: 'var(--border-color)'
                    }
                  }
                }}
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: '0px' }}>
                  {error}
                </Alert>
              )}
              <Button
                className="btn-primary"
                type="submit"
                fullWidth
                sx={{ mt: 3, py: 1.5 }}
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Password'}
              </Button>
              <Button 
                className="btn-secondary"
                fullWidth 
                sx={{ mt: 2, py: 1.5 }}
                onClick={() => setStep('dob')}
              >
                Back
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Login Step
  if (step === 'login') {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{ 
          background: 'var(--surface-light)',
          p: 3
        }}
      >
        <Card sx={{ 
          width: { xs: '100%', sm: 450 },
          background: 'var(--surface-light)',
          border: '1px solid var(--border-color)',
          borderRadius: '0px'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography 
              className="headline-serif"
              variant="h4" 
              gutterBottom 
              textAlign="center"
              sx={{ 
                mb: 4,
                color: 'var(--text-primary)',
                fontWeight: 500
              }}
            >
              Student Login
            </Typography>

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                margin="normal"
                label="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '0px',
                    '& fieldset': {
                      borderColor: 'var(--border-color)'
                    }
                  }
                }}
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: '0px' }}>
                  {error}
                </Alert>
              )}
              <Button
                className="btn-primary"
                type="submit"
                fullWidth
                sx={{ mt: 3, py: 1.5 }}
                disabled={loading || !password}
              >
                {loading ? <CircularProgress size={24} /> : 'Login'}
              </Button>
              <Button 
                className="btn-secondary"
                fullWidth 
                sx={{ mt: 2, py: 1.5 }}
                onClick={() => setStep('dob')}
              >
                Back
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Dashboard Step - Show results
  const filteredResults = getFilteredData();
  const filteredChartData = getFilteredChartData();

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
          Student Results Portal
        </Typography>
        <Box 
          display="flex" 
          gap={{ xs: 1, sm: 2 }} 
          flexDirection={{ xs: 'column', sm: 'row' }}
          width={{ xs: '100%', sm: 'auto' }}
        >
          <Button 
            className="btn-secondary"
            onClick={handleLogout}
            fullWidth={{ xs: true, sm: false }}
            sx={{ 
              width: { xs: '100%', sm: 'auto' },
              py: { xs: 1, sm: 1.5 }
            }}
          >
            Logout
          </Button>
          <Button 
            className="btn-secondary"
            onClick={handleBack}
            fullWidth={{ xs: true, sm: false }}
            sx={{ 
              width: { xs: '100%', sm: 'auto' },
              py: { xs: 1, sm: 1.5 }
            }}
          >
            Back to Home
          </Button>
        </Box>
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

      {/* Results Display */}
      {studentData && (
        <>
          {/* Summary Card */}
          <Card sx={{ mb: 4, background: 'var(--surface-light)', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
            <CardContent>
              <Typography 
                className="headline-serif"
                variant="h4" 
                sx={{ 
                  color: 'var(--text-primary)', 
                  fontWeight: 500, 
                  mb: 1 
                }}
              >
                {studentData.student_name}
              </Typography>
              <Typography 
                className="meta-mono"
                sx={{ 
                  color: 'var(--text-subtle)', 
                  mb: 3 
                }}
              >
                {studentData.roll_number}
              </Typography>
              <Divider sx={{ bgcolor: 'var(--border-color)', mb: 3 }} />
              <Box 
                display="grid"
                gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
                gap={{ xs: 2, sm: 3, md: 4 }}
                sx={{ width: '100%' }}
              >
                <Box textAlign="center" sx={{
                  p: { xs: 2, sm: 1 },
                  border: { xs: '1px solid var(--border-color)', sm: 'none' },
                  borderRadius: { xs: 1, sm: 0 }
                }}>
                  <Typography
                    className="headline-serif"
                    variant="h2"
                    sx={{
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem', lg: '3rem' }
                    }}
                  >
                    {studentData?.overall?.gpa ? parseFloat(studentData.overall.gpa).toFixed(2) : 'N/A'}
                  </Typography>
                  <Typography
                    className="meta-mono"
                    sx={{
                      color: 'var(--text-subtle)',
                      mt: 1,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                    }}
                  >
                    Overall GPA
                  </Typography>
                </Box>
                <Box textAlign="center" sx={{ 
                  p: { xs: 2, sm: 1 },
                  border: { xs: '1px solid var(--border-color)', sm: 'none' },
                  borderRadius: { xs: 1, sm: 0 }
                }}>
                  <Typography 
                    className="headline-serif"
                    variant="h2" 
                    sx={{ 
                      color: 'var(--text-primary)', 
                      fontWeight: 500,
                      fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem', lg: '3rem' }
                    }}
                  >
                    {studentData.semester_wise?.semester_5?.sgpa || 'N/A'}
                  </Typography>
                  <Typography 
                    className="meta-mono"
                    sx={{ 
                      color: 'var(--text-subtle)',
                      mt: 1,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                    }}
                  >
                    Semester 5 SGPA
                  </Typography>
                </Box>
                <Box textAlign="center" sx={{ 
                  p: { xs: 2, sm: 1 },
                  border: { xs: '1px solid var(--border-color)', sm: 'none' },
                  borderRadius: { xs: 1, sm: 0 }
                }}>
                  <Typography 
                    className="headline-serif"
                    variant="h2" 
                    sx={{ 
                      color: 'var(--text-primary)', 
                      fontWeight: 500,
                      fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem', lg: '3rem' }
                    }}
                  >
                    {studentData.semester_wise?.semester_6?.sgpa || 'N/A'}
                  </Typography>
                  <Typography 
                    className="meta-mono"
                    sx={{ 
                      color: 'var(--text-subtle)',
                      mt: 1,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                    }}
                  >
                    Semester 6 SGPA
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Semester Filter */}
          <Card sx={{ mb: 4, background: 'var(--surface-light)', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
            <CardContent>
              <FormControl 
                sx={{ 
                  minWidth: { xs: '100%', sm: 250 },
                  width: { xs: '100%', sm: 'auto' },
                  border: '1px solid var(--border-color)'
                }}
              >
                <InputLabel>Filter by Semester</InputLabel>
                <Select
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(e.target.value)}
                  label="Filter by Semester"
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
            </CardContent>
          </Card>

          {/* Subject & Term-wise Results Table */}
          <Card sx={{ mb: 4, background: 'var(--surface-light)', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
            <CardContent>
              <Typography 
                className="headline-serif"
                variant="h5" 
                gutterBottom 
                sx={{ 
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  mb: 3
                }}
              >
                Subject & Term-wise Performance {selectedSemester !== 'all' && `(Semester ${selectedSemester})`}
              </Typography>
              <Paper sx={{ 
                overflowX: 'auto', 
                borderRadius: '0px', 
                border: '1px solid var(--border-color)',
                width: '100%',
                maxWidth: '100%'
              }}>
                <Box sx={{ minWidth: { xs: '600px', sm: 'auto' }, width: '100%' }}>
                  <Table size={isMobile ? 'small' : 'medium'} sx={{ width: '100%' }}>
                    <TableHead sx={{ bgcolor: 'var(--surface-light)' }}>
                      <TableRow>
                        <TableCell className="meta-mono" sx={{ 
                          fontWeight: 500, 
                          color: 'var(--text-subtle)', 
                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                          minWidth: { xs: '120px', sm: 'auto' }
                        }}>Subject</TableCell>
                        <TableCell className="meta-mono" sx={{ 
                          fontWeight: 500, 
                          color: 'var(--text-subtle)', 
                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                          display: { xs: 'none', sm: 'table-cell' }
                        }}>Term</TableCell>
                        <TableCell className="meta-mono" sx={{ 
                          fontWeight: 500, 
                          color: 'var(--text-subtle)', 
                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' }
                        }}>Sem</TableCell>
                        <TableCell align="center" className="meta-mono" sx={{ 
                          fontWeight: 500, 
                          color: 'var(--text-subtle)', 
                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' }
                        }}>Marks</TableCell>
                        <TableCell align="center" className="meta-mono" sx={{ 
                          fontWeight: 500, 
                          color: 'var(--text-subtle)', 
                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' }
                        }}>%</TableCell>
                        <TableCell align="center" className="meta-mono" sx={{ 
                          fontWeight: 500, 
                          color: 'var(--text-subtle)', 
                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' }
                        }}>SGPA</TableCell>
                        <TableCell align="center" className="meta-mono" sx={{ 
                          fontWeight: 500, 
                          color: 'var(--text-subtle)', 
                          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' }
                        }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredResults.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                              No results found for the selected semester
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredResults.map((result, idx) => (
                          <TableRow key={`${result.subject_id}-${result.term_id}-${idx}`} hover>
                            <TableCell sx={{ 
                              minWidth: { xs: '120px', sm: 'auto' },
                              py: { xs: 1, sm: 1.5 }
                            }}>
                              <Chip 
                                label={result.subject_code} 
                                color="secondary" 
                                size={isMobile ? 'small' : 'medium'}
                                sx={{ mb: { xs: 0.5, sm: 0.5 }, fontSize: { xs: '0.65rem', sm: '0.75rem' } }} 
                              />
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ 
                                  fontSize: { xs: '0.7rem', sm: '0.875rem' },
                                  display: { xs: 'block', sm: 'block' },
                                  mt: 0.5
                                }}
                              >
                                {isMobile ? result.subject_name.substring(0, 20) + '...' : result.subject_name}
                              </Typography>
                              {isMobile && (
                                <Typography 
                                  variant="caption" 
                                  color="primary"
                                  sx={{ fontSize: '0.65rem', display: 'block', mt: 0.5 }}
                                >
                                  {result.term_code}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, py: { xs: 1, sm: 1.5 } }}>
                              <Chip 
                                label={result.term_code} 
                                color="primary" 
                                size={isMobile ? 'small' : 'medium'}
                              />
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, mt: 0.5 }}>
                                {result.term_code}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: { xs: 1, sm: 1.5 } }}>
                              <Chip 
                                label={`Sem ${result.semester}`} 
                                size="small"
                                sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              {result.marks.toFixed(1)}/{result.max_marks}
                            </TableCell>
                            <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 } }}>
                              <Chip
                                label={`${result.percentage.toFixed(1)}%`}
                                size={isMobile ? 'small' : 'medium'}
                                color={result.percentage >= 60 ? 'success' : result.percentage >= 40 ? 'warning' : 'error'}
                                sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 } }}>
                              <Chip
                                label={result.sgpa}
                                size={isMobile ? 'small' : 'medium'}
                                color={parseFloat(result.sgpa) >= 6 ? 'success' : parseFloat(result.sgpa) >= 4 ? 'warning' : 'error'}
                                sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                              {result.percentage >= 60 ? '✅ Pass' : '❌ Fail'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </CardContent>
          </Card>

          {/* Progress Charts - By Subject and Semester */}
          {filteredChartData.length > 0 && (() => {
            // Group by semester and subject
            const semesterGroups = {};
            filteredChartData.forEach(item => {
              const semKey = item.semester || 'unknown';
              if (!semesterGroups[semKey]) {
                semesterGroups[semKey] = {};
              }
              if (!semesterGroups[semKey][item.subject]) {
                semesterGroups[semKey][item.subject] = {
                  subjectCode: item.subject,
                  subjectName: item.subjectName,
                  data: []
                };
              }
              semesterGroups[semKey][item.subject].data.push(item);
            });

            return Object.entries(semesterGroups).map(([sem, subjects]) => (
              <Box key={sem} sx={{ mb: 4 }}>
                <Typography 
                  className="headline-serif"
                  variant="h5" 
                  sx={{ 
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    mb: 2
                  }}
                >
                  Semester {sem} - Subject Performance Trends
                </Typography>
                {Object.values(subjects).map(subjectGroup => {
                  const sortedData = subjectGroup.data.sort((a, b) => a.termId - b.termId);
                  
                  return (
                    <Card key={subjectGroup.subjectCode} sx={{ mb: 3, background: 'var(--surface-light)', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
                      <CardContent>
                        <Typography 
                          className="headline-serif"
                          variant="h6" 
                          gutterBottom 
                          sx={{ 
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            mb: 3
                          }}
                        >
                          {subjectGroup.subjectCode} - {subjectGroup.subjectName}
                        </Typography>
                        {sortedData.length > 0 ? (() => {
                          // Calculate max marks for Y-axis domain
                          const maxMarks = Math.max(...sortedData.map(d => d.maxMarks || 100), 100);
                          const maxObtainedMarks = Math.max(...sortedData.map(d => d.marks || 0), 0);
                          const yAxisMax = Math.ceil(Math.max(maxMarks, maxObtainedMarks * 1.1));
                          
                          return (
                            <Box sx={{ 
                              width: '100%', 
                              height: { xs: 250, sm: 300, md: 350, lg: 400 },
                              overflowX: 'auto',
                              overflowY: 'hidden'
                            }}>
                              <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                                <LineChart 
                                  data={sortedData}
                                  margin={{ top: 5, right: 10, left: isMobile ? -10 : 0, bottom: isMobile ? 20 : 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis 
                                    dataKey="term" 
                                    tick={{ fontSize: { xs: 9, sm: 11, md: 12 } }}
                                    interval={0}
                                    angle={isMobile ? -45 : 0}
                                    textAnchor={isMobile ? 'end' : 'middle'}
                                    height={isMobile ? 60 : 30}
                                  />
                                  <YAxis 
                                    domain={[0, yAxisMax]} 
                                    label={{ 
                                      value: 'Marks', 
                                      angle: -90, 
                                      position: 'insideLeft',
                                      style: { fontSize: { xs: '0.7rem', sm: '0.875rem' } }
                                    }}
                                    tick={{ fontSize: { xs: 9, sm: 11, md: 12 } }}
                                    width={isMobile ? 40 : 60}
                                  />
                                  <Tooltip 
                                    formatter={(value, name, props) => {
                                      if (name === 'Marks') {
                                        const maxMarks = props.payload?.maxMarks || 0;
                                        return [`${parseFloat(value).toFixed(1)}/${maxMarks}`, 'Marks'];
                                      }
                                      return [value, name];
                                    }}
                                    labelFormatter={(label) => `Term: ${label}`}
                                    contentStyle={{ 
                                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                      padding: { xs: '8px', sm: '12px' }
                                    }}
                                  />
                                  <Legend 
                                    wrapperStyle={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="marks"
                                    stroke="#000000"
                                    strokeWidth={isMobile ? 2 : 3}
                                    name="Marks"
                                    dot={{ r: { xs: 3, sm: 4, md: 6 } }}
                                    activeDot={{ r: { xs: 5, sm: 6, md: 8 } }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </Box>
                          );
                        })() : (
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                            No data available for chart
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            ));
          })()}

          {/* Detailed Question-wise Results */}
          <Card sx={{ mb: 4, background: 'var(--surface-light)', border: '1px solid var(--border-color)', borderRadius: '0px' }}>
            <CardContent>
              <Typography 
                className="headline-serif"
                variant="h5" 
                sx={{ 
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
                  mb: 3
                }}
              >
                Detailed Question-wise Evaluation
              </Typography>
              
              {/* Filter Controls */}
              <Box 
                display="flex" 
                flexDirection={{ xs: 'column', sm: 'row' }}
                gap={2}
                mb={3}
                flexWrap="wrap"
              >
                <FormControl
                  sx={{
                    minWidth: { xs: '100%', sm: 180 },
                    width: { xs: '100%', sm: 'auto' }
                  }}
                >
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={detailSemester}
                    onChange={e => {
                      setDetailSemester(e.target.value);
                      setDetailTermId('');
                      setDetailSubjectId('');
                    }}
                    label="Semester"
                    sx={{
                      borderRadius: '0px',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--border-color)'
                      }
                    }}
                  >
                    <MenuItem value="">Select Semester</MenuItem>
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
                    minWidth: { xs: '100%', sm: 180 },
                    width: { xs: '100%', sm: 'auto' }
                  }}
                  disabled={!detailSemester}
                >
                  <InputLabel>Exam</InputLabel>
                  <Select
                    value={detailTermId}
                    onChange={e => {
                      setDetailTermId(e.target.value);
                      setDetailSubjectId('');
                    }}
                    label="Exam"
                    sx={{
                      borderRadius: '0px',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--border-color)'
                      }
                    }}
                  >
                    <MenuItem value="">Select CIA Exam</MenuItem>
                    {(() => {
                      // Get unique terms for the selected semester
                      const uniqueTerms = new Map();
                      studentData?.term_results
                        ?.filter(r => r.semester === parseInt(detailSemester))
                        .forEach((result) => {
                          if (!uniqueTerms.has(result.term_id)) {
                            uniqueTerms.set(result.term_id, result);
                          }
                        });
                      return Array.from(uniqueTerms.values()).map((result) => (
                        <MenuItem key={result.term_id} value={result.term_id}>
                          {result.term_code}
                        </MenuItem>
                      ));
                    })()}
                  </Select>
                </FormControl>

                <FormControl 
                  sx={{ 
                    minWidth: { xs: '100%', sm: 250 },
                    width: { xs: '100%', sm: 'auto' }
                  }}
                  disabled={!detailSemester || !detailTermId}
                >
                  <InputLabel>Subject</InputLabel>
                  <Select
                    value={detailSubjectId}
                    onChange={e => setDetailSubjectId(e.target.value)}
                    label="Subject"
                    sx={{
                      borderRadius: '0px',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--border-color)'
                      }
                    }}
                  >
                    <MenuItem value="">Select Subject</MenuItem>
                    {studentData?.term_results
                      ?.filter(r => r.semester === parseInt(detailSemester) && r.term_id === parseInt(detailTermId))
                      .map((result) => (
                        <MenuItem key={result.subject_id} value={result.subject_id}>
                          {result.subject_code} - {result.subject_name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Display detailed results */}
              {(() => {
                if (!detailSemester || !detailTermId || !detailSubjectId) {
                  return (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Please select Semester, CIA Exam, and Subject to view detailed evaluation
                      </Typography>
                    </Box>
                  );
                }

                const selectedResult = studentData?.term_results?.find(r => 
                  r.semester === parseInt(detailSemester) && 
                  r.term_id === parseInt(detailTermId) && 
                  r.subject_id === parseInt(detailSubjectId)
                );
                
                if (!selectedResult || !selectedResult.detailed_results) {
                  return (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No detailed results available for the selected combination
                      </Typography>
                    </Box>
                  );
                }
                  
                  return (
                    <Box>
                      <Box sx={{ bgcolor: 'var(--text-primary)', color: 'var(--text-inverted)', p: 3, mb: 3, border: '1px solid var(--border-color)' }}>
                        <Typography 
                          className="headline-serif"
                          variant="h5" 
                          sx={{ 
                            fontWeight: 500,
                            mb: 1
                          }}
                        >
                          {selectedResult.subject_code} - {selectedResult.subject_name}
                        </Typography>
                        <Typography 
                          className="meta-mono"
                          sx={{ 
                            mb: 1,
                            opacity: 0.8
                          }}
                        >
                          {selectedResult.term_code} - Semester {selectedResult.semester}
                        </Typography>
                        <Typography 
                          className="body-text"
                          sx={{ fontSize: '0.9rem' }}
                        >
                          Total Marks: {selectedResult.marks.toFixed(1)}/{selectedResult.max_marks} ({selectedResult.percentage.toFixed(1)}%) | SGPA: {selectedResult.sgpa}
                        </Typography>
                      </Box>
                      
                      {Object.keys(selectedResult.detailed_results).map((qNum) => {
                        const qData = selectedResult.detailed_results[qNum];
                        const percentage = qData.max_marks > 0 ? ((qData.marks / qData.max_marks) * 100).toFixed(1) : 0;
                        
                        return (
                          <Paper 
                            key={qNum} 
                            sx={{ 
                              p: { xs: 2, sm: 3 }, 
                              mb: 3, 
                              border: '1px solid var(--border-color)',
                              borderRadius: '0px',
                              background: 'var(--surface-light)'
                            }}
                          >
                            <Box 
                              display="flex" 
                              justifyContent="space-between" 
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                              flexDirection={{ xs: 'column', sm: 'row' }}
                              gap={{ xs: 1.5, sm: 0 }}
                              mb={2}
                            >
                              <Typography 
                                className="headline-serif"
                                variant="h5" 
                                sx={{ 
                                  fontWeight: 500,
                                  color: 'var(--text-primary)',
                                  fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem', lg: '1.75rem' }
                                }}
                              >
                                {qNum}
                              </Typography>
                              <Box 
                                display="flex" 
                                gap={1} 
                                alignItems="center"
                                flexWrap="wrap"
                                width={{ xs: '100%', sm: 'auto' }}
                                justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                              >
                                <Chip
                                  label={`${qData.marks}/${qData.max_marks} marks`}
                                  size={isMobile ? 'small' : 'medium'}
                                  color={qData.marks >= qData.max_marks * 0.6 ? 'success' : qData.marks >= qData.max_marks * 0.4 ? 'warning' : 'error'}
                                  sx={{ 
                                    fontWeight: 'bold',
                                    fontSize: { xs: '0.7rem', sm: '0.875rem' }
                                  }}
                                />
                                <Chip
                                  label={`${percentage}%`}
                                  size="small"
                                  color={parseFloat(percentage) >= 60 ? 'success' : parseFloat(percentage) >= 40 ? 'warning' : 'error'}
                                  sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                                />
                              </Box>
                            </Box>

                            {qData.question_text && (
                              <Box sx={{ 
                                mb: 2, 
                                p: { xs: 1.5, sm: 2 }, 
                                bgcolor: 'var(--surface-light)', 
                                border: '1px solid var(--border-color)' 
                              }}>
                                <Typography 
                                  className="meta-mono"
                                  sx={{ 
                                    fontWeight: 500, 
                                    mb: 1, 
                                    color: 'var(--text-subtle)',
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                  }}
                                >
                                  Question
                                </Typography>
                                <Typography 
                                  className="body-text"
                                  sx={{ 
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.6,
                                    fontSize: { xs: '0.85rem', sm: '0.875rem' },
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {qData.question_text}
                                </Typography>
                              </Box>
                            )}

                            {qData.student_answer && (
                              <Box sx={{ 
                                mb: 2, 
                                p: { xs: 1.5, sm: 2 }, 
                                bgcolor: 'var(--surface-light)', 
                                border: '1px solid var(--border-color)', 
                                borderLeft: { xs: '2px', sm: '4px' } + ' solid var(--text-primary)' 
                              }}>
                                <Typography 
                                  className="meta-mono"
                                  sx={{ 
                                    fontWeight: 500, 
                                    mb: 1, 
                                    color: 'var(--text-subtle)',
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                  }}
                                >
                                  Your Answer
                                </Typography>
                                <Typography 
                                  className="body-text"
                                  sx={{ 
                                    whiteSpace: 'pre-wrap',
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.6,
                                    fontSize: { xs: '0.85rem', sm: '0.875rem' },
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {qData.student_answer}
                                </Typography>
                              </Box>
                            )}

                            {qData.correct_answer && (
                              <Box sx={{ 
                                mb: 2, 
                                p: { xs: 1.5, sm: 2 }, 
                                bgcolor: 'var(--surface-light)', 
                                border: '1px solid var(--border-color)' 
                              }}>
                                <Typography 
                                  className="meta-mono"
                                  sx={{ 
                                    fontWeight: 500, 
                                    mb: 1, 
                                    color: 'var(--text-subtle)',
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                  }}
                                >
                                  Correct Answer
                                </Typography>
                                <Typography 
                                  className="body-text"
                                  sx={{ 
                                    whiteSpace: 'pre-wrap',
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.6,
                                    fontSize: { xs: '0.85rem', sm: '0.875rem' },
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {qData.correct_answer}
                                </Typography>
                              </Box>
                            )}

                            {qData.reason && (
                              <Box sx={{ 
                                mb: 2, 
                                p: { xs: 1.5, sm: 2 }, 
                                bgcolor: 'var(--surface-light)', 
                                border: '1px solid var(--border-color)' 
                              }}>
                                <Typography 
                                  className="meta-mono"
                                  sx={{ 
                                    fontWeight: 500, 
                                    mb: 1, 
                                    color: 'var(--text-subtle)',
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                  }}
                                >
                                  Evaluation Details
                                </Typography>
                                <Typography 
                                  className="body-text"
                                  sx={{ 
                                    whiteSpace: 'pre-wrap',
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.6,
                                    fontSize: { xs: '0.85rem', sm: '0.875rem' },
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {qData.reason}
                                </Typography>
                              </Box>
                            )}

                            <Divider sx={{ mt: 2 }} />
                          </Paper>
                        );
                      })}
                    </Box>
                  );
                })()}
            </CardContent>
          </Card>
        </>
      )}
      </Box>
    </Box>
  );
}

export default StudentPortal;
