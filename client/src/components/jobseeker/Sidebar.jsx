import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import froscelLogo from '../../assets/froscel-logo.png';

const ICONS = {
    home: <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    user: <><path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" /></>,
    trophy: <><path d="M6 9H4.5C3.67 9 3 8.33 3 7.5V4.5C3 3.67 3.67 3 4.5 3H6M18 9H19.5C20.33 9 21 8.33 21 7.5V4.5C21 3.67 20.33 3 19.5 3H18M6 3H18V10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10V3Z" stroke="currentColor" strokeWidth="2" /><path d="M12 16V21M8 21H16" stroke="currentColor" strokeWidth="2" /></>,
    message: <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    video: <><path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
    settings: <path d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
};

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(localStorage.getItem('sidebar-collapsed') === 'true');

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', newState);
        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: newState }));
    };

    const navItems = [
        { path: '/jobseeker/home', icon: 'home', label: 'Home' },
        { path: '/jobseeker/profile', icon: 'user', label: 'Profile' },
        { path: '/jobseeker/candidates', icon: 'trophy', label: 'Leaderboard' },
        { path: '/jobseeker/messages', icon: 'message', label: 'Messages' },
        { path: '/jobseeker/interviews', icon: 'video', label: 'Interviews' },
        { path: '/jobseeker/jobs', icon: 'briefcase', label: 'Jobs' },
        { path: '/jobseeker/settings', icon: 'settings', label: 'Settings' },
    ];

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <img src={froscelLogo} alt="Froscel" className="sidebar-logo" />
                {!isCollapsed && <h2>Froscel</h2>}
            </div>
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        title={isCollapsed ? item.label : ''}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            {ICONS[item.icon]}
                        </svg>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <button className="sidebar-toggle" onClick={toggleCollapse}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </button>
        </aside>
    );
};

export default Sidebar;
