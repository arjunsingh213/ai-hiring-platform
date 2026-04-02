import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import CompleteProfileModal from '../../components/CompleteProfileModal';
import './JobDetailsPage.css';

const JobDetailsPage = () => {
    const { id: jobId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const userId = localStorage.getItem('userId');

    const [selectedJob, setSelectedJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('description');
    const [applying, setApplying] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [copied, setCopied] = useState(false);

    // Profile completeness gate
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // 'apply' | 'interview'

    useEffect(() => {
        if (jobId) fetchJob();
        // eslint-disable-next-line
    }, [jobId]);

    const fetchJob = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/jobs/${jobId}`);
            if (response.data) {
                setSelectedJob(response.data);
            }
        } catch (error) {
            console.error('Error fetching job details:', error);
            toast.error('Failed to load job details');
            navigate('/jobseeker/jobs'); // Fallback
        } finally {
            setLoading(false);
        }
    };

    const checkExistingApplication = async () => {
        try {
            return await api.get(`/jobs/${jobId}/interview-status/${userId}`);
        } catch (error) {
            return { hasInterview: false };
        }
    };

    const hasApplied = () => {
        if (!selectedJob) return false;
        return selectedJob.applicants?.some(app => app.userId === userId || app.userId?._id === userId);
    };

    const getApplicantStatus = () => {
        if (!selectedJob) return null;
        const applicant = selectedJob.applicants?.find(app => app.userId === userId || app.userId?._id === userId);
        return applicant?.status || null;
    };

    // Profile completeness check — blocks apply/interview if missing mandatory fields
    const checkProfileComplete = async (actionType) => {
        try {
            const response = await api.get(`/users/${userId}`);
            const user = response.data || response;

            console.log('[ProfileCheck] Checking user:', user?.profile?.name, 'Photo:', !!user?.profile?.photo, 'Mobile:', !!user?.profile?.mobile, 'DOB:', !!user?.profile?.dob, 'Resume:', !!user?.resume, 'DesiredRole:', !!user?.jobSeekerProfile?.desiredRole, 'Domains:', user?.jobSeekerProfile?.jobDomains?.length);

            const missing = [];
            if (!user.profile?.name) missing.push('name');
            if (!user.profile?.mobile) missing.push('mobile');
            if (!user.profile?.dob) missing.push('dob');
            if (!user.profile?.photo) missing.push('photo');
            if (!user.resume) missing.push('resume');
            if (!user.jobSeekerProfile?.desiredRole) missing.push('desiredRole');
            if (!user.jobSeekerProfile?.jobDomains || user.jobSeekerProfile.jobDomains.length === 0) missing.push('jobDomains');

            console.log('[ProfileCheck] Missing fields:', missing.length > 0 ? missing.join(', ') : 'NONE — profile complete');

            if (missing.length > 0) {
                setPendingAction(actionType);
                setShowProfileModal(true);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Profile check failed:', err);
            toast.error('Unable to verify profile. Please try again.');
            return false; // Block on error — don't let users bypass
        }
    };

    const handleProfileComplete = () => {
        setShowProfileModal(false);
        // Retry the action after profile is completed
        if (pendingAction === 'apply') {
            applyToJob(true); // skip check
        } else if (pendingAction === 'interview') {
            startInterview(true); // skip check
        }
        setPendingAction(null);
    };

    const applyToJob = async (skipCheck = false) => {
        if (!userId) {
            toast.warning('Please login to apply for jobs');
            navigate('/login');
            return;
        }

        // Check profile completeness before applying
        if (!skipCheck) {
            const isComplete = await checkProfileComplete('apply');
            if (!isComplete) return;
        }

        setApplying(true);
        try {
            const existingStatus = await checkExistingApplication();

            if (existingStatus.hasInterview && existingStatus.interview?.status === 'completed') {
                toast.info('You have already completed the interview for this job');
                setApplying(false);
                return;
            }

            if (existingStatus.hasInterview && existingStatus.interview?.id) {
                navigate(`/interview/${existingStatus.interview.id}/ready`);
                return;
            }

            const response = await api.post(`/jobs/${jobId}/apply`, { userId });

            if (response.applicationPending) {
                toast.success('Application submitted! Stay tuned for updates.');
                fetchJob();
            } else if (response.interviewRequired && response.interviewId) {
                navigate(`/interview/${response.interviewId}/ready`);
            } else {
                toast.success('Application submitted!');
                fetchJob();
            }
        } catch (error) {
            console.error('Error applying to job:', error);
            // If server blocks due to incomplete profile, show the modal
            if (error.profileIncomplete) {
                setPendingAction('apply');
                setShowProfileModal(true);
                toast.warning('Please complete your profile before applying.');
            } else {
                toast.error(error.error || 'Failed to apply. Please try again.');
            }
        } finally {
            setApplying(false);
        }
    };

    const withdrawFromJob = async () => {
        if (!userId) return;

        setWithdrawing(true);
        try {
            await api.delete(`/jobs/${jobId}/withdraw`, { data: { userId } });
            toast.success('Application withdrawn successfully');
            fetchJob();
        } catch (error) {
            console.error('Error withdrawing application:', error);
            toast.error(error.message || 'Failed to withdraw application');
        } finally {
            setWithdrawing(false);
        }
    };

    const startInterview = async (skipCheck = false) => {
        // Check profile completeness before starting interview
        if (!skipCheck) {
            const isComplete = await checkProfileComplete('interview');
            if (!isComplete) return;
        }

        setApplying(true);
        try {
            const existingStatus = await checkExistingApplication();
            if (existingStatus.hasInterview && existingStatus.interview?.id) {
                navigate(`/interview/${existingStatus.interview.id}/ready`);
                return;
            }

            const interviewResponse = await api.post('/job-interview/start', { userId, jobId });

            if (interviewResponse.interview?.id) {
                toast.success('Interview ready! Redirecting...');
                navigate(`/interview/${interviewResponse.interview.id}/ready`);
            } else {
                toast.error('Failed to start interview. Please try again.');
            }
        } catch (error) {
            console.error('Error starting interview:', error);
            if (error.profileIncomplete) {
                setPendingAction('interview');
                setShowProfileModal(true);
                toast.warning('Please complete your profile before starting the interview.');
            } else {
                toast.error(error.error || 'Failed to start interview. Please try again.');
            }
        } finally {
            setApplying(false);
        }
    };

    const handleShareJob = async () => {
        if (!selectedJob) return;
        const shareUrl = `${window.location.origin}/jobs/${selectedJob._id}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('Share link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Clipboard write failed, using fallback:', err);
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

    if (loading) {
        return (
            <div className="job-details-page-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!selectedJob) {
        return (
            <div className="job-details-page-error">
                <h2>Job Not Found</h2>
                <button className="btn btn-primary" onClick={() => navigate('/jobseeker/jobs')}>Return to Jobs</button>
            </div>
        );
    }

    return (
        <>
        <div className="job-details-page">
            <div className="job-details-page-header">
                <button className="btn btn-ghost btn-back" onClick={() => navigate('/jobseeker/jobs')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Back to Jobs
                </button>
            </div>

            <div className="job-details-main-content">
                <div className="job-header-card">
                    <div className="job-title-section-lg">
                        <h1>{selectedJob.title}</h1>
                        {(selectedJob.company?.name || selectedJob.company?.location) && (
                            <p className="company-info-lg">
                                {selectedJob.company?.name}{selectedJob.company?.name && selectedJob.company?.location && ' • '}{selectedJob.company?.location}
                            </p>
                        )}
                        <div className="job-badges-lg">
                            {selectedJob.jobDetails?.type && <span className="badge">{selectedJob.jobDetails.type}</span>}
                            {selectedJob.requirements?.experienceLevel && <span className="badge badge-primary">{selectedJob.requirements.experienceLevel}</span>}
                            {selectedJob.jobDetails?.remote && <span className="badge badge-success">Remote</span>}
                        </div>
                    </div>
                    <div className="job-actions-lg">
                        {hasApplied() ? (
                            getApplicantStatus() === 'interviewing' ? (
                                <div className="apply-section">
                                    <div className="action-buttons-row">
                                        <button className="btn btn-lg" onClick={startInterview} disabled={applying}>
                                            {applying ? 'Starting...' : 'Start Now'}
                                        </button>
                                        <button className="btn btn-share btn-icon-only" onClick={handleShareJob} title="Copy shareable link">
                                            {copied ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="apply-info-message">Your application has been approved! Click to start the interview.</p>
                                </div>
                            ) : (
                                <div className="applied-status-group">
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                                        <div className="applied-indicator-lg">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span>Applied</span>
                                        </div>
                                        <button className="btn btn-share btn-icon-only" onClick={handleShareJob} title="Copy shareable link">
                                            {copied ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="status-note">Stay tuned! Your application is being reviewed.</p>
                                    <button className="btn btn-withdraw btn-sm" onClick={withdrawFromJob} disabled={withdrawing}>
                                        {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                                    </button>
                                </div>
                            )
                        ) : (
                            <div className="apply-section">
                                <div className="action-buttons-row">
                                    <button className="btn btn-lg" onClick={applyToJob} disabled={applying}>
                                        {applying ? 'Applying...' : 'Apply Now'}
                                    </button>
                                    <button className="btn btn-share btn-icon-only" onClick={handleShareJob} title="Copy shareable link">
                                        {copied ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                        )}
                                    </button>
                                </div>
                                <p className="apply-info-message">Complete the Platform Interview to stand out!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="job-tabs-container">
                    <div className="job-details-tabs">
                        <button className={`details-tab-btn ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>Job Description</button>
                        <button className={`details-tab-btn ${activeTab === 'company' ? 'active' : ''}`} onClick={() => setActiveTab('company')}>Company Profile</button>
                    </div>

                    <div className="job-content-area">
                        {activeTab === 'description' ? (
                            <div className="content-pane">
                                <section>
                                    <h3>About the Role</h3>
                                    <p>{selectedJob.description}</p>
                                </section>
                                <section>
                                    <h3>Required Skills</h3>
                                    <div className="skills-list">
                                        {selectedJob.requirements?.skills?.map((skill, index) => (
                                            <span key={index} className="skill-tag badge">{skill}</span>
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
                                        <p>{selectedJob.jobDetails.salary.currency} {selectedJob.jobDetails.salary.min?.toLocaleString()} - {selectedJob.jobDetails.salary.max?.toLocaleString()} / {selectedJob.jobDetails.salary.period}</p>
                                    </section>
                                )}
                                <section className="interview-notice mt-4">
                                    <h3>🤖 AI Interview Required</h3>
                                    <p>After applying, you'll complete a brief AI-powered interview. Our AI will:</p>
                                    <ul>
                                        <li>✓ Match your resume with the job requirements</li>
                                        <li>✓ Ask personalized questions based on your experience</li>
                                        <li>✓ Evaluate your responses in real-time</li>
                                        <li>✓ Generate a comprehensive report for the recruiter</li>
                                    </ul>
                                    <p className="text-muted">Typically takes 15-20 minutes</p>
                                </section>
                            </div>
                        ) : (
                            <div className="content-pane">
                                <section>
                                    <h3>About {selectedJob.company?.name || 'Company'}</h3>
                                    <p>{selectedJob.company?.description || 'Company description is currently confidential or not provided.'}</p>
                                </section>
                                <section className="company-details-grid grid-layout">
                                    <div className="detail-item">
                                        <h4>Industry</h4>
                                        <p>{selectedJob.company?.industry || 'Confidential'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <h4>Company Size</h4>
                                        <p>{selectedJob.company?.size || 'Confidential'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <h4>Location</h4>
                                        <p>{selectedJob.company?.location || 'Unspecified'}</p>
                                    </div>
                                    <div className="detail-item">
                                        <h4>Website</h4>
                                        <p>
                                            {selectedJob.company?.website ? (
                                                <a href={selectedJob.company.website.startsWith('http') ? selectedJob.company.website : `https://${selectedJob.company.website}`} target="_blank" rel="noopener noreferrer">Visit Website ↗</a>
                                            ) : 'Not provided'}
                                        </p>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

            {/* Profile Completeness Modal */}
            <CompleteProfileModal
                isOpen={showProfileModal}
                onClose={() => { setShowProfileModal(false); setPendingAction(null); }}
                onComplete={handleProfileComplete}
                action={pendingAction || 'apply'}
            />
        </>
    );
};

export default JobDetailsPage;
