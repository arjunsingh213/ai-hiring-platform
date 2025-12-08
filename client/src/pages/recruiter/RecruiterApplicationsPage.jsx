import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import OfferLetterModal from '../../components/OfferLetterModal';
import './RecruiterApplicationsPage.css';

const RecruiterApplicationsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApplicant, setSelectedApplicant] = useState(null);

    // Check if we came from MyJobsPage with a specific job filter
    const initialJobId = location.state?.filterJobId || '';
    const initialJobTitle = location.state?.filterJobTitle || '';

    const [filters, setFilters] = useState({
        status: '',
        interviewCompleted: '',
        sortBy: 'score',
        jobId: initialJobId  // Auto-set from navigation if provided
    });
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [uniqueJobs, setUniqueJobs] = useState([]);  // List of unique jobs for filter
    const [filterJobTitle, setFilterJobTitle] = useState(initialJobTitle);  // Display title for filtered job
    const [showOfferModal, setShowOfferModal] = useState(false);

    useEffect(() => {
        fetchApplicants();
    }, [filters]);

    const fetchApplicants = async () => {
        try {
            setLoading(true);
            // Handle both user object and separate userId
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : {};
            const userId = user._id || user.id || localStorage.getItem('userId');

            console.log('RecruiterApplicationsPage - userId:', userId);

            if (!userId) {
                console.error('No user ID found in localStorage');
                setLoading(false);
                return;
            }

            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.interviewCompleted) params.append('interviewCompleted', filters.interviewCompleted);
            if (filters.sortBy) params.append('sortBy', filters.sortBy);

            const response = await api.get(`/jobs/recruiter/${userId}/all-applicants?${params.toString()}`);
            console.log('Applicants response:', response);

            // Handle axios interceptor that may extract .data
            let applicantsData = Array.isArray(response) ? response :
                Array.isArray(response?.data) ? response.data : [];

            // Extract unique jobs for filter dropdown
            const jobsMap = new Map();
            applicantsData.forEach(item => {
                if (item.jobId && item.jobTitle && !jobsMap.has(item.jobId)) {
                    jobsMap.set(item.jobId, { id: item.jobId, title: item.jobTitle });
                }
            });
            setUniqueJobs(Array.from(jobsMap.values()));

            // Apply job filter client-side if selected
            if (filters.jobId) {
                applicantsData = applicantsData.filter(item => item.jobId === filters.jobId);
            }

            console.log('Applicants data:', applicantsData);
            setApplicants(applicantsData);

            if (applicantsData.length > 0 && !selectedApplicant) {
                setSelectedApplicant(applicantsData[0]);
            }
        } catch (error) {
            console.error('Error fetching applicants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleHire = () => {
        if (!selectedApplicant) return;
        setShowOfferModal(true);
    };

    const handleOfferSent = (hiringProcess) => {
        // Refresh applicants list to show updated status
        fetchApplicants();
        // Optionally navigate to hiring pipeline
        // navigate('/recruiter/hiring-pipeline');
    };

    const handleReject = async () => {
        if (!selectedApplicant) return;

        try {
            setActionLoading(true);
            // Extract userId - could be a string or object with _id
            const applicantUserId = selectedApplicant.applicant?.userId?._id ||
                selectedApplicant.applicant?.userId ||
                selectedApplicant.applicant?._id;

            if (!applicantUserId) {
                toast.error('Error: Could not find applicant ID');
                return;
            }

            await api.put(`/jobs/${selectedApplicant.jobId}/applicants/${applicantUserId}/reject`, {
                rejectionReason
            });
            toast.success('Candidate has been notified of the decision.');
            setShowRejectModal(false);
            setRejectionReason('');
            fetchApplicants();
        } catch (error) {
            toast.error('Error rejecting candidate: ' + (error.response?.data?.error || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleUndoReject = async () => {
        if (!selectedApplicant) return;

        try {
            setActionLoading(true);
            // Extract userId - could be a string or object with _id
            const applicantUserId = selectedApplicant.applicant?.userId?._id ||
                selectedApplicant.applicant?.userId ||
                selectedApplicant.applicant?._id;

            if (!applicantUserId) {
                toast.error('Error: Could not find applicant ID');
                return;
            }

            await api.put(`/jobs/${selectedApplicant.jobId}/applicants/${applicantUserId}/undo-reject`);
            toast.success('Rejection undone! The candidate has been notified and their application is back under consideration.');
            fetchApplicants();
        } catch (error) {
            toast.error('Error undoing rejection: ' + (error.response?.data?.error || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleMessage = () => {
        if (!selectedApplicant) return;

        // Extract user data from nested structure
        const userData = selectedApplicant.applicant?.userId || selectedApplicant.applicant || {};
        const profile = userData.profile || {};
        const userId = userData._id || selectedApplicant.applicant?.userId?._id || selectedApplicant.applicant?.userId;

        navigate('/recruiter/messages', {
            state: {
                selectedUser: {
                    _id: userId,
                    name: profile.name || userData.name || 'Candidate',
                    photo: profile.photo || userData.photo,
                    email: userData.email
                }
            }
        });
    };

    const getStatusBadge = (status) => {
        const badges = {
            applied: { class: 'badge-info', text: 'Applied' },
            reviewing: { class: 'badge-warning', text: 'Reviewing' },
            shortlisted: { class: 'badge-primary', text: 'Shortlisted' },
            interviewed: { class: 'badge-accent', text: 'Interviewed' },
            hired: { class: 'badge-success', text: 'Hired' },
            rejected: { class: 'badge-danger', text: 'Rejected' }
        };
        return badges[status] || badges.applied;
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'var(--success)';
        if (score >= 60) return 'var(--primary)';
        if (score >= 40) return 'var(--warning)';
        return 'var(--danger)';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="applications-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading applicants...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="applications-page">
            {/* Sidebar */}
            <div className="applications-sidebar">
                {/* Filters */}
                <div className="filters-section card">
                    <h3>🔍 Filters</h3>

                    <div className="filter-group">
                        <label>Job Position</label>
                        <select
                            className="input"
                            value={filters.jobId}
                            onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}
                        >
                            <option value="">All Jobs</option>
                            {uniqueJobs.map(job => (
                                <option key={job.id} value={job.id}>{job.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Status</label>
                        <select
                            className="input"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">All Status</option>
                            <option value="applied">Applied</option>
                            <option value="interviewed">Interviewed</option>
                            <option value="hired">Hired</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Interview</label>
                        <select
                            className="input"
                            value={filters.interviewCompleted}
                            onChange={(e) => setFilters({ ...filters, interviewCompleted: e.target.value })}
                        >
                            <option value="">All</option>
                            <option value="true">Completed</option>
                            <option value="false">Pending</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Sort By</label>
                        <select
                            className="input"
                            value={filters.sortBy}
                            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                        >
                            <option value="score">Interview Score</option>
                            <option value="date">Application Date</option>
                            <option value="name">Name</option>
                        </select>
                    </div>

                    <button
                        className="btn btn-secondary"
                        onClick={() => setFilters({ status: '', interviewCompleted: '', sortBy: 'score', jobId: '' })}
                    >
                        Clear Filters
                    </button>
                </div>

                {/* Applicant List */}
                <div className="applicants-list">
                    <div className="list-header">
                        <h3>
                            {filterJobTitle ? `Applicants for "${filterJobTitle}"` : 'Talent Pipeline'}
                            ({applicants.length})
                        </h3>
                        {filterJobTitle && (
                            <button
                                className="btn btn-text"
                                onClick={() => {
                                    setFilters({ ...filters, jobId: '' });
                                    setFilterJobTitle('');
                                    // Clear navigation state
                                    window.history.replaceState({}, document.title);
                                }}
                            >
                                Show All Applicants
                            </button>
                        )}
                    </div>
                    {applicants.map((item, index) => {
                        // Extract data with fallbacks (API returns nested structure)
                        const userData = item.applicant?.userId || item.applicant || {};
                        const profile = userData.profile || {};
                        const name = profile.name || userData.name || 'Unknown';
                        const photo = profile.photo || userData.photo;
                        const status = item.applicant?.status || 'applied';

                        return (
                            <div
                                key={index}
                                className={`applicant-item card ${selectedApplicant === item ? 'active' : ''}`}
                                onClick={() => setSelectedApplicant(item)}
                            >
                                <div className="applicant-avatar">
                                    {photo ? (
                                        <img src={photo} alt={name} />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {name.charAt(0) || '?'}
                                        </div>
                                    )}
                                </div>
                                <div className="applicant-info">
                                    <h4>{name}</h4>
                                    <p className="job-applied">{item.jobTitle}</p>
                                    <div className="applicant-meta">
                                        <span className={`badge ${getStatusBadge(status).class}`}>
                                            {getStatusBadge(status).text}
                                        </span>
                                        {item.interview?.overallScore > 0 && (
                                            <span
                                                className="score-badge"
                                                style={{ color: getScoreColor(item.interview.overallScore) }}
                                            >
                                                {item.interview.overallScore}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {applicants.length === 0 && (
                        <div className="empty-state">
                            <p>No applicants found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="applications-content">
                {selectedApplicant ? (() => {
                    // Extract data from nested structure
                    const userData = selectedApplicant.applicant?.userId || selectedApplicant.applicant || {};
                    const profile = userData.profile || {};
                    const jobSeekerProfile = userData.jobSeekerProfile || {};

                    const name = profile.name || userData.name || 'Unknown Candidate';
                    const photo = profile.photo || userData.photo;
                    const email = userData.email || profile.email || 'Not provided';
                    const profession = jobSeekerProfile.profession || profile.profession || 'Professional';
                    const experienceLevel = jobSeekerProfile.experienceLevel || 'Not specified';
                    const status = selectedApplicant.applicant?.status || 'applied';
                    const appliedAt = selectedApplicant.applicant?.appliedAt;
                    const notes = selectedApplicant.applicant?.notes || '';

                    return (
                        <>
                            {/* Header */}
                            <div className="applicant-header card">
                                <div className="header-left">
                                    <div className="large-avatar">
                                        {photo ? (
                                            <img src={photo} alt={name} />
                                        ) : (
                                            <div className="avatar-placeholder large">
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="header-info">
                                        <h1>{name}</h1>
                                        <p className="profession">{profession}</p>
                                        <p className="email">{email}</p>
                                        <div className="header-badges">
                                            <span className={`badge ${getStatusBadge(status).class}`}>
                                                {getStatusBadge(status).text}
                                            </span>
                                            <span className="badge">{experienceLevel}</span>
                                            {appliedAt && (
                                                <span className="badge">Applied: {formatDate(appliedAt)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="header-actions">
                                    {status !== 'hired' && status !== 'rejected' && (
                                        <>
                                            <button
                                                className="btn btn-success"
                                                onClick={handleHire}
                                                disabled={actionLoading}
                                            >
                                                ✓ Hire
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => setShowRejectModal(true)}
                                                disabled={actionLoading}
                                            >
                                                ✗ Reject
                                            </button>
                                        </>
                                    )}
                                    {status === 'rejected' && (
                                        <button
                                            className="btn btn-warning"
                                            onClick={handleUndoReject}
                                            disabled={actionLoading}
                                            title="Give this candidate another chance"
                                        >
                                            🔄 Reconsider
                                        </button>
                                    )}
                                    <button className="btn btn-primary" onClick={handleMessage}>
                                        💬 Message
                                    </button>
                                </div>
                            </div>

                            {/* Job Applied For */}
                            <div className="job-context card">
                                <h3>Applied For</h3>
                                <div className="job-info">
                                    <span className="job-title">{selectedApplicant.jobTitle}</span>
                                    {selectedApplicant.jobCompany && (
                                        <span className="company-name"> at {selectedApplicant.jobCompany}</span>
                                    )}
                                </div>
                            </div>

                            {/* Interview Results - Enhanced */}
                            {selectedApplicant.interview && selectedApplicant.interview.status === 'completed' && (
                                <div className="interview-results card">
                                    <h3>📊 Interview Results</h3>

                                    {/* Overall Score Circle */}
                                    <div className="scores-grid">
                                        <div className="score-item overall">
                                            <div
                                                className="score-circle"
                                                style={{
                                                    background: `conic-gradient(${getScoreColor(selectedApplicant.interview.overallScore || 0)} ${(selectedApplicant.interview.overallScore || 0) * 3.6}deg, var(--bg-tertiary) 0deg)`
                                                }}
                                            >
                                                <div className="score-inner">
                                                    <span className="score-value">{selectedApplicant.interview.overallScore || 0}</span>
                                                </div>
                                            </div>
                                            <span className="score-label">Overall Score</span>
                                        </div>

                                        {/* Technical Score Bar */}
                                        <div className="score-item">
                                            <div className="score-bar-container">
                                                <span className="score-title">🔧 Technical Knowledge</span>
                                                <div className="score-bar">
                                                    <div
                                                        className="score-fill"
                                                        style={{
                                                            width: `${selectedApplicant.interview.technicalScore || 0}%`,
                                                            background: getScoreColor(selectedApplicant.interview.technicalScore || 0)
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className="score-num">{selectedApplicant.interview.technicalScore || 0}%</span>
                                            </div>
                                        </div>

                                        {/* Communication Score Bar */}
                                        <div className="score-item">
                                            <div className="score-bar-container">
                                                <span className="score-title">💬 Communication</span>
                                                <div className="score-bar">
                                                    <div
                                                        className="score-fill"
                                                        style={{
                                                            width: `${selectedApplicant.interview.communicationScore || 0}%`,
                                                            background: getScoreColor(selectedApplicant.interview.communicationScore || 0)
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className="score-num">{selectedApplicant.interview.communicationScore || 0}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Match Score */}
                                    {selectedApplicant.interview.matchScore > 0 && (
                                        <div className="match-score-section" style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>JD Match Score:</span>
                                            <span style={{ fontWeight: 700, color: getScoreColor(selectedApplicant.interview.matchScore), marginLeft: 'var(--spacing-sm)' }}>
                                                {selectedApplicant.interview.matchScore}%
                                            </span>
                                        </div>
                                    )}

                                    {/* Passed/Failed Indicator */}
                                    <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}>
                                        {selectedApplicant.interview.passed ? (
                                            <span className="badge badge-success" style={{ fontSize: '1rem', padding: 'var(--spacing-sm) var(--spacing-lg)' }}>
                                                ✓ Interview Passed
                                            </span>
                                        ) : (
                                            <span className="badge badge-danger" style={{ fontSize: '1rem', padding: 'var(--spacing-sm) var(--spacing-lg)' }}>
                                                ✗ Did Not Pass
                                            </span>
                                        )}
                                    </div>

                                    {/* Strengths */}
                                    {selectedApplicant.interview.strengths?.length > 0 && (
                                        <div className="strengths-section" style={{ marginTop: 'var(--spacing-lg)' }}>
                                            <h4>💪 Strengths</h4>
                                            <div className="strength-tags">
                                                {selectedApplicant.interview.strengths.map((s, i) => (
                                                    <span key={i} className="strength-tag">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* View Full Report Button - only show if we have an interview ID */}
                                    {(selectedApplicant.interview._id || selectedApplicant.interview.id || selectedApplicant.interviewId) && (
                                        <button
                                            className="btn btn-secondary view-full-report"
                                            style={{ marginTop: 'var(--spacing-lg)', width: '100%' }}
                                            onClick={() => {
                                                const interviewId = selectedApplicant.interview._id ||
                                                    selectedApplicant.interview.id ||
                                                    selectedApplicant.interviewId;
                                                navigate(`/interview/${interviewId}/results`);
                                            }}
                                        >
                                            View Full Interview Report →
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Interview Pending */}
                            {(!selectedApplicant.interview || selectedApplicant.interview.status !== 'completed') && (
                                <div className="interview-pending card">
                                    <h3>⏳ Interview Pending</h3>
                                    <p>This candidate has not yet completed their AI interview.</p>
                                </div>
                            )}

                            {/* Recruiter Notes */}
                            <div className="notes-section card">
                                <h3>📝 Recruiter Notes</h3>
                                <textarea
                                    className="input notes-input"
                                    placeholder="Add private notes about this candidate..."
                                    value={notes}
                                    onChange={(e) => {
                                        const updated = { ...selectedApplicant };
                                        if (!updated.applicant) updated.applicant = {};
                                        updated.applicant.notes = e.target.value;
                                        setSelectedApplicant(updated);
                                    }}
                                    onBlur={async (e) => {
                                        try {
                                            const applicantUserId = selectedApplicant.applicant?.userId?._id || selectedApplicant.applicant?.userId;
                                            if (applicantUserId) {
                                                await api.post(`/jobs/${selectedApplicant.jobId}/applicants/${applicantUserId}/notes`, {
                                                    notes: e.target.value
                                                });
                                            }
                                        } catch (error) {
                                            console.error('Failed to save notes:', error);
                                        }
                                    }}
                                ></textarea>
                            </div>
                        </>
                    );
                })() : (
                    <div className="empty-state card">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                            <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" />
                            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                            <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <h3>Select an applicant to view details</h3>
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="modal-content card" onClick={e => e.stopPropagation()}>
                        <h2>Reject Candidate</h2>
                        <p>Please provide a reason for rejection (optional):</p>
                        <textarea
                            className="input"
                            placeholder="e.g., Position filled, qualifications not matching, etc."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        ></textarea>
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowRejectModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleReject}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Offer Letter Modal */}
            {selectedApplicant && (
                <OfferLetterModal
                    isOpen={showOfferModal}
                    onClose={() => setShowOfferModal(false)}
                    applicant={selectedApplicant.applicant}
                    job={selectedApplicant.job}
                    onOfferSent={handleOfferSent}
                />
            )}
        </div>
    );
};

export default RecruiterApplicationsPage;
