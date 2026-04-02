import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import './MyJobsPage.css';

const MyJobsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    // Read ?id= from URL for shared links
    const queryParams = new URLSearchParams(location.search);
    const jobIdFromUrl = queryParams.get('id');

    // Delete confirmation modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchMyJobs();
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

            if (jobsData.length > 0) {
                if (jobIdFromUrl) {
                    const targetJob = jobsData.find(j => j._id === jobIdFromUrl);
                    if (targetJob) {
                        setSelectedJob(targetJob);
                    } else {
                        setSelectedJob(prev => prev || jobsData[0]);
                    }
                } else {
                    setSelectedJob(prev => prev || jobsData[0]);
                }
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

    const getStatusClass = (status) => {
        const statusMap = {
            active: 'active',
            closed: 'closed',
            draft: 'draft',
            paused: 'draft'
        };
        return statusMap[status] || 'active';
    };

    const getStatusText = (status) => {
        const statusMap = {
            active: 'Active',
            closed: 'Closed',
            draft: 'Draft',
            paused: 'Paused'
        };
        return statusMap[status] || 'Active';
    };

    // Calculate stats
    const totalApplicants = jobs.reduce((sum, job) => sum + (job.applicants?.length || 0), 0);
    const totalViews = jobs.reduce((sum, job) => sum + (job.views || 0), 0);
    const activeJobs = jobs.filter(job => job.status === 'active').length;

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

    // Share Job - copy shareable link to clipboard
    const handleShareJob = async () => {
        if (!selectedJob) return;
        const shareUrl = `${window.location.origin}/jobs/${selectedJob._id}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('Share link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            toast.success('Share link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Open delete confirmation modal
    const handleDeleteClick = () => {
        if (!selectedJob) return;
        setShowDeleteModal(true);
    };

    // Confirm delete
    const confirmDelete = async () => {
        if (!selectedJob) return;

        setDeleting(true);
        try {
            await api.delete(`/jobs/${selectedJob._id}`);
            toast.success(`"${selectedJob.title}" deleted successfully`);

            // Remove from local state and select next job
            const remainingJobs = jobs.filter(j => j._id !== selectedJob._id);
            setJobs(remainingJobs);
            setSelectedJob(remainingJobs[0] || null);
            setShowDeleteModal(false);
        } catch (error) {
            console.error('Error deleting job:', error);
            toast.error('Failed to delete job: ' + (error.response?.data?.error || error.message));
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="my-jobs-page">
                <div className="bento-grid">
                    <div className="bento-card header-card">
                        <h1>Loading...</h1>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="my-jobs-page">
            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
                    <div className="bento-card delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <div className="delete-modal-icon">
                                🗑️
                            </div>
                            <h2>Delete Job?</h2>
                            <p>
                                Are you sure you want to delete <strong>"{selectedJob?.title}"</strong>?
                            </p>
                        </div>

                        <div className="delete-modal-warning">
                            <p>
                                ⚠️ This will permanently remove the job from all listings.
                            </p>
                        </div>

                        <div className="modal-footer-actions">
                            <button
                                className="btn-action secondary"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-action danger"
                                onClick={confirmDelete}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Delete Job'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bento-grid">
                {/* Jobs List Card */}
                <div className="bento-card jobs-list-card">
                    <div className="jobs-list-header">
                        <h3>All Jobs</h3>
                        <button
                            className="btn-post-new-small"
                            onClick={() => navigate('/recruiter/post-job')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            New Job
                        </button>
                    </div>
                    {jobs.map((job) => (
                        <div
                            key={job._id}
                            className={`job-list-item ${selectedJob?._id === job._id ? 'active' : ''}`}
                            onClick={() => setSelectedJob(job)}
                        >
                            <h4>{job.title}</h4>
                            <p className="job-location">{job.jobDetails?.location || 'Remote'}</p>
                            <p className="job-meta">
                                {job.applicants?.length || 0} applicants • {formatDate(job.createdAt)}
                            </p>
                            <span className={`status-badge ${getStatusClass(job.status)}`}>
                                {getStatusText(job.status)}
                            </span>
                        </div>
                    ))}
                    {jobs.length === 0 && (
                        <div className="empty-state-card">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="2" y="7" width="20" height="14" rx="2"></rect>
                                <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21"></path>
                            </svg>
                            <h3>No jobs posted yet</h3>
                            <button
                                className="btn-post-new"
                                style={{ marginTop: '16px' }}
                                onClick={() => navigate('/recruiter/post-job')}
                            >
                                Post Your First Job
                            </button>
                        </div>
                    )}
                </div>

                {/* Job Details Card */}
                <div className="bento-card job-details-card">
                    {selectedJob ? (
                        <>
                            {/* Job Info Header */}
                            <div className="job-info-header">
                                <div className="job-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="7" width="20" height="14" rx="2"></rect>
                                        <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21"></path>
                                    </svg>
                                </div>
                                <div className="job-info-content">
                                    <h2>{selectedJob.title}</h2>
                                    <p className="location-type">
                                        {selectedJob.jobDetails?.location || 'Remote'} • {selectedJob.jobDetails?.type || 'Full-time'}
                                    </p>
                                    <div className="job-badges-row">
                                        <span className={`job-badge primary`}>
                                            {getStatusText(selectedJob.status)}
                                        </span>
                                        <span className="job-badge">{selectedJob.applicants?.length || 0} Applicants</span>
                                        <span className="job-badge">{selectedJob.views || 0} Views</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="job-actions-row">
                                <button
                                    className="btn-action primary"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    onClick={() => navigate('/recruiter/applications', {
                                        state: { filterJobId: selectedJob._id, filterJobTitle: selectedJob.title }
                                    })}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    View Applicants ({selectedJob.applicants?.length || 0})
                                </button>
                                <button
                                    className="btn-action secondary"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    onClick={handleEditJob}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    Edit Job
                                </button>
                                <button
                                    className="btn-action secondary"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    onClick={handleShareJob}
                                    title="Copy shareable link"
                                >
                                    {copied ? (
                                        <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!</>
                                    ) : (
                                        <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Share</>
                                    )}
                                </button>
                                <button
                                    className="btn-action danger"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    onClick={handleDeleteClick}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    Delete
                                </button>
                            </div>

                            {/* Content Sections */}
                            <div className="content-sections">
                                {/* Description */}
                                <div className="content-section full-width">
                                    <h3>Description</h3>
                                    <p>{selectedJob.description || 'No description provided.'}</p>
                                </div>

                                {/* Skills */}
                                <div className="content-section">
                                    <h3>Required Skills</h3>
                                    <div className="skills-list">
                                        {selectedJob.requirements?.skills?.map((skill, i) => (
                                            <span key={i} className="skill-tag">{skill}</span>
                                        ))}
                                        {(!selectedJob.requirements?.skills || selectedJob.requirements.skills.length === 0) && (
                                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>No skills specified</span>
                                        )}
                                    </div>
                                </div>

                                {/* Experience */}
                                <div className="content-section">
                                    <h3>Experience Required</h3>
                                    <p>{selectedJob.requirements?.minExperience || 0} - {selectedJob.requirements?.maxExperience || 10} years</p>
                                </div>

                                {/* Salary */}
                                <div className="content-section">
                                    <h3>Compensation</h3>
                                    <p>
                                        {selectedJob.jobDetails?.salary?.currency || 'USD'} {selectedJob.jobDetails?.salary?.min?.toLocaleString() || 0} - {selectedJob.jobDetails?.salary?.max?.toLocaleString() || 0} / {selectedJob.jobDetails?.salary?.period === 'hourly' ? 'hr' : selectedJob.jobDetails?.salary?.period === 'monthly' ? 'mo' : 'yr'}
                                    </p>
                                </div>

                                {/* Education */}
                                <div className="content-section">
                                    <h3>Education</h3>
                                    <p>{selectedJob.requirements?.education?.join(', ') || 'Not specified'}</p>
                                </div>

                                {/* Statistics */}
                                <div className="content-section full-width">
                                    <h3>Statistics</h3>
                                    <div className="stats-mini-grid">
                                        <div className="mini-stat">
                                            <div className="value">{selectedJob.applicants?.length || 0}</div>
                                            <div className="label">Applicants</div>
                                        </div>
                                        <div className="mini-stat">
                                            <div className="value">{selectedJob.views || 0}</div>
                                            <div className="label">Views</div>
                                        </div>
                                        <div className="mini-stat">
                                            <div className="value">{formatDate(selectedJob.createdAt)}</div>
                                            <div className="label">Posted</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state-card">
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="2" y="7" width="20" height="14" rx="2"></rect>
                                <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21"></path>
                            </svg>
                            <h3>Select a job to view details</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyJobsPage;
