import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, Link } from 'react-router-dom';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import InterviewQueue from './InterviewQueue';
import InterviewDetail from './InterviewDetail';
import AuditLogs from './AuditLogs';
import UserControl from './UserControl';
import AdminAdmins from './ManageAdmins';
import AdminFeedbacks from './AdminFeedbacks';
import AIUsageDashboard from './AIUsageDashboard';
import AdminChallengeMonitoring from './AdminChallengeMonitoring';
import AdminProjectReview from './AdminProjectReview';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [adminInfo, setAdminInfo] = useState(null);
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
        setLoading(false);
    }, [navigate]);

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
                    <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
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
                    </NavLink>

                    <NavLink to="/admin/flagged" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                            <line x1="4" y1="22" x2="4" y2="15" />
                        </svg>
                        <span>Flagged Reviews</span>
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>Audit Logs</span>
                    </NavLink>
                    <NavLink to="/admin/feedbacks" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>Feedbacks</span>
                    </NavLink>
                    <NavLink to="/admin/ai-usage" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                        <span>AI Token Usage</span>
                    </NavLink>
                    <NavLink to="/admin/challenges" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span>Challenges Control</span>
                    </NavLink>
                    <NavLink to="/admin/projects" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.29 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.527.105-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405 1.02 0 2.04.135 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        <span>Project Review</span>
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
                    <Route index element={<DashboardHome />} />
                    <Route path="interviews" element={<InterviewQueue />} />
                    <Route path="interviews/:id" element={<InterviewDetail />} />
                    <Route path="flagged" element={<InterviewQueue flaggedOnly />} />
                    <Route path="users" element={<UserControl />} />
                    <Route path="audit-logs" element={<AuditLogs />} />
                    <Route path="admins" element={<AdminAdmins />} />
                    <Route path="feedbacks" element={<AdminFeedbacks />} />
                    <Route path="ai-usage" element={<AIUsageDashboard />} />
                    <Route path="challenges" element={<AdminChallengeMonitoring />} />
                    <Route path="projects" element={<AdminProjectReview />} />
                </Routes>
            </main>
        </div>
    );
};

// Enhanced Dashboard Home Component
const DashboardHome = () => {
    const [stats, setStats] = useState(null);
    const [trends, setTrends] = useState(null);
    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setError(null);
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                setError('No auth token found');
                setLoading(false);
                return;
            }
            const headers = { 'Authorization': `Bearer ${token}` };

            console.log('Fetching dashboard data from:', API_URL);

            const [statsRes, trendsRes, activityRes] = await Promise.all([
                fetch(`${API_URL}/admin/dashboard/stats`, { headers }),
                fetch(`${API_URL}/admin/dashboard/trends`, { headers }),
                fetch(`${API_URL}/admin/dashboard/activity`, { headers })
            ]);

            console.log('Response statuses:', statsRes.status, trendsRes.status, activityRes.status);

            const [statsData, trendsData, activityData] = await Promise.all([
                statsRes.json(),
                trendsRes.json(),
                activityRes.json()
            ]);

            console.log('Dashboard data received:', { stats: statsData, trends: trendsData, activity: activityData });

            if (statsData.success) setStats(statsData.data);
            if (trendsData.success) setTrends(trendsData.data);
            if (activityData.success) setActivity(activityData.data);

            if (!statsData.success && !trendsData.success && !activityData.success) {
                setError('Failed to load dashboard data');
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setError(err.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="admin-loading-spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <h3>Error Loading Dashboard</h3>
                <p>{error}</p>
                <button className="admin-refresh-btn" onClick={fetchDashboardData} style={{ marginTop: '16px' }}>
                    Try Again
                </button>
            </div>
        );
    }

    const pieData = stats?.interviews ? [
        { name: 'Approved', value: stats.interviews.approved || 0, color: '#10b981' },
        { name: 'Pending', value: stats.interviews.pending || 0, color: '#f59e0b' },
        { name: 'Rejected', value: stats.interviews.rejected || 0, color: '#ef4444' }
    ].filter(d => d.value > 0) : [];

    return (
        <>
            <div className="admin-page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Real-time overview of platform metrics and activity</p>
                </div>
                <button className="admin-refresh-btn" onClick={fetchDashboardData}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="admin-stats-grid">
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
                        <h3>{stats?.users?.total || 0}</h3>
                        <p>Total Users</p>
                        <span className={`stat-trend ${stats?.users?.growthPercent >= 0 ? 'positive' : 'negative'}`}>
                            {stats?.users?.growthPercent >= 0 ? '↑' : '↓'} {Math.abs(stats?.users?.growthPercent || 0)}% this week
                        </span>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-icon pending">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div className="admin-stat-content">
                        <h3>{stats?.interviews?.pending || 0}</h3>
                        <p>Pending Reviews</p>
                        <span className="stat-detail">{stats?.interviews?.todayCount || 0} submitted today</span>
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
                        <h3>{stats?.interviews?.approvalRate || 0}%</h3>
                        <p>Approval Rate</p>
                        <span className="stat-detail">{stats?.interviews?.approved || 0} approved total</span>
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
                        <h3>{stats?.flags?.critical || 0}</h3>
                        <p>Critical Flags</p>
                        <span className="stat-detail">{stats?.flags?.high || 0} high severity</span>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-icon score">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    </div>
                    <div className="admin-stat-content">
                        <h3>{stats?.interviews?.avgScore || 0}</h3>
                        <p>Avg Interview Score</p>
                        <span className="stat-detail">Out of 100</span>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-icon active">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <div className="admin-stat-content">
                        <h3>{stats?.users?.activeThisWeek || 0}</h3>
                        <p>Active This Week</p>
                        <span className="stat-detail">{stats?.users?.jobseekers || 0} jobseekers, {stats?.users?.recruiters || 0} recruiters</span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="admin-charts-grid">
                <div className="admin-chart-card">
                    <h3>Interview Submissions (30 Days)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={trends?.interviews?.slice(-14) || []}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" tickFormatter={formatDate} stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                labelStyle={{ color: '#f1f5f9' }}
                            />
                            <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#colorTotal)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="admin-chart-card">
                    <h3>Review Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="admin-chart-card full-width">
                    <h3>User Signups (30 Days)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={trends?.users?.slice(-14) || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" tickFormatter={formatDate} stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                labelStyle={{ color: '#f1f5f9' }}
                            />
                            <Legend />
                            <Bar dataKey="jobseekers" name="Jobseekers" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="recruiters" name="Recruiters" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Quick Actions & Activity */}
            <div className="admin-activity-grid">
                <div className="admin-quick-actions">
                    <h3>Quick Actions</h3>
                    <div className="quick-actions-grid">
                        <Link to="/admin/interviews" className="quick-action-card">
                            <div className="quick-action-icon pending">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                                    <rect x="9" y="3" width="6" height="4" rx="2" />
                                </svg>
                            </div>
                            <div>
                                <h4>Review Interviews</h4>
                                <span>{stats?.interviews?.pending || 0} pending</span>
                            </div>
                        </Link>

                        <Link to="/admin/flagged" className="quick-action-card">
                            <div className="quick-action-icon flagged">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                    <line x1="4" y1="22" x2="4" y2="15" />
                                </svg>
                            </div>
                            <div>
                                <h4>Critical Flags</h4>
                                <span>{stats?.flags?.critical || 0} urgent</span>
                            </div>
                        </Link>

                        <Link to="/admin/users" className="quick-action-card">
                            <div className="quick-action-icon users">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                </svg>
                            </div>
                            <div>
                                <h4>Manage Users</h4>
                                <span>{stats?.users?.total || 0} total</span>
                            </div>
                        </Link>

                        <Link to="/admin/audit-logs" className="quick-action-card">
                            <div className="quick-action-icon logs">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                            </div>
                            <div>
                                <h4>View Audit Logs</h4>
                                <span>All activity</span>
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="admin-activity-feed">
                    <h3>Recent Activity</h3>
                    <div className="activity-list">
                        {activity?.recentActions?.slice(0, 8).map((action, idx) => (
                            <div key={idx} className="activity-item">
                                <div className={`activity-icon ${action.action.includes('approve') ? 'success' : action.action.includes('reject') ? 'danger' : 'info'}`}>
                                    {action.action.includes('login') ? '🔑' :
                                        action.action.includes('approve') ? '✓' :
                                            action.action.includes('reject') ? '✗' :
                                                action.action.includes('review') ? '👁' : '📋'}
                                </div>
                                <div className="activity-content">
                                    <p><strong>{action.admin}</strong> {action.action.replace(/_/g, ' ')}</p>
                                    <span>{formatTimeAgo(action.timestamp)}</span>
                                </div>
                            </div>
                        ))}
                        {(!activity?.recentActions || activity.recentActions.length === 0) && (
                            <div className="activity-empty">
                                <p>No recent activity</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="admin-pending-interviews">
                    <h3>Awaiting Review</h3>
                    <div className="pending-list">
                        {activity?.recentInterviews?.slice(0, 5).map((interview, idx) => (
                            <div
                                key={idx}
                                className="pending-item"
                                onClick={() => navigate(`/admin/interviews/${interview.id}`)}
                            >
                                <div className={`priority-badge ${interview.priority}`}>
                                    {interview.priority}
                                </div>
                                <div className="pending-content">
                                    <h4>{interview.candidate}</h4>
                                    <span>{interview.type} interview • Score: {interview.score || 'N/A'}</span>
                                </div>
                                <span className="pending-time">{formatTimeAgo(interview.submittedAt)}</span>
                            </div>
                        ))}
                        {(!activity?.recentInterviews || activity.recentInterviews.length === 0) && (
                            <div className="activity-empty">
                                <p>No pending interviews</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;
