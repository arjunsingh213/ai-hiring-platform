import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminApplications.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminApplications = () => {
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [filter, setFilter] = useState('applied');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [showModal, setShowModal] = useState(null); // { type: 'approve'|'reject', app }
    const [rejectReason, setRejectReason] = useState('');
    const [resumeModal, setResumeModal] = useState(null); // userId for resume viewing

    const fetchApplications = async (page = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_URL}/admin/applications?status=${filter}&page=${page}&limit=15`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setApplications(data.data.applications);
                setPagination(data.data.pagination);
            }
        } catch (err) {
            console.error('Failed to fetch applications:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_URL}/admin/applications/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setStats(data.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    useEffect(() => {
        fetchApplications();
        fetchStats();
    }, [filter]);

    const handleApprove = async (app) => {
        setActionLoading(`${app.jobId}-${app.userId}`);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_URL}/admin/applications/${app.jobId}/${app.userId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(null);
                fetchApplications(pagination.page);
                fetchStats();
            } else {
                alert(data.error || 'Failed to approve');
            }
        } catch (err) {
            alert('Failed to approve application');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (app) => {
        setActionLoading(`${app.jobId}-${app.userId}`);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_URL}/admin/applications/${app.jobId}/${app.userId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: rejectReason })
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(null);
                setRejectReason('');
                fetchApplications(pagination.page);
                fetchStats();
            } else {
                alert(data.error || 'Failed to reject');
            }
        } catch (err) {
            alert('Failed to reject application');
        } finally {
            setActionLoading(null);
        }
    };

    const handleViewResume = async (userId) => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_URL}/admin/users/${userId}/resume/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                alert('Failed to download resume.');
                return;
            }

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
        } catch (err) {
            console.error('Error viewing resume:', err);
            alert('Error viewing resume.');
        }
    };

    const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <>
            <div className="admin-page-header">
                <div>
                    <h1>Job Applications</h1>
                    <p>Review, approve, or reject candidate applications</p>
                </div>
                <button className="admin-refresh-btn" onClick={() => { fetchApplications(); fetchStats(); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="app-stats-row">
                <div className={`app-stat-card ${filter === 'applied' ? 'active' : ''}`} onClick={() => setFilter('applied')}>
                    <div className="app-stat-number pending">{stats.pending}</div>
                    <div className="app-stat-label">Pending Review</div>
                </div>
                <div className={`app-stat-card ${filter === 'interviewing' ? 'active' : ''}`} onClick={() => setFilter('interviewing')}>
                    <div className="app-stat-number approved">{stats.approved}</div>
                    <div className="app-stat-label">Approved</div>
                </div>
                <div className={`app-stat-card ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>
                    <div className="app-stat-number rejected">{stats.rejected}</div>
                    <div className="app-stat-label">Rejected</div>
                </div>
                <div className="app-stat-card">
                    <div className="app-stat-number total">{stats.total}</div>
                    <div className="app-stat-label">Total</div>
                </div>
            </div>

            {/* Applications List */}
            <div className="admin-table-container">
                {loading ? (
                    <div className="admin-loading">
                        <div className="admin-loading-spinner"></div>
                    </div>
                ) : applications.length === 0 ? (
                    <div className="admin-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <h3>No {filter === 'applied' ? 'Pending' : filter === 'interviewing' ? 'Approved' : 'Rejected'} Applications</h3>
                        <p>No applications match the current filter</p>
                    </div>
                ) : (
                    <>
                        <table className="admin-table" style={{ fontSize: '0.85rem' }}>
                            <thead>
                                <tr>
                                    <th>Candidate</th>
                                    <th>Job</th>
                                    <th>AI Fit Score</th>
                                    <th>Skills Match</th>
                                    <th>ATP Score</th>
                                    <th>Applied</th>
                                    {filter === 'applied' && <th>Actions</th>}
                                    {filter !== 'applied' && <th>Status</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {applications.map((app, i) => (
                                    <tr key={`${app.jobId}-${app.userId}-${i}`}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0
                                                }}>
                                                    {app.userName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <strong style={{ color: '#f8fafc', display: 'block' }}>{app.userName}</strong>
                                                    <small style={{ color: '#64748b' }}>{app.userEmail}</small>
                                                    {app.hasResume && (
                                                        <button
                                                            onClick={() => handleViewResume(app.userId)}
                                                            style={{
                                                                display: 'block', marginTop: '2px', background: 'none',
                                                                border: 'none', color: '#38bdf8', cursor: 'pointer',
                                                                fontSize: '0.72rem', padding: 0, textDecoration: 'underline'
                                                            }}
                                                        >
                                                            View Resume
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <strong style={{ color: '#e2e8f0', display: 'block' }}>{app.jobTitle}</strong>
                                            <small style={{ color: '#64748b' }}>{app.jobCompany} • {app.jobDomain}</small>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    width: '42px', height: '42px', borderRadius: '50%',
                                                    border: `3px solid ${app.fitColor}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: '700', fontSize: '0.8rem', color: app.fitColor
                                                }}>
                                                    {app.fitScore}
                                                </div>
                                                <span style={{
                                                    fontSize: '0.72rem', fontWeight: '600',
                                                    color: app.fitColor, letterSpacing: '0.02em'
                                                }}>
                                                    {app.fitLabel}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                <span style={{ color: '#e2e8f0', fontWeight: '600' }}>
                                                    {app.matchedSkills?.length || 0}
                                                </span>
                                                /{app.totalRequired || 0} skills
                                                {app.matchedSkills?.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                        {app.matchedSkills.slice(0, 4).map((s, j) => (
                                                            <span key={j} style={{
                                                                background: 'rgba(16,185,129,0.15)', color: '#10b981',
                                                                padding: '1px 6px', borderRadius: '3px', fontSize: '0.65rem'
                                                            }}>
                                                                {s}
                                                            </span>
                                                        ))}
                                                        {app.matchedSkills.length > 4 && (
                                                            <span style={{ color: '#64748b', fontSize: '0.65rem' }}>
                                                                +{app.matchedSkills.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ color: '#38bdf8', fontWeight: '700' }}>{app.atpScore}</span>
                                                <div style={{
                                                    width: '32px', height: '4px', background: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '2px', overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${app.atpScore}%`, height: '100%', background: '#38bdf8'
                                                    }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                            {formatDate(app.appliedAt)}
                                        </td>
                                        {filter === 'applied' && (
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button
                                                        className="admin-action-btn success"
                                                        onClick={() => setShowModal({ type: 'approve', app })}
                                                        disabled={actionLoading === `${app.jobId}-${app.userId}`}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="admin-action-btn danger"
                                                        onClick={() => setShowModal({ type: 'reject', app })}
                                                        disabled={actionLoading === `${app.jobId}-${app.userId}`}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {filter !== 'applied' && (
                                            <td>
                                                <span className={`status-badge ${app.status === 'interviewing' ? 'approved' : app.status === 'rejected' ? 'rejected' : 'pending'}`}>
                                                    {app.status === 'interviewing' ? 'Approved' : app.status}
                                                </span>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {pagination.pages > 1 && (
                            <div className="admin-pagination">
                                <button
                                    className="admin-pagination-btn"
                                    onClick={() => fetchApplications(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                >
                                    Previous
                                </button>
                                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                    Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                                </span>
                                <button
                                    className="admin-pagination-btn"
                                    onClick={() => fetchApplications(pagination.page + 1)}
                                    disabled={pagination.page === pagination.pages}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Approve/Reject Modal */}
            {showModal && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="admin-modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>{showModal.type === 'approve' ? 'Approve Application' : 'Reject Application'}</h2>
                            <button className="admin-modal-close" onClick={() => setShowModal(null)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            <div style={{
                                padding: '16px', background: 'rgba(255,255,255,0.03)',
                                borderRadius: '8px', marginBottom: '16px'
                            }}>
                                <strong style={{ color: '#f8fafc' }}>{showModal.app.userName}</strong>
                                <span style={{ color: '#64748b', display: 'block' }}>{showModal.app.userEmail}</span>
                                <div style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                                    <span style={{ color: '#94a3b8' }}>Applying for: </span>
                                    <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{showModal.app.jobTitle}</span>
                                </div>
                                <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>
                                    <span style={{ color: '#94a3b8' }}>AI Fit: </span>
                                    <span style={{ color: showModal.app.fitColor, fontWeight: '600' }}>
                                        {showModal.app.fitScore}% — {showModal.app.fitLabel}
                                    </span>
                                </div>
                            </div>

                            {showModal.type === 'approve' ? (
                                <p style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>
                                    This will approve the candidate to take the job-specific interview. They will receive an <strong>email</strong> and an <strong>in-app notification</strong>.
                                </p>
                            ) : (
                                <div className="admin-form-group">
                                    <label style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                        Rejection Reason (optional)
                                    </label>
                                    <textarea
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                        placeholder="Enter reason for rejection..."
                                        rows={3}
                                        style={{
                                            width: '100%', padding: '12px',
                                            background: 'rgba(0,0,0,0.2)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px', color: '#f8fafc',
                                            fontSize: '0.9rem', resize: 'vertical'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="admin-modal-footer">
                            <button
                                className="admin-action-btn"
                                style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
                                onClick={() => setShowModal(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className={`admin-action-btn ${showModal.type === 'approve' ? 'success' : 'danger'}`}
                                onClick={() => showModal.type === 'approve'
                                    ? handleApprove(showModal.app)
                                    : handleReject(showModal.app)
                                }
                                disabled={!!actionLoading}
                            >
                                {actionLoading
                                    ? 'Processing...'
                                    : showModal.type === 'approve' ? 'Approve & Notify' : 'Reject & Notify'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminApplications;
