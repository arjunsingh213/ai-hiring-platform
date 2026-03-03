import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminJobs.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminJobs = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');

    // Edit Modal State
    const [editingJob, setEditingJob] = useState(null);
    const [editForm, setEditForm] = useState({ title: '', companyName: '', status: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchJobs();
    }, [page, statusFilter]);

    useEffect(() => {
        const bounce = setTimeout(() => { if (page === 1) fetchJobs(); else setPage(1); }, 500);
        return () => clearTimeout(bounce);
    }, [search]);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) return navigate('/admin/login');

            let url = `${API_URL}/admin/jobs?page=${page}&limit=15&search=${search}&status=${statusFilter}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setJobs(data.data.jobs);
                setTotalPages(data.data.pagination.pages);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (job) => {
        setEditingJob(job);
        setEditForm({
            title: job.title,
            companyName: job.company?.name || '',
            status: job.status
        });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/jobs/${editingJob._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: editForm.title,
                    'company.name': editForm.companyName,
                    status: editForm.status
                })
            });

            const data = await response.json();
            if (data.success) {
                setJobs(prev => prev.map(j => j._id === editingJob._id ? { ...j, title: editForm.title, company: { ...j.company, name: editForm.companyName }, status: editForm.status } : j));
                setEditingJob(null);
            } else {
                alert('Failed to update job');
            }
        } catch (error) {
            console.error('Error updating job:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleCloseJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to close this job? Candidates will no longer be able to apply.')) return;

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/jobs/${jobId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                fetchJobs();
            }
        } catch (error) {
            console.error('Failed to close job:', error);
        }
    };

    return (
        <div className="admin-jobs-container">
            <div className="admin-page-header">
                <div>
                    <h1>Jobs Management</h1>
                    <p>View, edit, and control jobs posted on the platform</p>
                </div>
            </div>

            <div className="admin-controls-bar">
                <div className="search-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search jobs or companies..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="closed">Closed</option>
                        <option value="filled">Filled</option>
                    </select>
                </div>
            </div>

            <div className="admin-table-container">
                {loading ? (
                    <div className="admin-loading"><div className="admin-loading-spinner"></div></div>
                ) : jobs.length === 0 ? (
                    <div className="admin-empty-state">No jobs found matching your criteria.</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Job Title</th>
                                <th>Company</th>
                                <th>Recruiter</th>
                                <th>Status</th>
                                <th>Date Posted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map(job => (
                                <tr key={job._id}>
                                    <td>
                                        <div className="job-title-cell">
                                            <strong>{job.title}</strong>
                                            <span className="job-type">{job.jobDetails?.type || 'Standard'}</span>
                                        </div>
                                    </td>
                                    <td>{job.company?.name || 'Confidential'}</td>
                                    <td>
                                        <div className="recruiter-cell">
                                            <span>{job.recruiterId?.profile?.name || 'Unknown'}</span>
                                            <small>{job.recruiterId?.email}</small>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${job.status}`}>
                                            {job.status}
                                        </span>
                                    </td>
                                    <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button onClick={() => handleEditClick(job)} className="action-btn edit" title="Edit Job">
                                                Edit
                                            </button>
                                            {job.status !== 'closed' && (
                                                <button onClick={() => handleCloseJob(job._id)} className="action-btn delete" title="Close Job">
                                                    Close
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="admin-pagination">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                    <span>Page {page} of {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
            )}

            {/* Edit Modal */}
            {editingJob && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal">
                        <div className="admin-modal-header">
                            <h3>Edit Job</h3>
                            <button className="close-btn" onClick={() => setEditingJob(null)}>×</button>
                        </div>
                        <div className="admin-modal-content">
                            <form onSubmit={handleEditSubmit} className="admin-form">
                                <div className="form-group">
                                    <label>Job Title</label>
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Company Name</label>
                                    <input
                                        type="text"
                                        value={editForm.companyName}
                                        onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                                        placeholder="Keep blank for Confidential"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="draft">Draft</option>
                                        <option value="closed">Closed</option>
                                        <option value="filled">Filled</option>
                                    </select>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="admin-action-btn secondary" onClick={() => setEditingJob(null)}>Cancel</button>
                                    <button type="submit" className="admin-action-btn primary" disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminJobs;
