import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import api from '../services/api';
import NotificationCenter from './NotificationCenter';
import MessageButton from './MessageButton';
import ThemeToggle from './ThemeToggle';
import './TopNav.css';

const TopNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = React.useRef(null);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchUser();
        const handleUpdate = () => fetchUser();
        window.addEventListener('profile-updated', handleUpdate);

        // Click outside listener
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('profile-updated', handleUpdate);
            document.removeEventListener('mousedown', handleClickOutside);
        };
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTimestamp');
        window.location.href = '/';
    };

    // Determine user role from current path
    const isRecruiter = location.pathname.startsWith('/recruiter');
    const profilePath = isRecruiter ? '/recruiter/profile' : '/jobseeker/profile';
    const userName = user?.profile?.name || 'User';

    return (
        <>
            <div className="top-nav">

                <div className="top-nav-left">
                    <div className="search-bar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input type="text" placeholder="Search candidates, jobs, or interviews..." />
                    </div>
                </div>

                <div className="top-nav-right">
                    <ThemeToggle />
                    <NotificationCenter />
                    <div className="profile-dropdown-wrapper" ref={dropdownRef}>
                        <div
                            className={`profile-trigger ${showDropdown ? 'active' : ''}`}
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            <div className="profile-avatar">
                                {user?.profile?.photo ? (
                                    <img src={user.profile.photo} alt="Profile" />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {userName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="profile-info">
                                <div className="profile-name-group">
                                    <span className="user-name">{userName}</span>
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                                    >
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </div>
                                <span className="user-role">{isRecruiter ? 'HIRING MANAGER' : 'CANDIDATE'}</span>
                            </div>
                        </div>

                        {showDropdown && (
                            <div className="profile-menu">
                                <div className="menu-header">
                                    <span className="menu-title">Account</span>
                                </div>
                                <button
                                    className="menu-item"
                                    onClick={() => {
                                        navigate(profilePath);
                                        setShowDropdown(false);
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <span>View Profile</span>
                                </button>
                                <div className="menu-divider"></div>
                                <button className="menu-item logout" onClick={handleLogout}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                                    </svg>
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </>
    );
};

export default TopNav;

