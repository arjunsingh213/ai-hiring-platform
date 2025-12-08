import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../../components/jobseeker/Sidebar';
import TopNav from '../../components/TopNav';
import HomeFeed from './HomeFeed';
import ProfilePage from './ProfilePage';
import MessagingPage from './MessagingPage';
import InterviewsPage from './InterviewsPage';
import JobListingsPage from './JobListingsPage';
import SettingsPage from './SettingsPage';
import OfferAcceptancePage from './OfferAcceptancePage';
import OnboardingPortal from './OnboardingPortal';
import './JobSeekerDashboard.css';

const JobSeekerDashboard = () => {
    return (
        <div className="dashboard">
            <Sidebar />
            <TopNav />
            <div className="dashboard-main">
                <Routes>
                    <Route path="/" element={<Navigate to="home" replace />} />
                    <Route path="home" element={<HomeFeed />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="messages" element={<MessagingPage />} />
                    <Route path="interviews" element={<InterviewsPage />} />
                    <Route path="jobs" element={<JobListingsPage />} />
                    <Route path="offer/:hiringId" element={<OfferAcceptancePage />} />
                    <Route path="onboarding/:hiringId" element={<OnboardingPortal />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Routes>
            </div>
        </div>
    );
};

export default JobSeekerDashboard;
