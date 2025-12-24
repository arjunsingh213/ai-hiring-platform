import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import LandingPage from './pages/landing/LandingPage';
import LandingPageNew from './pages/landing/LandingPageNew';
import AuthPage from './pages/auth/AuthPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import RoleSelection from './pages/onboarding/RoleSelection';
import JobSeekerOnboarding from './pages/onboarding/JobSeekerOnboarding';
import RecruiterOnboarding from './pages/onboarding/RecruiterOnboarding';
import JobSeekerDashboard from './pages/jobseeker/JobSeekerDashboard';
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import AIInterview from './pages/interview/AIInterview';
import InterviewReadiness from './pages/interview/InterviewReadiness';
import InterviewResults from './pages/interview/InterviewResults';
import PublicProfilePage from './pages/shared/PublicProfilePage';
// Admin Portal
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import './index.css';

// OAuth Token Handler - extracts and stores auth data from URL params after OAuth redirect
const OAuthTokenHandler = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const userId = params.get('userId');

    if (token && userId) {
      // Store auth data from OAuth redirect
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);

      // Fetch user data to get role and other info
      const fetchUserData = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (data.success && data.data) {
            localStorage.setItem('userRole', data.data.role);
            localStorage.setItem('userEmail', data.data.email);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };

      fetchUserData();

      // Clean URL by removing query params and reload to refresh components
      const cleanPath = location.pathname;
      navigate(cleanPath, { replace: true });
      // Force a small delay then reload to ensure all components get fresh data
      setTimeout(() => window.location.reload(), 100);

      console.log('OAuth login successful, token stored');
    }
  }, [location, navigate]);

  return children;
};

function App() {
  return (
    <ToastProvider>
      <Router>
        <OAuthTokenHandler>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPageNew />} />
            <Route path="/landing-old" element={<LandingPage />} />

            {/* Authentication - Combined sliding auth page */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

            {/* Onboarding */}
            <Route path="/onboarding/role-selection" element={<RoleSelection />} />
            <Route path="/onboarding/jobseeker" element={<JobSeekerOnboarding />} />
            <Route path="/onboarding/recruiter" element={<RecruiterOnboarding />} />

            {/* AI Interview */}
            <Route path="/interview/:interviewId/ready" element={<InterviewReadiness />} />
            <Route path="/interview/:interviewId" element={<AIInterview />} />
            <Route path="/interview/:interviewId/results" element={<InterviewResults />} />

            {/* Public Profile (accessible by both roles) */}
            <Route path="/profile/:userId" element={<PublicProfilePage />} />

            {/* Dashboards */}
            <Route path="/jobseeker/*" element={<JobSeekerDashboard />} />
            <Route path="/recruiter/*" element={<RecruiterDashboard />} />

            {/* Admin Portal */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
          </Routes>
        </OAuthTokenHandler>
      </Router>
    </ToastProvider>
  );
}

export default App;

