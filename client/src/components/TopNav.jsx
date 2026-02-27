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
    const searchRef = React.useRef(null);
    const userId = localStorage.getItem('userId');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    useEffect(() => {
        fetchUser();
        const handleUpdate = () => fetchUser();
        window.addEventListener('profile-updated', handleUpdate);

        // Click outside listener
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('profile-updated', handleUpdate);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await api.get(`/users/search?q=${searchQuery}`);
                setSearchResults(response.data || []);
                setShowSearchResults(true);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

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

    const handleResultClick = (resultId) => {
        navigate(`/profile/${resultId}`);
        setShowSearchResults(false);
        setSearchQuery('');
    };

    // Determine user role from current path
    const isRecruiter = location.pathname.startsWith('/recruiter');
    const profilePath = isRecruiter ? '/recruiter/profile' : '/jobseeker/profile';
    const userName = user?.profile?.name || 'User';

    return (
        <>
            <div className="top-nav">
                <div className="top-nav-logo-mobile" onClick={() => navigate('/')}>
                    <img src="/logo.png" alt="Froscel" />
                </div>

                <div className="top-nav-left">
                    <div className="search-bar-wrapper" ref={searchRef}>
                        <div className="search-bar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search people..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                            />
                            {isSearching && (
                                <div className="search-spinner"></div>
                            )}
                        </div>

                        {showSearchResults && (
                            <div className="search-results-dropdown">
                                {searchResults.length > 0 ? (
                                    searchResults.map((result) => (
                                        <div
                                            key={result._id}
                                            className="search-result-item"
                                            onClick={() => handleResultClick(result._id)}
                                        >
                                            <div className="result-avatar">
                                                {result.profile?.photo ? (
                                                    <img src={result.profile.photo} alt={result.profile.name} />
                                                ) : (
                                                    <div className="avatar-placeholder">
                                                        {result.profile?.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="result-info">
                                                <div className="result-name">
                                                    {result.profile?.name}
                                                    {result.role === 'recruiter' && (
                                                        <span className="recruiter-badge">RECRUITER</span>
                                                    )}
                                                </div>
                                                <div className="result-headline">
                                                    {result.profile?.headline || (result.role === 'recruiter' ? result.recruiterProfile?.companyName : 'Candidate')}
                                                </div>
                                            </div>
                                            {result.role === 'jobseeker' && result.aiTalentPassport?.talentScore > 0 && (
                                                <div className="result-atp">
                                                    <span className="atp-score">{result.aiTalentPassport.talentScore} ATP</span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-results">No people found with "{searchQuery}"</div>
                                )}
                            </div>
                        )}
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
                                <button
                                    className="menu-item"
                                    onClick={() => {
                                        navigate(isRecruiter ? '/recruiter/settings' : '/jobseeker/settings');
                                        setShowDropdown(false);
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                                    </svg>
                                    <span>Settings</span>
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

