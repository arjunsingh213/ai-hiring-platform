import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import OfferLetterModal from '../../components/OfferLetterModal';
import { ListSkeleton, CardSkeleton } from '../../components/Skeleton';
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
        jobId: initialJobId,
        minScore: '',
        maxScore: ''
    });
    // Separate pending score input state (only applied when clicking Apply)
    const [pendingScore, setPendingScore] = useState({ min: '', max: '' });
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

            // Apply score range filter
            if (filters.minScore !== '' || filters.maxScore !== '') {
                const minScore = filters.minScore !== '' ? parseInt(filters.minScore) : 0;
                const maxScore = filters.maxScore !== '' ? parseInt(filters.maxScore) : 100;
                applicantsData = applicantsData.filter(item => {
                    const score = item.interview?.overallScore || 0;
                    return score >= minScore && score <= maxScore;
                });
            }

            console.log('Applicants data:', applicantsData);
            setApplicants(applicantsData);

            // Don't auto-select - only show details when user clicks on an applicant
            // Reset selection if current selection is not in the filtered list
            if (selectedApplicant) {
                const isInList = applicantsData.some(item =>
                    (item.applicant?.userId?._id || item.applicant?.userId) ===
                    (selectedApplicant.applicant?.userId?._id || selectedApplicant.applicant?.userId)
                );
                if (!isInList) {
                    setSelectedApplicant(null);
                }
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
        if (score >= 80) return '#10b981'; // Success Green
        if (score >= 60) return '#6366f1'; // Primary Indigo
        if (score >= 40) return '#f59e0b'; // Warning Amber
        return '#ef4444'; // Danger Red
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
                <div className="applications-sidebar">
                    <div className="loading-container skeleton-loading">
                        <ListSkeleton items={5} />
                    </div>
                </div>
                <div className="applications-content">
                    <CardSkeleton />
                </div>
            </div>
        );
    }

    return (
        <div className="applications-page">
            {/* Horizontal Filters Bar */}
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

                <div className="filter-group score-filter">
                    <label>Score Range</label>
                    <div className="score-range-inputs">
                        <input
                            type="number"
                            className="input score-input"
                            placeholder="Min"
                            min="0"
                            max="100"
                            value={pendingScore.min}
                            onChange={(e) => setPendingScore({ ...pendingScore, min: e.target.value })}
                        />
                        <span className="range-separator">to</span>
                        <input
                            type="number"
                            className="input score-input"
                            placeholder="Max"
                            min="0"
                            max="100"
                            value={pendingScore.max}
                            onChange={(e) => setPendingScore({ ...pendingScore, max: e.target.value })}
                        />
                        <button
                            className="btn btn-primary btn-apply-filter"
                            onClick={() => setFilters({ ...filters, minScore: pendingScore.min, maxScore: pendingScore.max })}
                        >
                            Apply
                        </button>
                    </div>
                </div>

                <button
                    className="btn btn-secondary btn-clear-filters"
                    onClick={() => {
                        setFilters({ status: '', interviewCompleted: '', sortBy: 'score', jobId: '', minScore: '', maxScore: '' });
                        setPendingScore({ min: '', max: '' });
                    }}
                >
                    Clear
                </button>
            </div>

            {/* Main Content Area - Side by Side */}
            <div className="main-content-area">
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
                                <div
                                    className="applicant-avatar"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const userId = item.applicant?.userId?._id || item.applicant?.userId;
                                        if (userId) navigate(`/profile/${userId}`);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                    title="View Profile"
                                >
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
                                    <div
                                        className="header-left"
                                        style={{ cursor: 'pointer' }}
                                        title="View Full Profile"
                                        onClick={() => {
                                            const userId = selectedApplicant.applicant?.userId?._id || selectedApplicant.applicant?.userId;
                                            if (userId) navigate(`/profile/${userId}`);
                                        }}
                                    >
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
                                                <motion.button
                                                    className="action-btn action-btn-hire"
                                                    onClick={handleHire}
                                                    disabled={actionLoading}
                                                    whileHover={{ scale: 1.05, boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)' }}
                                                    whileTap={{ scale: 0.95 }}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    Hire
                                                </motion.button>
                                                <motion.button
                                                    className="action-btn action-btn-reject"
                                                    onClick={() => setShowRejectModal(true)}
                                                    disabled={actionLoading}
                                                    whileHover={{ scale: 1.05, boxShadow: '0 8px 25px rgba(239, 68, 68, 0.4)' }}
                                                    whileTap={{ scale: 0.95 }}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.2, delay: 0.05 }}
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                    Reject
                                                </motion.button>
                                            </>
                                        )}
                                        {status === 'rejected' && (
                                            <motion.button
                                                className="action-btn action-btn-reconsider"
                                                onClick={handleUndoReject}
                                                disabled={actionLoading}
                                                whileHover={{ scale: 1.05, boxShadow: '0 8px 25px rgba(245, 158, 11, 0.4)' }}
                                                whileTap={{ scale: 0.95 }}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                title="Give this candidate another chance"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M2.5 2v6h6M21.5 22v-6h-6" />
                                                    <path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.2" />
                                                </svg>
                                                Reconsider
                                            </motion.button>
                                        )}
                                        <motion.button
                                            className="action-btn action-btn-message"
                                            onClick={handleMessage}
                                            whileHover={{ scale: 1.05, boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)' }}
                                            whileTap={{ scale: 0.95 }}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2, delay: 0.1 }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                            </svg>
                                            Message
                                        </motion.button>
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

                                {/* Interview Results - Fully Redesigned */}
                                {selectedApplicant.interview && selectedApplicant.interview.status === 'completed' && (
                                    <div className="interview-results-container">
                                        <div className="results-header">
                                            <h3>📊 AI Assessment Report</h3>
                                            <div className={`pass-fail-label ${selectedApplicant.interview.passed ? 'pass' : 'fail'}`}>
                                                {selectedApplicant.interview.passed ? '✓ RECOMMENDED' : '✗ NOT RECOMMENDED'}
                                            </div>
                                        </div>

                                        <div className="results-grid">
                                            {/* Left: Overall Score & Metrics */}
                                            <div className="results-main card">
                                                <div className="overall-score-section">
                                                    <div className="score-circle-wrapper">
                                                        <div
                                                            className="score-circle-large"
                                                            style={{
                                                                background: `conic-gradient(${getScoreColor(selectedApplicant.interview.overallScore || 0)} ${(selectedApplicant.interview.overallScore || 0) * 3.6}deg, rgba(255,255,255,0.05) 0deg)`
                                                            }}
                                                        >
                                                            <div className="score-inner-large">
                                                                <span className="score-value-large">{selectedApplicant.interview.overallScore || 0}</span>
                                                                <span className="score-label-sub">Overall Score</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="metrics-list">
                                                        <div className="metric-row">
                                                            <div className="metric-info">
                                                                <span>🔧 Technical Knowledge</span>
                                                                <span>{selectedApplicant.interview.technicalScore || 0}%</span>
                                                            </div>
                                                            <div className="metric-progress">
                                                                <div className="progress-bg">
                                                                    <div className="progress-fill" style={{ width: `${selectedApplicant.interview.technicalScore || 0}%`, background: getScoreColor(selectedApplicant.interview.technicalScore || 0) }}></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="metric-row">
                                                            <div className="metric-info">
                                                                <span>💬 Communication</span>
                                                                <span>{selectedApplicant.interview.communicationScore || 0}%</span>
                                                            </div>
                                                            <div className="metric-progress">
                                                                <div className="progress-bg">
                                                                    <div className="progress-fill" style={{ width: `${selectedApplicant.interview.communicationScore || 0}%`, background: getScoreColor(selectedApplicant.interview.communicationScore || 0) }}></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="metric-row">
                                                            <div className="metric-info">
                                                                <span>🎯 JD Match Score</span>
                                                                <span>{selectedApplicant.interview.matchScore || 0}%</span>
                                                            </div>
                                                            <div className="metric-progress">
                                                                <div className="progress-bg">
                                                                    <div className="progress-fill" style={{ width: `${selectedApplicant.interview.matchScore || 0}%`, background: 'var(--primary)' }}></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="ai-feedback-summary">
                                                    <h4>Executive Summary</h4>
                                                    <p>{selectedApplicant.interview.feedback || "The candidate's performance across technical and communication rounds has been evaluated by the AI. Review details below for a comprehensive understanding."}</p>
                                                </div>
                                            </div>

                                            {/* Right: Strengths & Weaknesses */}
                                            <div className="results-side">
                                                <div className="strength-card card">
                                                    <h4>💪 Key Strengths</h4>
                                                    <ul>
                                                        {(selectedApplicant.interview.strengths || []).length > 0 ? (
                                                            selectedApplicant.interview.strengths.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)
                                                        ) : (
                                                            <li>No significant strengths identified.</li>
                                                        )}
                                                    </ul>
                                                </div>

                                                <div className="weakness-card card">
                                                    <h4>⚠️ Areas for Improvement</h4>
                                                    <ul>
                                                        {(selectedApplicant.interview.weaknesses || []).length > 0 ? (
                                                            selectedApplicant.interview.weaknesses.slice(0, 4).map((w, i) => <li key={i}>{w}</li>)
                                                        ) : (
                                                            <li>Excellent performance; no major weaknesses noted.</li>
                                                        )}
                                                    </ul>
                                                </div>

                                                <button
                                                    className="btn-glass full-width"
                                                    onClick={() => {
                                                        const interviewId = selectedApplicant.interview._id ||
                                                            selectedApplicant.interview.id ||
                                                            selectedApplicant.interviewId;
                                                        navigate(`/interview/${interviewId}/results`);
                                                    }}
                                                >
                                                    View Full Evaluation Details →
                                                </button>
                                            </div>
                                        </div>
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
