import React from 'react';
import { NavLink } from 'react-router-dom';
import '../jobseeker/Sidebar.css';
import froscelLogo from '../../assets/froscel-logo.png';

const ICONS = {
    home: <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    jobs: <><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M3 10H21" stroke="currentColor" strokeWidth="2" /><path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
    pipeline: <><path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" /><path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" /></>,
    users: <><path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" /><path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" /></>,
    applications: <><path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 18V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M9 15L12 12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" /></>,
    chart: <><path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18 9L13 14L9 10L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
    message: <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" />,
    settings: <path d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    trophy: <><path d="M6 9H4.5C3.67 9 3 8.33 3 7.5V4.5C3 3.67 3.67 3 4.5 3H6M18 9H19.5C20.33 9 21 8.33 21 7.5V4.5C21 3.67 20.33 3 19.5 3H18M6 3H18V10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10V3Z" stroke="currentColor" strokeWidth="2" /><path d="M12 16V21M8 21H16" stroke="currentColor" strokeWidth="2" /></>,
    logout: <><path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>
};

const RecruiterSidebar = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(localStorage.getItem('sidebar-collapsed') === 'true');

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', newState);
        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: newState }));
    };

    const navItems = [
        { path: '/recruiter/home', icon: 'home', label: 'Home' },
        { path: '/recruiter/my-jobs', icon: 'jobs', label: 'My Jobs' },
        { path: '/recruiter/applications', icon: 'pipeline', label: 'Talent Pipeline' },
        { path: '/recruiter/candidates', icon: 'trophy', label: 'Leaderboard' },
        { path: '/recruiter/post-job', icon: 'briefcase', label: 'Post Job' },
        { path: '/recruiter/analytics', icon: 'chart', label: 'Analytics' },
        { path: '/recruiter/messages', icon: 'message', label: 'Messages' },
        { path: '/recruiter/settings', icon: 'settings', label: 'Settings' },
        { path: '/logout', icon: 'logout', label: 'Logout', isLogout: true },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTimestamp');
        window.location.href = '/';
    };

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <img src={froscelLogo} alt="Froscel" className="sidebar-logo" />
                {!isCollapsed && <h2>Froscel</h2>}
            </div>
            <nav className="sidebar-nav">
                {navItems.map((item) => {
                    const icon = ICONS[item.icon];
                    if (item.isLogout) {
                        return (
                            <button
                                key={item.path}
                                className={`nav-item logout-btn-sidebar ${isCollapsed ? 'collapsed' : ''}`}
                                onClick={handleLogout}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    width: '100%',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    padding: isCollapsed ? '12px' : '10px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                                    gap: isCollapsed ? '0' : '10px',
                                    color: '#ef4444',
                                    transition: 'all 0.2s ease'
                                }}
                                title={isCollapsed ? item.label : ''}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    {icon}
                                </svg>
                                {!isCollapsed && <span>{item.label}</span>}
                            </button>
                        );
                    }
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            title={isCollapsed ? item.label : ''}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                {icon}
                            </svg>
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <button className="sidebar-toggle" onClick={toggleCollapse}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </button>
        </aside>
    );
};

export default RecruiterSidebar;
