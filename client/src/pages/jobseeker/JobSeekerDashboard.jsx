import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from '../../components/jobseeker/Sidebar';
import MobileNav from '../../components/MobileNav';
import TopNav from '../../components/TopNav';
import HomeFeed from './HomeFeed';
import ProfilePage from './ProfilePage';
import MessagingPage from './MessagingPage';
import InterviewsPage from './InterviewsPage';
import JobListingsPage from './JobListingsPage';
import SettingsPage from './SettingsPage';
import OfferAcceptancePage from './OfferAcceptancePage';
import OnboardingPortal from './OnboardingPortal';
import LeaderboardPage from './LeaderboardPage';
import JobBanner from '../../components/jobseeker/JobBanner';
import JobDetailsPage from './JobDetailsPage';
import './JobSeekerDashboard.css';

const JobSeekerDashboard = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(localStorage.getItem('sidebar-collapsed') === 'true');
    const location = useLocation();

    React.useEffect(() => {
        const handleToggle = (e) => setIsCollapsed(e.detail);
        window.addEventListener('sidebar-toggle', handleToggle);
        return () => window.removeEventListener('sidebar-toggle', handleToggle);
    }, []);

    return (
        <div className="dashboard" style={{ '--sidebar-width': isCollapsed ? '80px' : '240px' }}>
            <Sidebar />
            <TopNav />
            <div className={`dashboard-main ${location.pathname.includes('/jobs/') && location.pathname !== '/jobseeker/jobs' ? 'no-banner' : ''}`}>
                {!location.pathname.includes('/jobs/') || location.pathname === '/jobseeker/jobs' ? <JobBanner /> : null}
                <Routes>
                    <Route path="/" element={<Navigate to="jobs" replace />} />
                    <Route path="home" element={<HomeFeed />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="messages" element={<MessagingPage />} />
                    <Route path="interviews" element={<InterviewsPage />} />
                    <Route path="jobs" element={<JobListingsPage />} />
                    <Route path="candidates" element={<LeaderboardPage />} />
                    <Route path="offer/:hiringId" element={<OfferAcceptancePage />} />
                    <Route path="onboarding/:hiringId" element={<OnboardingPortal />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="jobs/:id" element={<JobDetailsPage />} />
                </Routes>
            </div>
            <MobileNav />
        </div>
    );
};

export default JobSeekerDashboard;
