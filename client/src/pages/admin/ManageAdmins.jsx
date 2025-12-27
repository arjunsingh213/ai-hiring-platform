import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ManageAdmins = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', role: 'reviewer', password: '' });
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAdmins(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch admins:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setError('');
        setActionLoading(true);

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                setSuccess(`Admin created! Temporary password: ${data.data.tempPassword}`);
                setShowCreateModal(false);
                setFormData({ name: '', email: '', role: 'reviewer', password: '' });
                fetchAdmins();
            } else {
                setError(data.error || 'Failed to create admin');
            }
        } catch (error) {
            setError('Failed to create admin');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateAdmin = async (e) => {
        e.preventDefault();
        setError('');
        setActionLoading(true);

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/${selectedAdmin._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: formData.name, role: formData.role })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess('Admin updated successfully');
                setShowEditModal(false);
                fetchAdmins();
            } else {
                setError(data.error || 'Failed to update admin');
            }
        } catch (error) {
            setError('Failed to update admin');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleStatus = async (admin) => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/${admin._id}/toggle-status`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                setSuccess(data.message);
                fetchAdmins();
            } else {
                setError(data.error);
            }
        } catch (error) {
            setError('Failed to toggle status');
        }
    };

    const handleResetPassword = async (admin) => {
        if (!confirm(`Reset password for ${admin.name}?`)) return;

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/${admin._id}/force-reset-password`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                setSuccess(`Password reset! New temp password: ${data.data.tempPassword}`);
            } else {
                setError(data.error);
            }
        } catch (error) {
            setError('Failed to reset password');
        }
    };

    const handleDeleteAdmin = async () => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/${selectedAdmin._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                setSuccess('Admin deleted');
                setShowDeleteModal(false);
                setSelectedAdmin(null);
                fetchAdmins();
            } else {
                setError(data.error);
            }
        } catch (error) {
            setError('Failed to delete admin');
        } finally {
            setActionLoading(false);
        }
    };

    const openEditModal = (admin) => {
        setSelectedAdmin(admin);
        setFormData({ name: admin.name, email: admin.email, role: admin.role, password: '' });
        setShowEditModal(true);
    };

    const openDeleteModal = (admin) => {
        setSelectedAdmin(admin);
        setShowDeleteModal(true);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getInitials = (name) => {
        if (!name) return 'A';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const filteredAdmins = admins.filter(admin =>
        admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
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
                    <h1>Manage Admins</h1>
                    <p>Create and manage administrator accounts</p>
                </div>
            </div>

            {/* Success/Error Messages */}
            {success && (
                <div className="admin-success-message" onClick={() => setSuccess('')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {success}
                </div>
            )}
            {error && (
                <div className="admin-error-message" onClick={() => setError('')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Header Actions */}
            <div className="admin-list-header">
                <div className="admin-search-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search admins..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="admin-create-btn" onClick={() => setShowCreateModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create Admin
                </button>
            </div>

            {/* Admin Cards Grid */}
            <div className="admins-grid">
                {filteredAdmins.map(admin => (
                    <div key={admin._id} className="admin-card">
                        <div className="admin-card-header">
                            <div className={`admin-card-avatar ${admin.role}`}>
                                {getInitials(admin.name)}
                            </div>
                            <div className="admin-card-info">
                                <h4>{admin.name}</h4>
                                <p>{admin.email}</p>
                            </div>
                            <div className="admin-card-status">
                                <span className={`status-dot ${admin.isActive ? 'active' : 'inactive'}`}></span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`role-badge ${admin.role}`}>
                                {admin.role.replace('_', ' ')}
                            </span>
                            <span style={{ color: admin.isActive ? '#10b981' : '#ef4444', fontSize: '0.8rem' }}>
                                {admin.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="admin-card-meta">
                            <div className="meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                Last login: {formatDate(admin.lastLogin)}
                            </div>
                            <div className="meta-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                Created: {formatDate(admin.createdAt)}
                            </div>
                        </div>

                        <div className="admin-card-actions">
                            <button className="admin-action-btn primary" onClick={() => openEditModal(admin)}>
                                Edit
                            </button>
                            <button
                                className={`admin-action-btn ${admin.isActive ? 'danger' : 'success'}`}
                                onClick={() => handleToggleStatus(admin)}
                            >
                                {admin.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button className="admin-action-btn" onClick={() => handleResetPassword(admin)} style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>
                                Reset Pwd
                            </button>
                            <button className="admin-action-btn danger" onClick={() => openDeleteModal(admin)}>
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredAdmins.length === 0 && (
                <div className="admin-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                    </svg>
                    <h3>No admins found</h3>
                    <p>Create a new admin or adjust your search</p>
                </div>
            )}

            {/* Create Admin Modal */}
            {showCreateModal && (
                <div className="admin-modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>Create New Admin</h2>
                            <button className="admin-modal-close" onClick={() => setShowCreateModal(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateAdmin} className="admin-modal-body">
                            <div className="admin-form">
                                <div className="admin-form-row">
                                    <div>
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            placeholder="admin@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="admin-form-row">
                                    <div>
                                        <label>Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="reviewer">Reviewer</option>
                                            <option value="admin">Admin</option>
                                            <option value="super_admin">Super Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Password (optional)</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="Leave blank for auto-generated"
                                        />
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-submit" disabled={actionLoading}>
                                        {actionLoading ? 'Creating...' : 'Create Admin'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Admin Modal */}
            {showEditModal && selectedAdmin && (
                <div className="admin-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>Edit Admin</h2>
                            <button className="admin-modal-close" onClick={() => setShowEditModal(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateAdmin} className="admin-modal-body">
                            <div className="admin-form">
                                <div>
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label>Email (read-only)</label>
                                    <input type="email" value={formData.email} disabled />
                                </div>
                                <div>
                                    <label>Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="reviewer">Reviewer</option>
                                        <option value="admin">Admin</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-submit" disabled={actionLoading}>
                                        {actionLoading ? 'Updating...' : 'Update Admin'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedAdmin && (
                <div className="admin-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="admin-modal-header">
                            <h2>Delete Admin</h2>
                            <button className="admin-modal-close" onClick={() => setShowDeleteModal(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            <p style={{ color: '#e2e8f0', marginBottom: '20px' }}>
                                Are you sure you want to delete <strong>{selectedAdmin.name}</strong>?
                                This action cannot be undone.
                            </p>
                            <div className="form-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowDeleteModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn-submit danger"
                                    onClick={handleDeleteAdmin}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Deleting...' : 'Delete Admin'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .admin-success-message {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    background: rgba(16, 185, 129, 0.15);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 8px;
                    color: #6ee7b7;
                    font-size: 0.9rem;
                    margin-bottom: 16px;
                    cursor: pointer;
                }
                .admin-success-message svg {
                    width: 20px;
                    height: 20px;
                    flex-shrink: 0;
                }
            `}</style>
        </>
    );
};

export default ManageAdmins;
