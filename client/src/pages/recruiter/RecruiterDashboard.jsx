import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RecruiterSidebar from '../../components/recruiter/RecruiterSidebar';
import MobileNav from '../../components/MobileNav';
import TopNav from '../../components/TopNav';
import RecruiterHome from './RecruiterHome';
// CandidatesPage removed - merged into RecruiterApplicationsPage (Talent Pipeline)
import RecruiterApplicationsPage from './RecruiterApplicationsPage';
import JobPostingPage from './JobPostingPage';
import MyJobsPage from './MyJobsPage';
import RecruiterAnalytics from './RecruiterAnalytics';
import RecruiterMessages from './RecruiterMessages';
import RecruiterSettings from './RecruiterSettings';
import HiringPipelinePage from './HiringPipelinePage';
import OnboardingPortal from '../jobseeker/OnboardingPortal';
import LeaderboardPage from '../jobseeker/LeaderboardPage';
import PublicProfilePage from '../shared/PublicProfilePage';
import InterviewRoom from '../interview/InterviewRoom';
import InterviewReport from './InterviewReport';
import './RecruiterDashboard.css';

const RecruiterDashboard = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(localStorage.getItem('sidebar-collapsed') === 'true');

    React.useEffect(() => {
        const handleToggle = (e) => setIsCollapsed(e.detail);
        window.addEventListener('sidebar-toggle', handleToggle);
        return () => window.removeEventListener('sidebar-toggle', handleToggle);
    }, []);

    return (
        <div className="recruiter-dashboard" style={{ '--sidebar-width': isCollapsed ? '80px' : '240px' }}>
            <RecruiterSidebar />
            <TopNav />
            <div className="recruiter-main">
                <Routes>
                    <Route path="/" element={<Navigate to="home" replace />} />
                    <Route path="home" element={<RecruiterHome />} />
                    <Route path="profile" element={<PublicProfilePage />} />
                    <Route path="candidates" element={<LeaderboardPage />} />
                    <Route path="applications" element={<RecruiterApplicationsPage />} />
                    <Route path="hiring-pipeline" element={<HiringPipelinePage />} />
                    <Route path="onboarding/:hiringId" element={<OnboardingPortal />} />
                    <Route path="my-jobs" element={<MyJobsPage />} />
                    <Route path="post-job" element={<JobPostingPage />} />
                    <Route path="analytics" element={<RecruiterAnalytics />} />
                    <Route path="messages" element={<RecruiterMessages />} />
                    <Route path="settings" element={<RecruiterSettings />} />
                    <Route path="interview-room/:roomCode" element={<InterviewRoom />} />
                    <Route path="interview-report/:roomCode" element={<InterviewReport />} />
                </Routes>
            </div>
            <MobileNav />
        </div>
    );
};

export default RecruiterDashboard;
