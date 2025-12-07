import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import RoleSelection from './pages/onboarding/RoleSelection';
import JobSeekerOnboarding from './pages/onboarding/JobSeekerOnboarding';
import RecruiterOnboarding from './pages/onboarding/RecruiterOnboarding';
import JobSeekerDashboard from './pages/jobseeker/JobSeekerDashboard';
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import AIInterview from './pages/interview/AIInterview';
import PublicProfilePage from './pages/shared/PublicProfilePage';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Onboarding */}
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/onboarding/jobseeker" element={<JobSeekerOnboarding />} />
        <Route path="/onboarding/recruiter" element={<RecruiterOnboarding />} />

        {/* AI Interview */}
        <Route path="/interview/:interviewId" element={<AIInterview />} />

        {/* Public Profile (accessible by both roles) */}
        <Route path="/profile/:userId" element={<PublicProfilePage />} />

        {/* Dashboards */}
        <Route path="/jobseeker/*" element={<JobSeekerDashboard />} />
        <Route path="/recruiter/*" element={<RecruiterDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
