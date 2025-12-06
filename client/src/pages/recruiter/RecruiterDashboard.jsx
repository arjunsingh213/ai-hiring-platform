import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RecruiterSidebar from '../../components/recruiter/RecruiterSidebar';
import TopNav from '../../components/TopNav';
import RecruiterHome from './RecruiterHome';
import CandidatesPage from './CandidatesPage';
import JobPostingPage from './JobPostingPage';
import RecruiterAnalytics from './RecruiterAnalytics';
import RecruiterMessages from './RecruiterMessages';
import RecruiterSettings from './RecruiterSettings';
import './RecruiterDashboard.css';

const RecruiterDashboard = () => {
    return (
        <div className="recruiter-dashboard">
            <RecruiterSidebar />
            <TopNav />
            <div className="recruiter-main">
                <Routes>
                    <Route path="/" element={<Navigate to="home" replace />} />
                    <Route path="home" element={<RecruiterHome />} />
                    <Route path="candidates" element={<CandidatesPage />} />
                    <Route path="post-job" element={<JobPostingPage />} />
                    <Route path="analytics" element={<RecruiterAnalytics />} />
                    <Route path="messages" element={<RecruiterMessages />} />
                    <Route path="settings" element={<RecruiterSettings />} />
                </Routes>
            </div>
        </div>
    );
};

export default RecruiterDashboard;
