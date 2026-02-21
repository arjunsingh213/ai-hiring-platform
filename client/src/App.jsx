import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

// Lazy load components
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const LandingPageNew = lazy(() => import('./pages/landing/LandingPageNew'));
const AuthPage = lazy(() => import('./pages/auth/AuthPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const RoleSelection = lazy(() => import('./pages/onboarding/RoleSelection'));
const JobSeekerOnboarding = lazy(() => import('./pages/onboarding/JobSeekerOnboarding'));
const RecruiterOnboarding = lazy(() => import('./pages/onboarding/RecruiterOnboarding'));
const JobSeekerDashboard = lazy(() => import('./pages/jobseeker/JobSeekerDashboard'));
const RecruiterDashboard = lazy(() => import('./pages/recruiter/RecruiterDashboard'));
const AIInterview = lazy(() => import('./pages/interview/AIInterview'));
const InterviewReadiness = lazy(() => import('./pages/interview/InterviewReadiness'));
const InterviewResults = lazy(() => import('./pages/interview/InterviewResults'));
const PublicProfilePage = lazy(() => import('./pages/shared/PublicProfilePage'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const InterviewRoom = lazy(() => import('./pages/interview/InterviewRoom'));
const InterviewReport = lazy(() => import('./pages/recruiter/InterviewReport'));

// Loading Fallback
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
    <div className="spinner" style={{
      width: '40px', height: '40px', border: '4px solid #e2e8f0',
      borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite'
    }}></div>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

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
      localStorage.setItem('loginTimestamp', Date.now().toString());

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

  // Check for token in URL parameters synchronously to prevent race conditions
  // (ProtectedRoute would run before useEffect stores the token)
  const params = new URLSearchParams(location.search);
  const tokenParam = params.get('token');

  if (tokenParam) {
    return <LoadingFallback />;
  }

  return children;
};

function App() {
  return (
    <ToastProvider>
      <Router>
        <OAuthTokenHandler>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes - No authentication required */}
              <Route path="/" element={<LandingPageNew />} />
              <Route path="/landing-old" element={<LandingPage />} />

              {/* Authentication - Combined sliding auth page */}
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

              {/* Onboarding - Requires authentication */}
              <Route path="/onboarding/role-selection" element={
                <ProtectedRoute>
                  <RoleSelection />
                </ProtectedRoute>
              } />
              <Route path="/onboarding/jobseeker" element={
                <ProtectedRoute>
                  <JobSeekerOnboarding />
                </ProtectedRoute>
              } />
              <Route path="/onboarding/recruiter" element={
                <ProtectedRoute>
                  <RecruiterOnboarding />
                </ProtectedRoute>
              } />

              {/* AI Interview - Requires authentication */}
              <Route path="/interview/:interviewId/ready" element={
                <ProtectedRoute redirectTo="/">
                  <InterviewReadiness />
                </ProtectedRoute>
              } />
              <Route path="/interview/:interviewId" element={
                <ProtectedRoute redirectTo="/">
                  <AIInterview />
                </ProtectedRoute>
              } />
              <Route path="/interview/:interviewId/results" element={
                <ProtectedRoute redirectTo="/">
                  <InterviewResults />
                </ProtectedRoute>
              } />

              {/* Froscel Interview Room™ */}
              <Route path="/interview-room/:roomCode" element={
                <ProtectedRoute>
                  <InterviewRoom />
                </ProtectedRoute>
              } />

              {/* Interview Report */}
              <Route path="/interview-report/:roomCode" element={
                <ProtectedRoute>
                  <InterviewReport />
                </ProtectedRoute>
              } />

              {/* Public Profile (accessible by both roles, but requires login) */}
              <Route path="/profile/:userId" element={<PublicProfilePage />} />

              {/* Job Seeker Dashboard - Requires jobseeker role */}
              <Route path="/jobseeker/*" element={
                <ProtectedRoute requiredRole="jobseeker">
                  <JobSeekerDashboard />
                </ProtectedRoute>
              } />

              {/* Recruiter Dashboard - Requires recruiter role */}
              <Route path="/recruiter/*" element={
                <ProtectedRoute requiredRole="recruiter">
                  <RecruiterDashboard />
                </ProtectedRoute>
              } />

              {/* Admin Portal */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/*" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </OAuthTokenHandler>
      </Router>
    </ToastProvider>
  );
}

export default App;
