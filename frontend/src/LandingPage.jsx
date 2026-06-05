import React from 'react';
import { Box, Typography, Button, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import favicon from '../../favicon.png';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8f6f3',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header Section */}
      <Box 
        sx={{ 
          p: { xs: 4, md: 6 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid var(--border-color)'
        }}
      >
        <img
          src={favicon}
          alt="IC Eval"
          style={{
            width: '80px',
            height: '80px',
            objectFit: 'contain'
          }}
        />
        <Typography 
          className="meta-mono"
          sx={{ 
            color: 'var(--text-subtle)',
            fontSize: '0.75rem'
          }}
        >
          /01
        </Typography>
      </Box>

      {/* Main Hero Content */}
      <Box 
        sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 4, md: 8 },
          gap: { xs: 6, md: 8 },
          maxWidth: { xs: '100%', sm: '100%', md: '1200px', lg: '1400px', xl: '1600px' },
          mx: 'auto',
          width: '100%'
        }}
      >
        {/* Left Side - Main Headline */}
        <Box 
          sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          <Typography 
            className="meta-mono"
            sx={{ 
              color: 'var(--text-subtle)',
              fontSize: '0.75rem',
              mb: 1
            }}
          >
            AUTOMATED EVALUATION SYSTEM
          </Typography>
          
          <Typography 
            className="headline-serif"
            sx={{ 
              fontSize: { xs: '3rem', md: '5rem', lg: '6rem' },
              color: 'var(--text-primary)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 0.95,
              mb: 2
            }}
          >
            INTELLIGENT 
            <br />
            COPY EVALUATOR
          </Typography>

          <Typography 
            className="body-text"
            sx={{ 
              color: 'var(--text-subtle)',
              fontSize: '1rem',
              maxWidth: '500px',
              lineHeight: 1.6,
              mb: 4
            }}
          >
            AI-powered automated grading system for exam papers. 
            Upload answer sheets, get instant evaluation with detailed feedback.
          </Typography>
        </Box>

        {/* Right Side - Action Cards */}
        <Box 
          sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxWidth: { xs: '100%', md: '500px' },
            width: '100%'
          }}
        >
          {/* Student Portal Card */}
          <Box
            sx={{
              p: 4,
              border: '1px solid var(--border-color)',
              background: '#f8f6f3'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography 
                className="headline-serif card-title"
                sx={{ 
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  transition: 'color 0.3s ease'
                }}
              >
                Student Portal
              </Typography>
              <Typography 
                className="meta-mono card-number"
                sx={{ 
                  color: 'var(--text-subtle)',
                  fontSize: '0.75rem',
                  transition: 'color 0.3s ease'
                }}
              >
                /01
              </Typography>
            </Box>
            <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />
            <Typography 
              className="body-text card-text"
              sx={{ 
                color: 'var(--text-subtle)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                mb: 3,
                transition: 'color 0.3s ease'
              }}
            >
              Search and view your evaluated exam results with detailed question-wise feedback and performance analytics.
            </Typography>
            <Button 
              className="btn-primary"
              onClick={() => navigate('/student-portal')}
              sx={{
                width: '100%',
                py: 1.5
              }}
            >
              Student Portal
            </Button>
          </Box>

          {/* Teacher Portal Card */}
          <Box
            sx={{
              p: 4,
              border: '1px solid var(--border-color)',
              background: '#f8f6f3'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography 
                className="headline-serif card-title"
                sx={{ 
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  transition: 'color 0.3s ease'
                }}
              >
                Teacher Portal
              </Typography>
              <Typography 
                className="meta-mono card-number"
                sx={{ 
                  color: 'var(--text-subtle)',
                  fontSize: '0.75rem',
                  transition: 'color 0.3s ease'
                }}
              >
                /02
              </Typography>
            </Box>
            <Divider sx={{ my: 2, borderColor: 'var(--border-color)' }} />
            <Typography 
              className="body-text card-text"
              sx={{ 
                color: 'var(--text-subtle)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                mb: 3,
                transition: 'color 0.3s ease'
              }}
            >
              Login to upload answer keys, manage questions, and evaluate student submissions with AI-powered analysis.
            </Typography>
            <Button 
              className="btn-primary"
              onClick={() => navigate('/teacher-login')}
              sx={{
                width: '100%',
                py: 1.5
              }}
            >
              Teacher Portal
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Footer Section */}
      <Box 
        sx={{ 
          p: { xs: 4, md: 6 },
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Typography 
          className="meta-mono"
          sx={{ 
            color: 'var(--text-subtle)',
            fontSize: '0.75rem'
          }}
        >
          POWERED BY AI Evaluator
        </Typography>
        <Typography 
          className="body-text"
          sx={{ 
            color: 'var(--text-subtle)',
            fontSize: '0.75rem'
          }}
        >
          © 2025 Copyright
        </Typography>
      </Box>
    </Box>
  );
}

export default LandingPage;
