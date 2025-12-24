import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

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
    const [showModal, setShowModal] = useState(null);
    const [formData, setFormData] = useState({ reason: '' });
    const [actionLoading, setActionLoading] = useState(false);

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

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    const handleAction = async (userId, action, endpoint) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/users/${userId}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: formData.reason })
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
                                    <th>Account Status</th>
                                    <th>Joined</th>
                                    <th>Last Active</th>
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
                                    onChange={(e) => setFormData({ reason: e.target.value })}
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
                                className={`admin-action-btn ${showModal === 'unsuspend' || showModal === 'reset' ? 'success' : 'danger'}`}
                                onClick={() => {
                                    const endpoints = {
                                        suspend: 'suspend',
                                        unsuspend: 'unsuspend',
                                        reset: 'reset-eligibility',
                                        offender: 'mark-offender'
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
        </>
    );
};

export default UserControl;
