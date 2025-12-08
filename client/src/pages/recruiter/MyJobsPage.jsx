import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import '../jobseeker/JobListingsPage.css';

const MyJobsPage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [loading, setLoading] = useState(true);

    // Delete with undo state
    const [deleteToast, setDeleteToast] = useState(null);
    const deleteTimerRef = useRef(null);
    const countdownRef = useRef(null);

    useEffect(() => {
        fetchMyJobs();

        // Cleanup timers on unmount
        return () => {
            if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    const fetchMyJobs = async () => {
        try {
            setLoading(true);
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : {};
            const userId = user._id || user.id || localStorage.getItem('userId');

            if (!userId) {
                console.error('No user ID found');
                setLoading(false);
                return;
            }

            const response = await api.get(`/jobs/recruiter/${userId}`);
            const jobsData = Array.isArray(response) ? response :
                Array.isArray(response?.data) ? response.data : [];

            setJobs(jobsData);

            if (jobsData.length > 0 && !selectedJob) {
                setSelectedJob(jobsData[0]);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: { class: 'badge-success', text: 'Active' },
            closed: { class: 'badge-danger', text: 'Closed' },
            draft: { class: 'badge-warning', text: 'Draft' },
            paused: { class: 'badge-info', text: 'Paused' }
        };
        return badges[status] || badges.active;
    };

    // Edit Job - navigate to post-job page with edit data
    const handleEditJob = () => {
        if (!selectedJob) return;
        navigate('/recruiter/post-job', {
            state: {
                editMode: true,
                jobData: selectedJob
            }
        });
    };

    // Delete Job with undo countdown
    const handleDeleteJob = () => {
        if (!selectedJob) return;

        const jobToDelete = selectedJob;
        const UNDO_SECONDS = 10;

        // Remove from local state immediately
        setJobs(prev => prev.filter(j => j._id !== jobToDelete._id));
        setSelectedJob(jobs.find(j => j._id !== jobToDelete._id) || null);

        // Start countdown
        let countdown = UNDO_SECONDS;
        setDeleteToast({
            job: jobToDelete,
            countdown,
            message: `"${jobToDelete.title}" will be deleted in ${countdown} seconds`
        });

        // Update countdown every second
        countdownRef.current = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                setDeleteToast(prev => prev ? {
                    ...prev,
                    countdown,
                    message: `"${jobToDelete.title}" will be deleted in ${countdown} seconds`
                } : null);
            }
        }, 1000);

        // Actually delete after countdown
        deleteTimerRef.current = setTimeout(async () => {
            clearInterval(countdownRef.current);
            try {
                await api.delete(`/jobs/${jobToDelete._id}`);
                setDeleteToast(null);
            } catch (error) {
                console.error('Error deleting job:', error);
                // Restore job if delete failed
                setJobs(prev => [...prev, jobToDelete]);
                toast.error('Failed to delete job: ' + (error.response?.data?.error || error.message));
            }
        }, UNDO_SECONDS * 1000);
    };

    // Undo delete
    const handleUndoDelete = () => {
        if (!deleteToast) return;

        // Clear timers
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);

        // Restore job
        setJobs(prev => [...prev, deleteToast.job]);
        setSelectedJob(deleteToast.job);
        setDeleteToast(null);
    };

    if (loading) {
        return (
            <div className="job-listings">
                <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <p>Loading your jobs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="job-listings">
            {/* Delete Undo Toast */}
            {deleteToast && (
                <div className="delete-toast" style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--danger)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-md) var(--spacing-xl)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-lg)',
                    boxShadow: 'var(--shadow-xl)',
                    zIndex: 1000
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        <span style={{ fontSize: '1.5rem' }}>🗑️</span>
                        <div>
                            <p style={{ margin: 0, fontWeight: 500 }}>{deleteToast.message}</p>
                            <div style={{
                                width: '100%',
                                height: '4px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '2px',
                                marginTop: 'var(--spacing-xs)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${(deleteToast.countdown / 10) * 100}%`,
                                    height: '100%',
                                    background: 'var(--danger)',
                                    transition: 'width 1s linear'
                                }}></div>
                            </div>
                        </div>
                    </div>
                    <button
                        className="btn btn-warning"
                        onClick={handleUndoDelete}
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        ↩ Undo
                    </button>
                </div>
            )}

            <div className="jobs-sidebar">
                <div className="filters-section">
                    <h3>My Posted Jobs</h3>
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
                        onClick={() => navigate('/recruiter/post-job')}
                    >
                        + Post New Job
                    </button>
                </div>

                <div className="jobs-list">
                    <h3>Jobs ({jobs.length})</h3>
                    {jobs.map((job) => (
                        <div
                            key={job._id}
                            className={`job-item ${selectedJob?._id === job._id ? 'active' : ''}`}
                            onClick={() => setSelectedJob(job)}
                        >
                            <h4>{job.title}</h4>
                            <p className="company-name">{job.jobDetails?.location || 'Remote'}</p>
                            <p className="job-meta">
                                {job.applicants?.length || 0} applicants • {formatDate(job.createdAt)}
                            </p>
                            <span className={`badge ${getStatusBadge(job.status).class}`} style={{ marginTop: 'var(--spacing-sm)' }}>
                                {getStatusBadge(job.status).text}
                            </span>
                        </div>
                    ))}
                    {jobs.length === 0 && (
                        <div className="empty-state">
                            <p>You haven't posted any jobs yet</p>
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: 'var(--spacing-md)' }}
                                onClick={() => navigate('/recruiter/post-job')}
                            >
                                Post Your First Job
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="job-details">
                {selectedJob ? (
                    <>
                        <div className="job-header">
                            <div className="company-logo">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                                    <rect x="2" y="7" width="20" height="14" rx="3" fill="var(--primary)" />
                                    <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="white" strokeWidth="2" />
                                </svg>
                            </div>
                            <div className="job-title-section">
                                <h1>{selectedJob.title}</h1>
                                <p className="company-info">
                                    {selectedJob.jobDetails?.location || 'Remote'} • {selectedJob.jobDetails?.type || 'Full-time'}
                                </p>
                                <div className="job-badges">
                                    <span className={`badge ${getStatusBadge(selectedJob.status).class}`}>
                                        {getStatusBadge(selectedJob.status).text}
                                    </span>
                                    <span className="badge">{selectedJob.applicants?.length || 0} Applicants</span>
                                    <span className="badge">{selectedJob.views || 0} Views</span>
                                </div>
                            </div>
                            <div className="job-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => navigate('/recruiter/applications', {
                                        state: { filterJobId: selectedJob._id, filterJobTitle: selectedJob.title }
                                    })}
                                >
                                    View Applicants ({selectedJob.applicants?.length || 0})
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleEditJob}
                                >
                                    ✏️ Edit Job
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleDeleteJob}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>

                        <div className="job-content card">
                            <section>
                                <h3>Job Description</h3>
                                <p>{selectedJob.description || 'No description provided.'}</p>
                            </section>

                            <section>
                                <h3>Requirements</h3>
                                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <strong>Skills:</strong>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', marginTop: 'var(--spacing-sm)' }}>
                                        {selectedJob.requirements?.skills?.map((skill, i) => (
                                            <span key={i} className="badge">{skill}</span>
                                        ))}
                                        {(!selectedJob.requirements?.skills || selectedJob.requirements.skills.length === 0) && (
                                            <span className="text-muted">No skills specified</span>
                                        )}
                                    </div>
                                </div>
                                <p><strong>Experience:</strong> {selectedJob.requirements?.minExperience || 0} - {selectedJob.requirements?.maxExperience || 10} years</p>
                                <p><strong>Education:</strong> {selectedJob.requirements?.education?.join(', ') || 'Not specified'}</p>
                            </section>

                            <section>
                                <h3>Compensation</h3>
                                <p>
                                    {selectedJob.jobDetails?.salary?.currency || 'USD'} {selectedJob.jobDetails?.salary?.min?.toLocaleString() || 0} - {selectedJob.jobDetails?.salary?.max?.toLocaleString() || 0} / year
                                </p>
                            </section>

                            <section>
                                <h3>Statistics</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-lg)' }}>
                                    <div>
                                        <p className="text-muted" style={{ margin: 0 }}>Total Applicants</p>
                                        <h2 style={{ margin: 0, color: 'var(--primary)' }}>{selectedJob.applicants?.length || 0}</h2>
                                    </div>
                                    <div>
                                        <p className="text-muted" style={{ margin: 0 }}>Total Views</p>
                                        <h2 style={{ margin: 0, color: 'var(--accent)' }}>{selectedJob.views || 0}</h2>
                                    </div>
                                    <div>
                                        <p className="text-muted" style={{ margin: 0 }}>Posted On</p>
                                        <h3 style={{ margin: 0, color: 'var(--secondary)' }}>{formatDate(selectedJob.createdAt)}</h3>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <h3>Select a job to view details</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyJobsPage;
