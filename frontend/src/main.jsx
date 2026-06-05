import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import './styles/global.css';
import LandingPage from './pages/LandingPage';
import StudentSubmit from './pages/StudentSubmit';
import StudentPortal from './pages/StudentPortal';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';

function App() {
  return (
    <>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/student-submit" element={<StudentSubmit />} />
          <Route path="/student-portal" element={<StudentPortal />} />
          <Route path="/teacher-login" element={<LoginPage />} />
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
