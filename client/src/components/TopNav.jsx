import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import api from '../services/api';
import NotificationCenter from './NotificationCenter';
import MessageButton from './MessageButton';
import './TopNav.css';

const TopNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            if (userId) {
                const response = await api.get(`/users/${userId}`);
                const userData = response.data.data || response.data;
                setUser(userData);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    // Determine user role from current path
    const isRecruiter = location.pathname.startsWith('/recruiter');
    const profilePath = isRecruiter ? '/recruiter/profile' : '/jobseeker/profile';
    const userName = user?.profile?.name || 'User';

    // Mobile menu items - MUST match sidebar navigation exactly
    const navItems = isRecruiter ? [
        { path: '/recruiter/home', label: 'Home', icon: '🏠' },
        { path: '/recruiter/my-jobs', label: 'My Jobs', icon: '📋' },
        { path: '/recruiter/applications', label: 'Talent Pipeline', icon: '👥' },
        { path: '/recruiter/post-job', label: 'Post Job', icon: '💼' },
        { path: '/recruiter/analytics', label: 'Analytics', icon: '📊' },
        { path: '/recruiter/messages', label: 'Messages', icon: '💬' },
        { path: '/recruiter/settings', label: 'Settings', icon: '⚙️' },
    ] : [
        { path: '/jobseeker/home', label: 'Home', icon: '🏠' },
        { path: '/jobseeker/profile', label: 'Profile', icon: '👤' },
        { path: '/jobseeker/jobs', label: 'Browse Jobs', icon: '🔍' },
        { path: '/jobseeker/interviews', label: 'Interviews', icon: '🎥' },
        { path: '/jobseeker/messages', label: 'Messages', icon: '💬' },
        { path: '/jobseeker/settings', label: 'Settings', icon: '⚙️' },
    ];

    return (
        <>
            <div className="top-nav">
                {/* Hamburger Menu Button - visible on mobile */}
                <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12h18M3 6h18M3 18h18" />
                    </svg>
                </button>

                <div className="top-nav-left">
                    <div className="search-bar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input type="text" placeholder="Search..." />
                    </div>
                </div>

                <div className="top-nav-right">
                    <NotificationCenter />
                    <MessageButton />
                    <div className="user-profile-btn" onClick={() => navigate(profilePath)}>
                        <div className="user-avatar-small">
                            {user?.profile?.photo ? (
                                <img src={user.profile.photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                    <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                    <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                                </svg>
                            )}
                        </div>
                        <span className="user-name">{userName}</span>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {menuOpen && (
                <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
                    <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
                        <div className="mobile-menu-header">
                            <h3>Menu</h3>
                            <button onClick={() => setMenuOpen(false)}>×</button>
                        </div>
                        <nav className="mobile-menu-nav">
                            {navItems.map((item) => (
                                <NavLink key={item.path} to={item.path} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="nav-icon">{item.icon}</span>
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                </div>
            )}
        </>
    );
};

export default TopNav;

