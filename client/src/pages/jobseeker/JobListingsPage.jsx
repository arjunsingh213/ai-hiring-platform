import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import './JobListingsPage.css';

const JobListingsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const queryParams = new URLSearchParams(location.search);
    const jobIdFromUrl = queryParams.get('id');

    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [activeTab, setActiveTab] = useState('description');
    const [showMobileDetails, setShowMobileDetails] = useState(false); // NEW: For mobile job details modal
    const [categoryFilter, setCategoryFilter] = useState('all'); // all, applied, rejected
    const [filters, setFilters] = useState({
        type: '',
        experienceLevel: ''
    });
    const [applying, setApplying] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [platformInterviewStatus, setPlatformInterviewStatus] = useState(null);
    const [copied, setCopied] = useState(false);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchJobs();
        if (userId) {
            checkPlatformInterviewStatus();
        }
    }, [filters]);

    // Check if user has passed platform interview
    const checkPlatformInterviewStatus = async () => {
        try {
            const response = await api.get(`/onboarding-interview/check-status/${userId}`);
            if (response.success) {
                setPlatformInterviewStatus(response.data || response); // Handle structure variation
            }
        } catch (error) {
            console.error('Error checking platform interview status:', error);
        }
    };

    const fetchJobs = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.type) params.append('type', filters.type);
            if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);

            const response = await api.get(`/jobs?${params.toString()}`);
            const fetchedJobs = response.data || [];
            setJobs(fetchedJobs);

            if (fetchedJobs.length > 0) {
                if (jobIdFromUrl) {
                    const targetJob = fetchedJobs.find(j => j._id === jobIdFromUrl);
                    if (targetJob) {
                        setSelectedJob(targetJob);
                        setShowMobileDetails(true);
                    } else if (!selectedJob) {
                        setSelectedJob(fetchedJobs[0]);
                    }
                } else if (!selectedJob) {
                    setSelectedJob(fetchedJobs[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
    };

    const checkExistingApplication = async (jobId) => {
        try {
            const response = await api.get(`/jobs/${jobId}/interview-status/${userId}`);
            return response;
        } catch (error) {
            return { hasInterview: false };
        }
    };

    const applyToJob = async (jobId) => {
        if (!userId) {
            toast.warning('Please login to apply for jobs');
            navigate('/login');
            return;
        }

        setApplying(true);

        try {
            // Check if already applied
            const existingStatus = await checkExistingApplication(jobId);

            if (existingStatus.hasInterview && existingStatus.interview?.status === 'completed') {
                toast.info('You have already completed the interview for this job');
                setApplying(false);
                return;
            }

            if (existingStatus.hasInterview && existingStatus.interview?.id) {
                navigate(`/ interview / ${existingStatus.interview.id}/ready`);
                return;
            }

            // Apply to job
            const response = await api.post(`/jobs/${jobId}/apply`, { userId });

            if (response.applicationPending) {
                // Application submitted — awaiting admin review
                toast.success('Application submitted! Stay tuned for updates.');
                fetchJobs();
            } else if (response.interviewRequired && response.interviewId) {
                // Application already approved — resume interview
                navigate(`/interview/${response.interviewId}/ready`);
            } else {
                toast.success('Application submitted!');
                fetchJobs();
            }
        } catch (error) {
            console.error('Error applying to job:', error);
            toast.error(error.error || 'Failed to apply. Please try again.');
        } finally {
            setApplying(false);
        }
    };

    const withdrawFromJob = async (jobId) => {
        if (!userId) return;

        setWithdrawing(true);
        try {
            await api.delete(`/jobs/${jobId}/withdraw`, { data: { userId } });
            toast.success('Application withdrawn successfully');
            fetchJobs();
            // Update selected job if it's the one we withdrew from
            if (selectedJob?._id === jobId) {
                const updatedJob = { ...selectedJob };
                updatedJob.applicants = updatedJob.applicants?.filter(
                    app => app.userId !== userId && app.userId?._id !== userId
                );
                setSelectedJob(updatedJob);
            }
        } catch (error) {
            console.error('Error withdrawing application:', error);
            toast.error(error.message || 'Failed to withdraw application');
        } finally {
            setWithdrawing(false);
        }
    };

    const hasApplied = (job) => {
        return job.applicants?.some(app => app.userId === userId || app.userId?._id === userId);
    };

    // Get applicant status for a job (applied, interviewing, rejected, etc.)
    const getApplicantStatus = (job) => {
        const applicant = job.applicants?.find(app => app.userId === userId || app.userId?._id === userId);
        return applicant?.status || null;
    };

    // Start interview after admin approval
    const startInterview = async (jobId) => {
        setApplying(true);
        try {
            // First check if there's already an interview
            const existingStatus = await checkExistingApplication(jobId);
            if (existingStatus.hasInterview && existingStatus.interview?.id) {
                navigate(`/interview/${existingStatus.interview.id}/ready`);
                return;
            }

            // Create new job-specific interview
            const interviewResponse = await api.post('/job-interview/start', {
                userId,
                jobId
            });

            if (interviewResponse.interview?.id) {
                toast.success('Interview ready! Redirecting...');
                navigate(`/interview/${interviewResponse.interview.id}/ready`);
            } else {
                toast.error('Failed to start interview. Please try again.');
            }
        } catch (error) {
            console.error('Error starting interview:', error);
            toast.error(error.error || 'Failed to start interview. Please try again.');
        } finally {
            setApplying(false);
        }
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

    return (
        <div className="job-listings">
            {/* Apply Success Modal */}
            {showApplyModal && (
                <div className="modal-overlay">
                    <div className="apply-modal card-glass">
                        <div className="success-icon">✓</div>
                        <h2>Application Submitted!</h2>
                        <p>Preparing your AI Interview...</p>
                        <div className="loading-bar">
                            <div className="loading-progress"></div>
                        </div>
                        <p className="modal-note">You'll be evaluated by our AI interviewer</p>
                    </div>
                </div>
            )}

            {/* Category Tabs + Filters */}
            <div className="jobs-header">
                <div className="category-tabs">
                    <button
                        className={`category-tab ${categoryFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setCategoryFilter('all')}
                    >
                        All Jobs
                    </button>
                    <button
                        className={`category-tab ${categoryFilter === 'applied' ? 'active' : ''}`}
                        onClick={() => setCategoryFilter('applied')}
                    >
                        Applied
                    </button>
                    <button
                        className={`category-tab ${categoryFilter === 'rejected' ? 'active' : ''}`}
                        onClick={() => setCategoryFilter('rejected')}
                    >
                        Rejected
                    </button>
                </div>
                <div className="filter-controls">
                    <select
                        className="filter-select"
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    >
                        <option value="">All Types</option>
                        <option value="full-time">Full Time</option>
                        <option value="part-time">Part Time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                    </select>
                    <select
                        className="filter-select"
                        value={filters.experienceLevel}
                        onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
                    >
                        <option value="">All Levels</option>
                        <option value="entry">Entry Level</option>
                        <option value="mid">Mid Level</option>
                        <option value="senior">Senior Level</option>
                        <option value="expert">Expert</option>
                    </select>
                </div>
            </div>

            {/* Main Content Area - Two Columns: Jobs List (prominent) + Job Details */}
            <div className="jobs-content">
                <div className="jobs-list">
                    <div className="jobs-count">Jobs ({jobs.filter(job => {
                        if (categoryFilter === 'applied') return hasApplied(job);
                        if (categoryFilter === 'rejected') return false; // Add rejected logic
                        return true;
                    }).length})</div>
                    {jobs.filter(job => {
                        if (categoryFilter === 'applied') return hasApplied(job);
                        if (categoryFilter === 'rejected') return false;
                        return true;
                    }).map((job) => (
                        <div
                            key={job._id}
                            className={`job-card ${selectedJob?._id === job._id ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedJob(job);
                                setShowMobileDetails(true); // Show modal on mobile
                            }}
                        >
                            <div className="job-card-main">
                                <div className="company-avatar">
                                    {job.company?.logo ? (
                                        <img src={job.company.logo} alt={job.company.name} />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {job.company?.name?.charAt(0) || 'C'}
                                        </div>
                                    )}
                                </div>
                                <div className="job-info">
                                    <h4>{job.title}</h4>
                                    <p className="company-name">{job.company?.name || 'Company'}</p>
                                    <p className="job-type">• {job.jobDetails?.type}</p>
                                </div>
                            </div>
                            {hasApplied(job) && (
                                <span className={`applied-badge ${getApplicantStatus(job) === 'interviewing' ? 'approved' : ''}`}>
                                    {getApplicantStatus(job) === 'interviewing' ? 'Approved' : 'Applied'}
                                </span>
                            )}
                        </div>
                    ))}
                    {jobs.length === 0 && (
                        <div className="empty-state">
                            <p>No jobs found</p>
                        </div>
                    )}
                </div>


                <div className={`job-details ${showMobileDetails ? 'mobile-visible' : ''}`}>
                    {selectedJob ? (
                        <>
                            {/* Mobile Close Button */}
                            {showMobileDetails && (
                                <button
                                    className="mobile-close-btn"
                                    onClick={() => setShowMobileDetails(false)}
                                    aria-label="Close job details"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                            <div className="job-header">
                                <div className="company-logo">
                                    {selectedJob.company?.logo ? (
                                        <img src={selectedJob.company.logo} alt={selectedJob.company.name} />
                                    ) : (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                            <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" />
                                        </svg>
                                    )}
                                </div>
                                <div className="job-title-section">
                                    <h1>{selectedJob.title}</h1>
                                    {(selectedJob.company?.name || selectedJob.company?.location) && (
                                        <p className="company-info">
                                            {selectedJob.company?.name}{selectedJob.company?.name && selectedJob.company?.location && ' • '}{selectedJob.company?.location}
                                        </p>
                                    )}
                                    <div className="job-badges">
                                        {selectedJob.jobDetails?.type && <span className="badge">{selectedJob.jobDetails.type}</span>}
                                        {selectedJob.requirements?.experienceLevel && <span className="badge badge-primary">{selectedJob.requirements.experienceLevel}</span>}
                                        {selectedJob.jobDetails?.remote && <span className="badge badge-success">Remote</span>}
                                    </div>
                                </div>
                                <div className="job-actions">
                                    {hasApplied(selectedJob) ? (
                                        getApplicantStatus(selectedJob) === 'interviewing' ? (
                                            /* Approved — show Start Now button */
                                            <div className="apply-section">
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                                    onClick={() => startInterview(selectedJob._id)}
                                                    disabled={applying}
                                                >
                                                    {applying ? (
                                                        <>
                                                            <span className="loading-spinner"></span>
                                                            Starting...
                                                        </>
                                                    ) : (
                                                        <>Start Now</>
                                                    )}
                                                </button>
                                                <p style={{ fontSize: '0.78rem', color: '#10b981', margin: '6px 0 0', fontWeight: '500' }}>
                                                    Your application has been approved! Click to start the interview.
                                                </p>
                                            </div>
                                        ) : (
                                            /* Pending review — show Applied + Stay tuned */
                                            <div className="applied-status-group">
                                                <div className="applied-indicator">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    <span>Applied</span>
                                                </div>
                                                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 8px' }}>
                                                    Stay tuned! Your application is being reviewed.
                                                </p>
                                                <button
                                                    className="btn btn-withdraw"
                                                    onClick={() => withdrawFromJob(selectedJob._id)}
                                                    disabled={withdrawing}
                                                >
                                                    {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="apply-section">
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => applyToJob(selectedJob._id)}
                                                disabled={applying}
                                            >
                                                {applying ? (
                                                    <>
                                                        <span className="loading-spinner"></span>
                                                        Applying...
                                                    </>
                                                ) : (
                                                    <>Apply Now</>
                                                )}
                                            </button>
                                            <p className="apply-info-message" style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                                                Complete the <Link to="/jobseeker/interviews">Platform Interview</Link> to stand out!
                                            </p>
                                        </div>
                                    )}
                                    <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={handleShareJob} title="Copy shareable link">
                                        {copied ? (
                                            <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!</>
                                        ) : (
                                            <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Share</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="job-tabs">
                                <button
                                    className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('description')}
                                >
                                    Job Description
                                </button>
                                <button
                                    className={`tab-btn ${activeTab === 'company' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('company')}
                                >
                                    Company Profile
                                </button>
                            </div>

                            <div className="job-content card">
                                {activeTab === 'description' ? (
                                    <>
                                        <section>
                                            <h3>About the Role</h3>
                                            <p>{selectedJob.description}</p>
                                        </section>

                                        <section>
                                            <h3>Required Skills</h3>
                                            <div className="skills-list">
                                                {selectedJob.requirements?.skills?.map((skill, index) => (
                                                    <span key={index} className="skill-tag">{skill}</span>
                                                ))}
                                            </div>
                                        </section>

                                        <section>
                                            <h3>Requirements</h3>
                                            <ul>
                                                <li>Experience: {selectedJob.requirements?.minExperience || 0} - {selectedJob.requirements?.maxExperience || 5} years</li>
                                                <li>Education: {selectedJob.requirements?.education?.join(', ') || 'Not specified'}</li>
                                            </ul>
                                        </section>

                                        {selectedJob.jobDetails?.salary && (
                                            <section>
                                                <h3>Compensation</h3>
                                                <p>
                                                    {selectedJob.jobDetails.salary.currency} {selectedJob.jobDetails.salary.min?.toLocaleString()} - {selectedJob.jobDetails.salary.max?.toLocaleString()} / {selectedJob.jobDetails.salary.period}
                                                </p>
                                            </section>
                                        )}

                                        {/* AI Interview Notice */}
                                        <section className="interview-notice card-glass">
                                            <h3>🤖 AI Interview Required</h3>
                                            <p>
                                                After applying, you'll complete a brief AI-powered interview. Our AI will:
                                            </p>
                                            <ul>
                                                <li>✓ Match your resume with the job requirements</li>
                                                <li>✓ Ask personalized questions based on your experience</li>
                                                <li>✓ Evaluate your responses in real-time</li>
                                                <li>✓ Generate a comprehensive report for the recruiter</li>
                                            </ul>
                                            <p className="text-muted">Typically takes 15-20 minutes</p>
                                        </section>
                                    </>
                                ) : (
                                    <>
                                        <section>
                                            <h3>About {selectedJob.company?.name || 'Company'}</h3>
                                            <p>{selectedJob.company?.description || 'Company description is currently confidential or not provided for this listing.'}</p>
                                        </section>

                                        <section className="company-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
                                            <div className="detail-item">
                                                <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 4px' }}>Industry</h4>
                                                <p style={{ margin: 0, fontWeight: 500 }}>{selectedJob.company?.industry || 'Confidential'}</p>
                                            </div>
                                            <div className="detail-item">
                                                <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 4px' }}>Company Size</h4>
                                                <p style={{ margin: 0, fontWeight: 500 }}>{selectedJob.company?.size || 'Confidential'}</p>
                                            </div>
                                            <div className="detail-item">
                                                <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 4px' }}>Location</h4>
                                                <p style={{ margin: 0, fontWeight: 500 }}>{selectedJob.company?.location || 'Remote / Unspecified'}</p>
                                            </div>
                                            <div className="detail-item">
                                                <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 4px' }}>Website</h4>
                                                <p style={{ margin: 0, fontWeight: 500 }}>
                                                    {selectedJob.company?.website ? (
                                                        <a href={selectedJob.company.website.startsWith('http') ? selectedJob.company.website : `https://${selectedJob.company.website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>Visit Website ↗</a>
                                                    ) : 'Not provided'}
                                                </p>
                                            </div>
                                        </section>
                                    </>
                                )}
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
        </div>
    );
};

export default JobListingsPage;

