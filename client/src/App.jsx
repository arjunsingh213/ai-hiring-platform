import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import RoleSelection from './pages/onboarding/RoleSelection';
import JobSeekerOnboarding from './pages/onboarding/JobSeekerOnboarding';
import RecruiterOnboarding from './pages/onboarding/RecruiterOnboarding';
import JobSeekerDashboard from './pages/jobseeker/JobSeekerDashboard';
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import AIInterview from './pages/interview/AIInterview';
import InterviewResults from './pages/interview/InterviewResults';
import PublicProfilePage from './pages/shared/PublicProfilePage';
import './index.css';

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

          {/* Onboarding */}
          <Route path="/onboarding/role-selection" element={<RoleSelection />} />
          <Route path="/onboarding/jobseeker" element={<JobSeekerOnboarding />} />
          <Route path="/onboarding/recruiter" element={<RecruiterOnboarding />} />

          {/* AI Interview */}
          <Route path="/interview/:interviewId" element={<AIInterview />} />
          <Route path="/interview/:interviewId/results" element={<InterviewResults />} />

          {/* Public Profile (accessible by both roles) */}
          <Route path="/profile/:userId" element={<PublicProfilePage />} />

          {/* Dashboards */}
          <Route path="/jobseeker/*" element={<JobSeekerDashboard />} />
          <Route path="/recruiter/*" element={<RecruiterDashboard />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;

