import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const HEARTBEAT_INTERVAL = 60000; // 1 minute

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
            console.error('Failed to log activity:', error);
        }
    };

    // Track page views
    useEffect(() => {
        const path = location.pathname;
        let feature = 'general';

        if (path.includes('/interview/')) feature = 'interview';
        else if (path.includes('/jobseeker')) feature = 'jobseeker_dashboard';
        else if (path.includes('/recruiter')) feature = 'recruiter_dashboard';
        else if (path.includes('/profile')) feature = 'profile';

        logActivity('PAGE_VIEW', feature);
    }, [location.pathname]);

    // Heartbeat for time spent tracking
    useEffect(() => {
        const interval = setInterval(() => {
            const path = location.pathname;
            let feature = 'general';
            if (path.includes('/interview/')) feature = 'interview';
            else if (path.includes('/jobseeker')) feature = 'jobseeker_dashboard';

            logActivity('HEARTBEAT', feature);
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(interval);
    }, [location.pathname]);

    return { logActivity };
};
