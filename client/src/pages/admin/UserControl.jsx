import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import AITalentPassport from '../../components/AITalentPassport/AITalentPassport';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const UserControl = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ role: '', isSuspended: '' });
    const [selectedUser, setSelectedUser] = useState(null);
    const [viewingATPUser, setViewingATPUser] = useState(null);
    const [atpProjects, setAtpProjects] = useState([]);
    const [showModal, setShowModal] = useState(null);
    const [formData, setFormData] = useState({ reason: '' });
    const [actionLoading, setActionLoading] = useState(false);
    const [resumeData, setResumeData] = useState(null);
    const [activities, setActivities] = useState([]);
    const [activityPagination, setActivityPagination] = useState({ page: 1, total: 0 });
    const [fetchingDetail, setFetchingDetail] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [page, filters]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            let url = `${API_URL}/admin/users?page=${page}&limit=20`;

            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (filters.role) url += `&role=${filters.role}`;
            if (filters.isSuspended) url += `&isSuspended=${filters.isSuspended}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                navigate('/admin/login');
                return;
            }

            const data = await response.json();
            if (data.success) {
                setUsers(data.data.users);
                setTotalPages(data.data.pagination.pages);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProjects = async (userId) => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/projects/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAtpProjects(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch user projects:', error);
            setAtpProjects([]);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    const handleAction = async (userId, action, endpoint) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const body = { reason: formData.reason };
            if (action === 'atp') {
                body.newScore = formData.newScore;
            }

            const response = await fetch(`${API_URL}/admin/users/${userId}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.success) {
                setShowModal(null);
                setSelectedUser(null);
                setFormData({ reason: '' });
                fetchUsers();
            } else {
                alert(data.error || 'Action failed');
            }
        } catch (error) {
            console.error('Action failed:', error);
            alert('Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const fetchUserResume = async (userId) => {
        setFetchingDetail(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/users/${userId}/resume`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setResumeData(data.data);
            } else {
                alert(data.error || 'Failed to fetch resume');
            }
        } catch (error) {
            console.error('Resume fetch failed:', error);
            alert('Failed to fetch resume');
        } finally {
            setFetchingDetail(false);
        }
    };

    const fetchUserActivity = async (userId, pageNum = 1) => {
        setFetchingDetail(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/activity/admin/${userId}?page=${pageNum}&limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setActivities(data.data.activities);
                setActivityPagination({
                    page: data.data.pagination.page,
                    total: data.data.pagination.total,
                    pages: data.data.pagination.pages
                });
            }
        } catch (error) {
            console.error('Activity fetch failed:', error);
        } finally {
            setFetchingDetail(false);
        }
    };

    const handleDownloadResume = (userId) => {
        const token = localStorage.getItem('adminToken');
        window.open(`${API_URL}/admin/users/${userId}/resume/download?adminToken=${token}`, '_blank');
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins < 60) return `${mins}m ${secs}s`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}h ${remainingMins}m`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading && users.length === 0) {
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
                    <h1>User Control</h1>
                    <p>Manage user accounts and interview eligibility</p>
                </div>
            </div>

            {/* Search and filters */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                flexWrap: 'wrap'
            }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '300px' }}>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '10px 14px',
                            background: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#f8fafc',
                            fontSize: '0.9rem'
                        }}
                    />
                    <button type="submit" className="admin-action-btn primary" style={{ padding: '10px 16px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        Search
                    </button>
                </form>

                <select
                    value={filters.role}
                    onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                    style={{
                        padding: '10px 12px',
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        fontSize: '0.85rem'
                    }}
                >
                    <option value="">All Roles</option>
                    <option value="jobseeker">Job Seekers</option>
                    <option value="recruiter">Recruiters</option>
                </select>

                <select
                    value={filters.isSuspended}
                    onChange={(e) => setFilters({ ...filters, isSuspended: e.target.value })}
                    style={{
                        padding: '10px 12px',
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        fontSize: '0.85rem'
                    }}
                >
                    <option value="">All Status</option>
                    <option value="false">Active</option>
                    <option value="true">Suspended</option>
                </select>
            </div>

            <div className="admin-table-container">
                {users.length === 0 ? (
                    <div className="admin-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                        </svg>
                        <h3>No Users Found</h3>
                        <p>No users match the current filter</p>
                    </div>
                ) : (
                    <>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Interview Status</th>
                                    <th>ATP Score</th>
                                    <th>Account Status</th>
                                    <th>Joined</th>
                                    <th>Last Active</th>
                                    <th>Time Spent</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user._id}>
                                        <td>
                                            <div>
                                                <strong style={{ color: '#f8fafc' }}>
                                                    {user.profile?.name || 'Unknown'}
                                                </strong>
                                                <br />
                                                <small style={{ color: '#64748b' }}>
                                                    {user.email}
                                                </small>
                                            </div>
                                        </td>
                                        <td style={{ textTransform: 'capitalize' }}>
                                            {user.role}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${user.platformInterview?.status === 'passed' ? 'approved' :
                                                user.platformInterview?.status === 'failed' ? 'rejected' :
                                                    'pending'
                                                }`}>
                                                {user.platformInterview?.status || 'pending'}
                                            </span>
                                        </td>
                                        <td>
                                            {user.role === 'jobseeker' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        color: '#38bdf8',
                                                        fontWeight: 'bold',
                                                        fontSize: '1rem'
                                                    }}>
                                                        {user.aiTalentPassport?.talentScore || 0}
                                                    </span>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '4px',
                                                        background: 'rgba(255,255,255,0.1)',
                                                        borderRadius: '2px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            width: `${user.aiTalentPassport?.talentScore || 0}%`,
                                                            height: '100%',
                                                            background: '#38bdf8'
                                                        }}></div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#64748b' }}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            {user.accountStatus?.isSuspended ? (
                                                <span className="status-badge rejected">Suspended</span>
                                            ) : user.accountStatus?.isRepeatOffender ? (
                                                <span className="status-badge cheating">Repeat Offender</span>
                                            ) : (
                                                <span className="status-badge approved">Active</span>
                                            )}
                                        </td>
                                        <td>
                                            {formatDate(user.createdAt)}
                                        </td>
                                        <td>
                                            {formatDate(user.lastActive)}
                                        </td>
                                        <td>
                                            {formatDuration(user.totalTimeSpent)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {user.accountStatus?.isSuspended ? (
                                                    <button
                                                        className="admin-action-btn success"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowModal('unsuspend');
                                                        }}
                                                    >
                                                        Unsuspend
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="admin-action-btn danger"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowModal('suspend');
                                                        }}
                                                    >
                                                        Suspend
                                                    </button>
                                                )}

                                                <button
                                                    className="admin-action-btn primary"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowModal('resume');
                                                        fetchUserResume(user._id);
                                                    }}
                                                >
                                                    View Resume
                                                </button>

                                                <button
                                                    className="admin-action-btn"
                                                    style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowModal('activity');
                                                        fetchUserActivity(user._id);
                                                    }}
                                                >
                                                    Activity
                                                </button>

                                                <button
                                                    className="admin-action-btn primary"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowModal('reset');
                                                    }}
                                                >
                                                    Reset Interview
                                                </button>

                                                {!user.accountStatus?.isRepeatOffender && (
                                                    <button
                                                        className="admin-action-btn"
                                                        style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowModal('offender');
                                                        }}
                                                    >
                                                        Mark Offender
                                                    </button>
                                                )}

                                                {user.role === 'jobseeker' && (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            className="admin-action-btn"
                                                            style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}
                                                            onClick={() => {
                                                                setViewingATPUser(user);
                                                                fetchUserProjects(user._id);
                                                            }}
                                                        >
                                                            View ATP
                                                        </button>
                                                        <button
                                                            className="admin-action-btn"
                                                            style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setFormData({
                                                                    reason: '',
                                                                    newScore: user.aiTalentPassport?.talentScore || 0
                                                                });
                                                                setShowModal('atp');
                                                            }}
                                                        >
                                                            Edit ATP
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
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

            {/* Action Modal */}
            {showModal && selectedUser && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>
                                {showModal === 'suspend' && 'Suspend User'}
                                {showModal === 'unsuspend' && 'Unsuspend User'}
                                {showModal === 'reset' && 'Reset Interview Eligibility'}
                                {showModal === 'offender' && 'Mark as Repeat Offender'}
                                {showModal === 'atp' && 'Update AI Talent Passport Score'}
                            </h2>
                            <button className="admin-modal-close" onClick={() => setShowModal(null)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        <div className="admin-modal-body">
                            <div style={{
                                padding: '16px',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '8px',
                                marginBottom: '16px'
                            }}>
                                <strong style={{ color: '#f8fafc' }}>{selectedUser.profile?.name}</strong>
                                <span style={{ color: '#64748b', display: 'block' }}>{selectedUser.email}</span>
                            </div>

                            <div className="admin-form-group">
                                <label style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                    Reason {showModal !== 'unsuspend' && '*'}
                                </label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder={showModal === 'unsuspend' ? 'Optional notes...' : 'Enter reason...'}
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#f8fafc',
                                        fontSize: '0.9rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            {showModal === 'atp' && (
                                <div className="admin-form-group" style={{ marginTop: '16px' }}>
                                    <label style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                        New ATP Score (0-100) *
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.newScore}
                                            onChange={(e) => setFormData({ ...formData, newScore: parseInt(e.target.value) })}
                                            style={{
                                                width: '100px',
                                                padding: '12px',
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: '#f8fafc',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={formData.newScore}
                                            onChange={(e) => setFormData({ ...formData, newScore: parseInt(e.target.value) })}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
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
                                className={`admin-action-btn ${showModal === 'unsuspend' || showModal === 'reset' || showModal === 'atp' ? 'success' : 'danger'}`}
                                onClick={() => {
                                    const endpoints = {
                                        suspend: 'suspend',
                                        unsuspend: 'unsuspend',
                                        reset: 'reset-eligibility',
                                        offender: 'mark-offender',
                                        atp: 'update-atp'
                                    };
                                    handleAction(selectedUser._id, showModal, endpoints[showModal]);
                                }}
                                disabled={actionLoading || (showModal !== 'unsuspend' && !formData.reason)}
                            >
                                {actionLoading ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resume Details Modal */}
            {showModal === 'resume' && selectedUser && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="admin-modal" style={{ maxWidth: '1000px', width: '95%' }} onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <div>
                                <h2>{selectedUser.profile?.name}'s Resume</h2>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>{resumeData?.fileName || 'Resume Preview'}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button
                                    className="admin-action-btn success"
                                    onClick={() => handleDownloadResume(selectedUser._id)}
                                >
                                    Download Original
                                </button>
                                <button className="admin-modal-close" onClick={() => setShowModal(null)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="admin-modal-body" style={{ height: '80vh', padding: 0, display: 'flex', flexDirection: 'column' }}>
                            {fetchingDetail ? (
                                <div className="admin-loading-spinner" style={{ margin: 'auto' }}></div>
                            ) : resumeData ? (
                                <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                                    {/* PDF Viewer Section */}
                                    <div style={{ flex: 1, height: '100%', background: '#1e293b' }}>
                                        {resumeData.fileUrl ? (
                                            <iframe
                                                src={`${resumeData.fileUrl}#toolbar=0`}
                                                title="Resume PDF"
                                                width="100%"
                                                height="100%"
                                                style={{ border: 'none' }}
                                            />
                                        ) : (
                                            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                                <p>PDF file URL not available.</p>
                                                {resumeData.htmlContent && <p>Showing text preview instead.</p>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sidebar for Parsed Data */}
                                    <div style={{
                                        width: '300px',
                                        borderLeft: '1px solid rgba(255,255,255,0.1)',
                                        padding: '20px',
                                        overflowY: 'auto',
                                        background: 'rgba(15, 23, 42, 0.5)'
                                    }}>
                                        {resumeData.parsedData && (
                                            <div className="resume-parsed-section">
                                                <h4 style={{ color: '#38bdf8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Parsed Skills</h4>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
                                                    {resumeData.parsedData.skills?.map((skill, i) => (
                                                        <span key={i} style={{
                                                            background: 'rgba(56, 189, 248, 0.1)',
                                                            color: '#38bdf8',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem'
                                                        }}>
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>

                                                <h4 style={{ color: '#38bdf8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>AI Insights</h4>
                                                <div style={{
                                                    background: 'rgba(56, 189, 248, 0.05)',
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(56, 189, 248, 0.1)'
                                                }}>
                                                    <p style={{ color: '#e2e8f0', lineHeight: '1.5', fontSize: '0.85rem', margin: 0 }}>
                                                        {resumeData.aiAnalysis?.roleMatch || 'No specific AI role analysis available.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {!resumeData.fileUrl && resumeData.htmlContent && (
                                            <div style={{ marginTop: '20px' }}>
                                                <h4 style={{ color: '#312e81', fontSize: '0.9rem' }}>Text Content</h4>
                                                <div
                                                    style={{
                                                        padding: '10px',
                                                        background: 'white',
                                                        color: 'black',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        maxHeight: '300px',
                                                        overflowY: 'auto'
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: resumeData.htmlContent }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p style={{ color: '#ef4444', textAlign: 'center', padding: '40px' }}>Resume data not available.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Log Modal */}
            {showModal === 'activity' && selectedUser && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="admin-modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>User Activity Logs</h2>
                            <button className="admin-modal-close" onClick={() => setShowModal(null)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            {fetchingDetail ? (
                                <div className="admin-loading-spinner" style={{ margin: '40px auto' }}></div>
                            ) : (
                                <div className="activity-list">
                                    <table className="admin-table" style={{ fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Action</th>
                                                <th>Feature</th>
                                                <th>Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activities.map((act, i) => (
                                                <tr key={i}>
                                                    <td>{new Date(act.timestamp).toLocaleString()}</td>
                                                    <td style={{ fontWeight: '500' }}>{act.action.replace(/_/g, ' ')}</td>
                                                    <td>{act.feature}</td>
                                                    <td>{act.duration > 0 ? formatDuration(act.duration) : '-'}</td>
                                                </tr>
                                            ))}
                                            {activities.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>No activity logs found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    {activityPagination.pages > 1 && (
                                        <div className="admin-pagination" style={{ marginTop: '15px' }}>
                                            <button
                                                className="admin-pagination-btn"
                                                onClick={() => fetchUserActivity(selectedUser._id, activityPagination.page - 1)}
                                                disabled={activityPagination.page === 1}
                                            >
                                                Prev
                                            </button>
                                            <span style={{ color: '#94a3b8' }}>{activityPagination.page} / {activityPagination.pages}</span>
                                            <button
                                                className="admin-pagination-btn"
                                                onClick={() => fetchUserActivity(selectedUser._id, activityPagination.page + 1)}
                                                disabled={activityPagination.page === activityPagination.pages}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ATP View Modal */}
            {viewingATPUser && (
                <div className="admin-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '1000' }}>
                    <div className="admin-modal" style={{ width: '95%', maxWidth: '1300px', height: '90vh', overflow: 'hidden', padding: '0', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
                        <div className="admin-modal-header" style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: '0', color: '#f8fafc' }}>AI Talent Passport — {viewingATPUser.profile?.name}</h2>
                            <button className="admin-modal-close" onClick={() => setViewingATPUser(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#0f172a' }}>
                            <AITalentPassport
                                passport={viewingATPUser.aiTalentPassport}
                                userName={viewingATPUser.profile?.name}
                                userPhoto={viewingATPUser.profile?.photo}
                                userDomain={viewingATPUser.jobSeekerProfile?.domain || viewingATPUser.jobSeekerProfile?.desiredRole || 'Software Engineering'}
                                userId={viewingATPUser._id}
                                viewMode="recruiter"
                                jobDomains={viewingATPUser.jobSeekerProfile?.jobDomains || []}
                                verifiedProjects={atpProjects}
                                skillHistory={viewingATPUser.aiTalentPassport?.interviewSkillHistory || []}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserControl;
