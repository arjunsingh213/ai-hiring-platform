import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import InterviewQueue from './InterviewQueue';
import InterviewDetail from './InterviewDetail';
import AuditLogs from './AuditLogs';
import UserControl from './UserControl';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [adminInfo, setAdminInfo] = useState(null);
    const [stats, setStats] = useState({ pending: 0, approved: 0, flagged: 0, users: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        const info = localStorage.getItem('adminInfo');

        if (!token) {
            navigate('/admin/login');
            return;
        }

        if (info) {
            setAdminInfo(JSON.parse(info));
        }

        fetchStats();
    }, [navigate]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/interviews/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                handleLogout();
                return;
            }

            const data = await response.json();
            if (data.success) {
                const statusStats = data.data.byStatus || [];
                const pending = statusStats.find(s => s._id === 'pending_review')?.count || 0;
                const approved = statusStats.find(s => s._id === 'approved')?.count || 0;
                const flagged = data.data.byPriority?.find(p => p._id === 'critical')?.count || 0;

                setStats({ pending, approved, flagged, users: 0 });
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            await fetch(`${API_URL}/admin/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        navigate('/admin/login');
    };

    const getInitials = (name) => {
        if (!name) return 'A';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    if (loading) {
        return (
            <div className="admin-dashboard">
                <div className="admin-loading">
                    <div className="admin-loading-spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <div className="admin-sidebar-logo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <div>
                        <h2>Admin Portal</h2>
                        <span>AI Hiring Platform</span>
                    </div>
                </div>

                <nav className="admin-nav">
                    <NavLink to="/admin/dashboard" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                        </svg>
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink to="/admin/interviews" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span>Interview Queue</span>
                        {stats.pending > 0 && <span className="badge">{stats.pending}</span>}
                    </NavLink>

                    <NavLink to="/admin/flagged" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                            <line x1="4" y1="22" x2="4" y2="15" />
                        </svg>
                        <span>Flagged Reviews</span>
                        {stats.flagged > 0 && <span className="badge">{stats.flagged}</span>}
                    </NavLink>

                    <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
                        </svg>
                        <span>User Control</span>
                    </NavLink>

                    <NavLink to="/admin/audit-logs" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                        <span>Audit Logs</span>
                    </NavLink>

                    {adminInfo?.role === 'super_admin' && (
                        <NavLink to="/admin/admins" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                            </svg>
                            <span>Manage Admins</span>
                        </NavLink>
                    )}
                </nav>

                <div className="admin-sidebar-footer">
                    <div className="admin-user-info">
                        <div className="admin-user-avatar">
                            {getInitials(adminInfo?.name)}
                        </div>
                        <div className="admin-user-details">
                            <h4>{adminInfo?.name || 'Admin'}</h4>
                            <span>{adminInfo?.role?.replace('_', ' ')}</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="admin-logout-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <Routes>
                    <Route index element={<DashboardHome stats={stats} onRefresh={fetchStats} />} />
                    <Route path="interviews" element={<InterviewQueue />} />
                    <Route path="interviews/:id" element={<InterviewDetail />} />
                    <Route path="flagged" element={<InterviewQueue flaggedOnly />} />
                    <Route path="users" element={<UserControl />} />
                    <Route path="audit-logs" element={<AuditLogs />} />
                </Routes>
            </main>
        </div>
    );
};

// Dashboard Home Component
const DashboardHome = ({ stats, onRefresh }) => {
    return (
        <>
            <div className="admin-page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Overview of interview reviews and platform activity</p>
                </div>
                <button className="admin-refresh-btn" onClick={onRefresh}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                    Refresh
                </button>
            </div>

            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="admin-stat-icon pending">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div className="admin-stat-content">
                        <h3>{stats.pending}</h3>
                        <p>Pending Reviews</p>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-icon approved">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <div className="admin-stat-content">
                        <h3>{stats.approved}</h3>
                        <p>Approved Today</p>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-icon flagged">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>
                    <div className="admin-stat-content">
                        <h3>{stats.flagged}</h3>
                        <p>Critical Flags</p>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-icon users">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87" />
                            <path d="M16 3.13a4 4 0 010 7.75" />
                        </svg>
                    </div>
                    <div className="admin-stat-content">
                        <h3>{stats.users}</h3>
                        <p>Active Users</p>
                    </div>
                </div>
            </div>

            <div className="admin-table-container">
                <div className="admin-table-header">
                    <h2>Quick Actions</h2>
                </div>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                        Select a section from the sidebar to begin reviewing interviews, managing users, or viewing audit logs.
                    </p>
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;
