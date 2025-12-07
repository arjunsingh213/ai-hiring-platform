import React from 'react';
import { useNavigate } from 'react-router-dom';
import './UserProfileLink.css';

const UserProfileLink = ({ userId, name, photo, showAvatar = false, className = '' }) => {
    const navigate = useNavigate();

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/profile/${userId}`);
    };

    return (
        <div className={`user-profile-link ${className}`} onClick={handleClick}>
            {showAvatar && photo && (
                <img src={photo} alt={name} className="user-profile-link-avatar" />
            )}
            {showAvatar && !photo && (
                <div className="user-profile-link-avatar-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                        <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                        <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                    </svg>
                </div>
            )}
            <span className="user-profile-link-name">{name || 'User'}</span>
        </div>
    );
};

export default UserProfileLink;
