import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AppActivity = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({ action: '', feature: '' });

    useEffect(() => {
        fetchActivities();
    }, [page, filters]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            let url = `${API_URL}/admin/user-activities?page=${page}&limit=25`;

            if (filters.action) url += `&action=${filters.action}`;
            if (filters.feature) url += `&feature=${filters.feature}`;

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
                    <h1>App Activity Tracker</h1>
                    <p>Live stream of user interactions across the platform.</p>
                </div>
                <div className="admin-table-actions">
                    <select
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        style={{
                            padding: '8px 12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#94a3b8',
                            fontSize: '0.85rem'
                        }}
                    >
                        <option value="">All Actions</option>
                        <option value="LOGIN">Logins</option>
                        <option value="EMAIL_CAMPAIGN_VISIT">Email Visits</option>
                        <option value="PAGE_VIEW">Page Views</option>
                        <option value="START_INTERVIEW">Interviews Started</option>
                        <option value="COMPLETE_INTERVIEW">Interviews Completed</option>
                        <option value="UPLOAD_RESUME">Resumes Uploaded</option>
                    </select>

                    <button className="admin-refresh-btn" onClick={fetchActivities}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="admin-table-container">
                {activities.length === 0 ? (
                    <div className="admin-empty-state">
                        <span style={{ fontSize: '3rem', marginBottom: '10px', display: 'block' }}>📭</span>
                        <h3>No User Activity</h3>
                        <p>No logs match the current filter</p>
                    </div>
                ) : (
                    <>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>User</th>
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
                                        <td>
                                            {activity.userId ? (
                                                <div>
                                                    <strong style={{ color: '#f8fafc' }}>
                                                        {activity.userId.name || 'Unknown'}
                                                    </strong>
                                                    <br />
                                                    <small style={{ color: '#64748b' }}>
                                                        {activity.userId.email} ({activity.userId.role})
                                                    </small>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#64748b' }}>Deleted/Unknown User</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{getActionIcon(activity.action)}</span>
                                                <span style={{
                                                    color: getActionColor(activity.action),
                                                    fontWeight: 600,
                                                    fontSize: '0.9rem'
                                                }}>
                                                    {activity.action.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                color: '#e2e8f0',
                                                fontWeight: 500,
                                                display: 'block'
                                            }}>
                                                {activity.feature}
                                            </span>
                                            {activity.metadata?.campaignType && (
                                                <small style={{ color: '#a855f7', display: 'block', marginTop: '4px' }}>
                                                    Campaign: {activity.metadata.campaignType}
                                                </small>
                                            )}
                                            {activity.page && (
                                                <small style={{ color: '#64748b', display: 'block', marginTop: '2px' }}>
                                                    URL: {activity.page}
                                                </small>
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
                                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                    Page {page} of {totalPages}
                                </span>
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
        </>
    );
};

export default AppActivity;
