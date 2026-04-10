import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AppActivity = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('users'); // 'users' or 'stream'
    const [selectedUser, setSelectedUser] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({ action: '', feature: '' });

    useEffect(() => {
        if (viewMode === 'stream' || selectedUser) {
            fetchActivities();
        } else {
            fetchActiveUsers();
        }
    }, [page, filters, viewMode, selectedUser]);

    const fetchActiveUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/active-users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setActiveUsers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch active users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            let url = `${API_URL}/admin/user-activities?page=${page}&limit=25`;

            if (filters.action) url += `&action=${filters.action}`;
            if (filters.feature) url += `&feature=${filters.feature}`;
            if (selectedUser) url += `&userId=${selectedUser._id}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                navigate('/admin/login');
                return;
            }

            const data = await response.json();
            if (data.success) {
                setActivities(data.data.activities);
                setTotalPages(data.data.pagination.pages);
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString, duration) => {
        const d = new Date(dateString);
        let str = d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        if (duration) {
            str += ` (${duration}s)`;
        }
        return str;
    };

    const formatRelativeTime = (dateString) => {
        const now = new Date();
        const diff = Math.floor((now - new Date(dateString)) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return new Date(dateString).toLocaleDateString();
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'LOGIN': return '#22c55e';
            case 'LOGOUT': return '#ef4444';
            case 'PAGE_VIEW': return '#3b82f6';
            case 'START_INTERVIEW':
            case 'SUBMIT_ANSWER':
            case 'COMPLETE_INTERVIEW': return '#f59e0b';
            case 'EMAIL_CAMPAIGN_VISIT': return '#a855f7';
            default: return '#94a3b8';
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'LOGIN': return '🚪';
            case 'LOGOUT': return '👋';
            case 'PAGE_VIEW': return '👁️';
            case 'START_INTERVIEW': return '🎙️';
            case 'SUBMIT_ANSWER': return '💬';
            case 'COMPLETE_INTERVIEW': return '✅';
            case 'UPLOAD_RESUME': return '📄';
            case 'EMAIL_CAMPAIGN_VISIT': return '📧';
            default: return '📌';
        }
    };

    if (loading && activities.length === 0) {
        return (
            <div className="admin-loading">
                <div className="admin-loading-spinner"></div>
            </div>
        );
    }

    return (
        <>
            <div className="admin-page-header">
                <div>
                    <h1>{selectedUser ? `Activity for ${selectedUser.user?.profile?.name || 'User'}` : 'App Activity Tracker'}</h1>
                    <p>{selectedUser ? `Viewing detailed interactions for ${selectedUser.user?.email}` : 'Monitor user interactions across the platform.'}</p>
                </div>
                
                <div className="admin-table-actions" style={{ gap: '12px' }}>
                    {!selectedUser && (
                        <div className="view-mode-toggle">
                            <button 
                                className={viewMode === 'users' ? 'active' : ''} 
                                onClick={() => { setViewMode('users'); setPage(1); }}
                            >
                                Grouped by User
                            </button>
                            <button 
                                className={viewMode === 'stream' ? 'active' : ''} 
                                onClick={() => { setViewMode('stream'); setPage(1); }}
                            >
                                Live Stream
                            </button>
                        </div>
                    )}

                    {selectedUser && (
                        <button 
                            className="admin-back-btn" 
                            onClick={() => setSelectedUser(null)}
                            style={{
                                padding: '8px 16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#e2e8f0',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            ← Back to Users
                        </button>
                    )}

                    {(viewMode === 'stream' || selectedUser) && (
                        <select
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            className="activity-filter-select"
                        >
                            <option value="">All Actions</option>
                            <option value="LOGIN">Logins</option>
                            <option value="EMAIL_CAMPAIGN_VISIT">Email Visits</option>
                            <option value="PAGE_VIEW">Page Views</option>
                            <option value="START_INTERVIEW">Interviews Started</option>
                            <option value="COMPLETE_INTERVIEW">Interviews Completed</option>
                            <option value="UPLOAD_RESUME">Resumes Uploaded</option>
                        </select>
                    )}

                    <button className="admin-refresh-btn" onClick={viewMode === 'users' && !selectedUser ? fetchActiveUsers : fetchActivities}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="admin-table-container" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                {viewMode === 'users' && !selectedUser ? (
                    <div className="active-users-grid">
                        {activeUsers.length === 0 ? (
                            <div className="admin-empty-state">
                                <span style={{ fontSize: '3rem', marginBottom: '10px', display: 'block' }}>👥</span>
                                <h3>No Active Users</h3>
                                <p>We couldn't find any recent user activity</p>
                            </div>
                        ) : (
                            activeUsers.map((u) => (
                                <div 
                                    key={u._id} 
                                    className="active-user-card"
                                    onClick={() => setSelectedUser(u)}
                                >
                                    <div className="active-user-avatar">
                                        {(u.user?.profile?.name || u.user?.email || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="active-user-info">
                                        <h3>{u.user?.profile?.name || 'Unknown User'}</h3>
                                        <p>{u.user?.email}</p>
                                        <div className="active-user-badge">
                                            {u.user?.role}
                                        </div>
                                    </div>
                                    <div className="active-user-stats">
                                        <div className="stat-item">
                                            <span className="stat-label">Actions</span>
                                            <span className="stat-value">{u.totalActions}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Last Seen</span>
                                            <span className="stat-value">{formatRelativeTime(u.lastActive)}</span>
                                        </div>
                                    </div>
                                    <div className="active-user-footer">
                                        <div className="last-action">
                                            <span>{getActionIcon(u.lastAction)}</span>
                                            <strong>{u.lastAction.replace(/_/g, ' ')}</strong>
                                            <em>on {u.lastFeature}</em>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="activity-details-pane" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}>
                        {activities.length === 0 ? (
                            <div className="admin-empty-state">
                                <span style={{ fontSize: '3rem', marginBottom: '10px', display: 'block' }}>📭</span>
                                <h3>No Activity Found</h3>
                                <p>This user hasn't performed any actions matching filters</p>
                            </div>
                        ) : (
                            <>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            {!selectedUser && <th>User</th>}
                                            <th>Action</th>
                                            <th>Feature/Page</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activities.map((activity) => (
                                            <tr key={activity._id}>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    {formatDate(activity.timestamp, activity.duration)}
                                                </td>
                                                {!selectedUser && (
                                                    <td>
                                                        {activity.userId ? (
                                                            <div>
                                                                <strong style={{ color: '#f8fafc' }}>
                                                                    {activity.userId.name || 'Unknown'}
                                                                </strong>
                                                                <br />
                                                                <small style={{ color: '#64748b' }}>
                                                                    {activity.userId.email}
                                                                </small>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#64748b' }}>System</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span>{getActionIcon(activity.action)}</span>
                                                        <span style={{ color: getActionColor(activity.action), fontWeight: 600 }}>
                                                            {activity.action.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{activity.feature}</span>
                                                    {activity.page && (
                                                        <small style={{ color: '#64748b', display: 'block' }}>URL: {activity.page}</small>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {totalPages > 1 && (
                                    <div className="admin-pagination">
                                        <button
                                            className="admin-pagination-btn"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            Previous
                                        </button>
                                        <span style={{ color: '#94a3b8' }}>Page {page} of {totalPages}</span>
                                        <button
                                            className="admin-pagination-btn"
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default AppActivity;
