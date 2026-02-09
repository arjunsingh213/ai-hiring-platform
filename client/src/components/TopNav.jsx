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
                    <div className="profile-dropdown-wrapper" onClick={() => navigate(profilePath)}>
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
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>
                            <span className="user-role">{isRecruiter ? 'HIRING MANAGER' : 'CANDIDATE'}</span>
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
};

export default TopNav;

