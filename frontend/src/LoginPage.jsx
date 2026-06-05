import React, { useState } from 'react';
import { Button, TextField, Box, Typography, Alert, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      navigate('/teacher-dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

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
            Teacher Login
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField 
              fullWidth 
              margin="normal" 
              label="Username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
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
            <TextField 
              fullWidth 
              margin="normal" 
              label="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              type="password" 
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
              <Alert 
                severity="error" 
                sx={{ 
                  mt: 2,
                  borderRadius: '0px',
                  '& .MuiAlert-icon': {
                    color: 'var(--text-primary)'
                  }
                }}
              >
                {error}
              </Alert>
            )}
            <Button 
              className="btn-primary"
              fullWidth 
              type="submit" 
              sx={{ mt: 3, py: 1.5 }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <Button 
              className="btn-secondary"
              fullWidth 
              sx={{ mt: 2, py: 1.5 }}
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default LoginPage;
