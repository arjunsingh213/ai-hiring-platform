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
    const [editForm, setEditForm] = useState({ title: '', companyName: '', status: '', description: '', type: 'full-time', remote: false, salaryMin: '', salaryMax: '', salaryPeriod: 'yearly' });
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
            title: job.title || '',
            companyName: job.company?.name || '',
            status: job.status || 'active',
            description: job.description || '',
            type: job.jobDetails?.type || 'full-time',
            remote: job.jobDetails?.remote || false,
            salaryMin: job.jobDetails?.salary?.min || '',
            salaryMax: job.jobDetails?.salary?.max || '',
            salaryPeriod: job.jobDetails?.salary?.period || 'yearly'
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
                    status: editForm.status,
                    description: editForm.description,
                    'jobDetails.type': editForm.type,
                    'jobDetails.remote': editForm.remote,
                    'jobDetails.salary.min': editForm.salaryMin ? Number(editForm.salaryMin) : null,
                    'jobDetails.salary.max': editForm.salaryMax ? Number(editForm.salaryMax) : null,
                    'jobDetails.salary.period': editForm.salaryPeriod
                })
            });

            const data = await response.json();
            if (data.success) {
                setJobs(prev => prev.map(j => j._id === editingJob._id ? {
                    ...j,
                    title: editForm.title,
                    company: { ...j.company, name: editForm.companyName },
                    status: editForm.status,
                    description: editForm.description,
                    jobDetails: {
                        ...j.jobDetails,
                        type: editForm.type,
                        remote: editForm.remote,
                        salary: {
                            ...j.jobDetails?.salary,
                            min: editForm.salaryMin ? Number(editForm.salaryMin) : null,
                            max: editForm.salaryMax ? Number(editForm.salaryMax) : null,
                            period: editForm.salaryPeriod
                        }
                    }
                } : j));
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
        <div className="admin-jobs-container" style={{ backgroundColor: '#0f172a', minHeight: '100%', padding: '24px', color: '#f8fafc' }}>
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

            <div className="admin-table-container" style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
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
                                    <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Company Name</label>
                                    <input type="text" value={editForm.companyName} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} placeholder="Keep blank for Confidential" />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        rows="3"
                                        placeholder="Brief overview of the role..."
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 1)', borderRadius: '6px', fontSize: '0.95rem', color: '#f8fafc', resize: 'vertical' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>Job Type</label>
                                        <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                                            <option value="full-time">Full-Time</option>
                                            <option value="part-time">Part-Time</option>
                                            <option value="contract">Contract</option>
                                            <option value="internship">Internship</option>
                                            <option value="freelance">Freelance</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Workplace Mode</label>
                                        <select value={editForm.remote ? 'remote' : 'onsite'} onChange={(e) => setEditForm({ ...editForm, remote: e.target.value === 'remote' })}>
                                            <option value="onsite">On-site / Hybrid</option>
                                            <option value="remote">Remote</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div className="form-group">
                                        <label>Min Salary</label>
                                        <input type="number" placeholder="e.g. 50000" value={editForm.salaryMin} onChange={(e) => setEditForm({ ...editForm, salaryMin: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Max Salary</label>
                                        <input type="number" placeholder="e.g. 80000" value={editForm.salaryMax} onChange={(e) => setEditForm({ ...editForm, salaryMax: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Period</label>
                                        <select value={editForm.salaryPeriod} onChange={(e) => setEditForm({ ...editForm, salaryPeriod: e.target.value })}>
                                            <option value="yearly">Yearly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="hourly">Hourly</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
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
