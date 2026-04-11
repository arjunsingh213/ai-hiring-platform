import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
    const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebar-collapsed') === 'true');
    const [showProfilePrompt, setShowProfilePrompt] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleToggle = (e) => setIsCollapsed(e.detail);
        window.addEventListener('sidebar-toggle', handleToggle);
        return () => window.removeEventListener('sidebar-toggle', handleToggle);
    }, []);

    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (!user.isOnboardingComplete) {
                    const lastPromptedStr = localStorage.getItem('profilePromptLastShown');
                    let shouldShow = true;

                    if (lastPromptedStr) {
                        const lastPrompted = parseInt(lastPromptedStr, 10);
                        // Convert milliseconds to days (1000 ms * 60 s * 60 m * 24 h)
                        const daysSinceLastPrompt = (Date.now() - lastPrompted) / (1000 * 60 * 60 * 24);
                        if (daysSinceLastPrompt < 3) {
                             shouldShow = false; // Only show once every 3 days
                        }
                    }

                    if (shouldShow) {
                        // Small delay for better UX
                        setTimeout(() => setShowProfilePrompt(true), 1500);
                        localStorage.setItem('profilePromptLastShown', Date.now().toString());
                    }
                }
            }
        } catch (e) {
            console.error('Error checking profile completion:', e);
        }
    }, [location.pathname]);

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

            {/* Incomplete Profile Prompt Modal */}
            {showProfilePrompt && (
                <div className="profile-prompt-modal-overlay">
                    <div className="profile-prompt-card card-glass">
                        <div className="prompt-icon">🚀</div>
                        <h3>Stand out from the crowd!</h3>
                        <p>Did you know candidates with complete profiles receive 3x more recruiter interest? 
                           Take just 2 minutes to fill in your missing details.</p>
                        <div className="prompt-actions">
                            <button className="btn btn-primary" onClick={() => {
                                setShowProfilePrompt(false);
                                navigate('/jobseeker/profile?edit=true');
                            }}>Complete Profile Now</button>
                            <button className="btn btn-secondary" onClick={() => setShowProfilePrompt(false)}>
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobSeekerDashboard;
