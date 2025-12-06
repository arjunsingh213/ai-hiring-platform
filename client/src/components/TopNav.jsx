import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './TopNav.css';

const TopNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userName = 'John Doe'; // This should come from user context

    // Determine user role from current path
    const isRecruiter = location.pathname.startsWith('/recruiter');
    const profilePath = isRecruiter ? '/recruiter/settings' : '/jobseeker/profile';

    return (
        <div className="top-nav">
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
                <button className="icon-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" />
                        <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span className="notification-badge">3</span>
                </button>

                <button className="icon-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span className="notification-badge">5</span>
                </button>

                <div className="user-profile-btn" onClick={() => navigate(profilePath)}>
                    <div className="user-avatar-small">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                            <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                            <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                        </svg>
                    </div>
                    <span className="user-name">{userName}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default TopNav;
