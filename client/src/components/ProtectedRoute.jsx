import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({
    children,
    requiredRole = null,  // 'jobseeker', 'recruiter', 'admin', or null for any authenticated user
    redirectTo = '/login'
}) => {
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasCorrectRole, setHasCorrectRole] = useState(true);

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const userId = localStorage.getItem('userId');
            const userRole = localStorage.getItem('userRole');
            const loginTimestamp = localStorage.getItem('loginTimestamp');

            // Check if token exists
            if (!token || !userId) {
                setIsAuthenticated(false);
                setIsChecking(false);
                return;
            }

            // Check if session is expired (24 hours)
            if (loginTimestamp) {
                const sessionAge = Date.now() - parseInt(loginTimestamp);
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                if (sessionAge > maxAge) {
                    // Session expired - clear auth data
                    localStorage.removeItem('token');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('userRole');
                    localStorage.removeItem('loginTimestamp');
                    setIsAuthenticated(false);
                    setIsChecking(false);
                    return;
                }
            }

            setIsAuthenticated(true);

            // Check role if required
            if (requiredRole) {
                setHasCorrectRole(userRole === requiredRole);
            }

            setIsChecking(false);
        };

        checkAuth();
    }, [requiredRole]);

    // Show loading while checking authentication
    if (isChecking) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#f8fafc'
            }}>
                <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #e2e8f0',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        // Save the attempted URL for redirect after login
        return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
    }

    // Authenticated but wrong role - redirect to appropriate dashboard
    if (!hasCorrectRole) {
        const userRole = localStorage.getItem('userRole');
        if (userRole === 'jobseeker') {
            return <Navigate to="/jobseeker/home" replace />;
        } else if (userRole === 'recruiter') {
            return <Navigate to="/recruiter/home" replace />;
        } else if (userRole === 'admin') {
            return <Navigate to="/admin/dashboard" replace />;
        }
        return <Navigate to="/" replace />;
    }

    // Authenticated and has correct role - render children
    return children;
};

export default ProtectedRoute;
