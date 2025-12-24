import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AuditLogs = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({ action: '', targetType: '' });

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            let url = `${API_URL}/admin/audit-logs?page=${page}&limit=25`;

            if (filters.action) url += `&action=${filters.action}`;
            if (filters.targetType) url += `&targetType=${filters.targetType}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                navigate('/admin/login');
                return;
            }

            const data = await response.json();
            if (data.success) {
                setLogs(data.data.logs);
                setTotalPages(data.data.pagination.pages);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getActionColor = (action) => {
        if (action.includes('approve')) return '#22c55e';
        if (action.includes('reject') || action.includes('suspend') || action.includes('cheating')) return '#ef4444';
        if (action.includes('adjust') || action.includes('reattempt')) return '#f59e0b';
        if (action.includes('login') || action.includes('logout')) return '#8b5cf6';
        return '#3b82f6';
    };

    if (loading && logs.length === 0) {
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
                    <h1>Audit Logs</h1>
                    <p>Complete history of admin actions</p>
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
                        <option value="approve_interview">Approve Interview</option>
                        <option value="reject_interview">Reject Interview</option>
                        <option value="adjust_score">Adjust Score</option>
                        <option value="allow_reattempt">Allow Reattempt</option>
                        <option value="confirm_cheating">Confirm Cheating</option>
                        <option value="suspend_user">Suspend User</option>
                        <option value="unsuspend_user">Unsuspend User</option>
                        <option value="admin_login">Admin Login</option>
                    </select>

                    <select
                        value={filters.targetType}
                        onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
                        style={{
                            padding: '8px 12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#94a3b8',
                            fontSize: '0.85rem'
                        }}
                    >
                        <option value="">All Types</option>
                        <option value="interview">Interview</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="system">System</option>
                    </select>

                    <button className="admin-refresh-btn" onClick={fetchLogs}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="admin-table-container">
                {logs.length === 0 ? (
                    <div className="admin-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <h3>No Audit Logs</h3>
                        <p>No logs match the current filter</p>
                    </div>
                ) : (
                    <>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Admin</th>
                                    <th>Action</th>
                                    <th>Target</th>
                                    <th>Details</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log._id}>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td>
                                            <div>
                                                <strong style={{ color: '#f8fafc' }}>
                                                    {log.adminId?.name || 'Unknown'}
                                                </strong>
                                                <br />
                                                <small style={{ color: '#64748b' }}>
                                                    {log.adminEmail}
                                                </small>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                color: getActionColor(log.action),
                                                fontWeight: 500
                                            }}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                textTransform: 'capitalize',
                                                color: '#94a3b8'
                                            }}>
                                                {log.targetType}
                                            </span>
                                            {log.targetEmail && (
                                                <small style={{ display: 'block', color: '#64748b' }}>
                                                    {log.targetEmail}
                                                </small>
                                            )}
                                        </td>
                                        <td style={{ maxWidth: '250px' }}>
                                            {log.reason && (
                                                <span style={{
                                                    color: '#e2e8f0',
                                                    fontSize: '0.85rem',
                                                    display: 'block',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {log.reason}
                                                </span>
                                            )}
                                            {log.metadata?.adjustedScore && (
                                                <small style={{ color: '#64748b' }}>
                                                    Score: {log.metadata.interviewScore} → {log.metadata.adjustedScore}
                                                </small>
                                            )}
                                        </td>
                                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                            {log.ipAddress || '-'}
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

export default AuditLogs;
