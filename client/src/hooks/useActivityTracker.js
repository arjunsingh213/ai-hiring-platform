import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const HEARTBEAT_INTERVAL = 60000; // 1 minute

/**
 * Maps a URL path to a detailed, human-readable feature name.
 * This is the single source of truth for page-level activity tracking.
 */
const getFeatureFromPath = (path) => {
    // Normalize: strip trailing slash, lowercase
    const p = path.replace(/\/$/, '').toLowerCase();

    // ── Job Seeker Pages ──
    if (p === '/jobseeker/home' || p === '/jobseeker/feed') return 'Home Feed';
    if (p === '/jobseeker/dashboard') return 'Dashboard';
    if (p === '/jobseeker/jobs') return 'Job Listings';
    if (p === '/jobseeker/applications') return 'My Applications';
    if (p === '/jobseeker/interviews') return 'Interviews';
    if (p === '/jobseeker/challenges' || p.startsWith('/jobseeker/challenges')) return 'Challenges';
    if (p === '/jobseeker/settings') return 'Settings';
    if (p === '/jobseeker/profile') return 'Profile';
    if (p === '/jobseeker/talent-passport') return 'Talent Passport';
    if (p === '/jobseeker/messages') return 'Messages';
    if (p === '/jobseeker/notifications') return 'Notifications';
    if (p === '/jobseeker/onboarding') return 'Onboarding Portal';
    if (p.startsWith('/jobseeker/')) return 'Job Seeker — ' + p.split('/jobseeker/')[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // ── Recruiter Pages ──
    if (p === '/recruiter/home' || p === '/recruiter/feed') return 'Recruiter Home';
    if (p === '/recruiter/dashboard') return 'Recruiter Dashboard';
    if (p === '/recruiter/my-jobs') return 'My Jobs';
    if (p === '/recruiter/post-job') return 'Post Job';
    if (p === '/recruiter/applications') return 'View Applications';
    if (p === '/recruiter/analytics') return 'Analytics';
    if (p === '/recruiter/interviews') return 'Interview Scheduling';
    if (p === '/recruiter/candidates') return 'Candidate Search';
    if (p === '/recruiter/talent-search') return 'Talent Search';
    if (p === '/recruiter/settings') return 'Recruiter Settings';
    if (p === '/recruiter/profile') return 'Recruiter Profile';
    if (p === '/recruiter/messages') return 'Messages';
    if (p.startsWith('/recruiter/')) return 'Recruiter — ' + p.split('/recruiter/')[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // ── Interview Pages ──
    if (p.match(/^\/interview\/[^/]+\/ready$/)) return 'Interview Readiness Check';
    if (p.match(/^\/interview\/[^/]+\/results$/)) return 'Interview Results';
    if (p.match(/^\/interview\/[^/]+$/)) return 'AI Interview';
    if (p.match(/^\/interview-room\/[^/]+$/)) return 'Video Interview Room';
    if (p === '/interview-room') return 'Interview Room Landing';
    if (p.match(/^\/interview-report\/[^/]+$/)) return 'Interview Report';

    // ── Auth & Onboarding ──
    if (p === '/login' || p === '/auth') return 'Login';
    if (p === '/signup') return 'Signup';
    if (p === '/forgot-password') return 'Forgot Password';
    if (p.startsWith('/verify-email')) return 'Email Verification';
    if (p === '/onboarding/role-selection') return 'Onboarding — Role Selection';
    if (p === '/onboarding/jobseeker') return 'Onboarding — Job Seeker';
    if (p === '/onboarding/recruiter') return 'Onboarding — Recruiter';

    // ── Public/Shared Pages ──
    if (p === '/' || p === '/landing-old') return 'Landing Page';
    if (p.startsWith('/profile/')) return 'Public Profile';
    if (p.startsWith('/jobs/')) return 'Shared Job Link';
    if (p === '/glossary') return 'Glossary';
    if (p === '/blog') return 'Blog';

    // ── Admin ──
    if (p.startsWith('/admin')) return 'Admin Panel';

    return 'Other';
};

export const useActivityTracker = () => {
    const location = useLocation();
    const lastReportTime = useRef(Date.now());

    const logActivity = async (action, feature, metadata = {}) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const now = Date.now();
            const duration = Math.floor((now - lastReportTime.current) / 1000);
            lastReportTime.current = now;

            await fetch(`${API_URL}/activity/log`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action,
                    feature,
                    page: location.pathname,
                    duration: action === 'HEARTBEAT' ? duration : 0,
                    metadata
                })
            });
        } catch (error) {
            // Silent fail — activity logging should never block UX
        }
    };

    // Track page views with detailed feature names
    useEffect(() => {
        const feature = getFeatureFromPath(location.pathname);
        logActivity('PAGE_VIEW', feature);

        // Handle URL-based tracking (like Email Campaigns)
        const params = new URLSearchParams(location.search);
        if (params.get('source') === 'email_campaign') {
            const campType = params.get('type') || 'unknown';
            sessionStorage.setItem('pending_email_tracking', campType);
        }
    }, [location.pathname, location.search]);

    // Process pending tracking events when token becomes available (e.g. after login)
    useEffect(() => {
        const checkPendingTracking = async () => {
            const token = localStorage.getItem('token');
            const pendingTracking = sessionStorage.getItem('pending_email_tracking');
            
            if (token && pendingTracking) {
                await logActivity('EMAIL_CAMPAIGN_VISIT', 'Email Campaign', { campaignType: pendingTracking });
                sessionStorage.removeItem('pending_email_tracking');
            }
        };

        checkPendingTracking();
    }, [location.pathname]);

    // Heartbeat for time spent tracking — reports which page user is currently on
    useEffect(() => {
        const interval = setInterval(() => {
            const feature = getFeatureFromPath(location.pathname);
            logActivity('HEARTBEAT', feature);
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(interval);
    }, [location.pathname]);

    return { logActivity };
};
