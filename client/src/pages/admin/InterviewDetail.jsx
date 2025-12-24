import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const InterviewDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const [interview, setInterview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showModal, setShowModal] = useState(null);
    const [formData, setFormData] = useState({ reason: '', notes: '', newScore: '' });

    useEffect(() => {
        fetchInterview();
    }, [id]);

    const fetchInterview = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/admin/interviews/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                navigate('/admin/login');
                return;
            }

            const data = await response.json();
            if (data.success) {
                setInterview(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch interview:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action, endpoint) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const body = {};

            if (formData.reason) body.reason = formData.reason;
            if (formData.notes) body.notes = formData.notes;
            if (formData.newScore) body.newScore = parseInt(formData.newScore);
            if (formData.details) body.details = formData.details;

            const response = await fetch(`${API_URL}/admin/interviews/${id}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.success) {
                setShowModal(null);
                setFormData({ reason: '', notes: '', newScore: '' });
                fetchInterview(); // Refresh data
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

    const seekToTimestamp = (timestamp) => {
        if (videoRef.current) {
            videoRef.current.currentTime = timestamp;
            videoRef.current.play();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="admin-loading-spinner"></div>
            </div>
        );
    }

    if (!interview) {
        return (
            <div className="admin-empty-state">
                <h3>Interview Not Found</h3>
                <button className="admin-action-btn primary" onClick={() => navigate('/admin/interviews')}>
                    Back to Queue
                </button>
            </div>
        );
    }

    const isReviewed = interview.adminReview?.status !== 'pending_review';

    return (
        <>
            <div className="admin-page-header">
                <div>
                    <button
                        onClick={() => navigate('/admin/interviews')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '8px',
                            padding: 0,
                            fontSize: '0.9rem'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Queue
                    </button>
                    <h1>Interview Review</h1>
                    <p>{interview.userId?.profile?.name || 'Unknown Candidate'} • {interview.interviewType}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
                {/* Main Content */}
                <div>
                    {/* Video Player */}
                    {interview.videoRecording?.secureUrl && (
                        <div className="admin-table-container" style={{ marginBottom: '20px' }}>
                            <div className="admin-table-header">
                                <h2>Interview Recording</h2>
                            </div>
                            <div style={{ padding: '16px' }}>
                                <div className="admin-video-container">
                                    <video
                                        ref={videoRef}
                                        className="admin-video-player"
                                        controls
                                        src={interview.videoRecording.secureUrl}
                                    />
                                </div>

                                {interview.videoRecording.cheatingMarkers?.length > 0 && (
                                    <div className="admin-video-markers">
                                        <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginRight: '8px' }}>
                                            Jump to flags:
                                        </span>
                                        {interview.videoRecording.cheatingMarkers.map((marker, idx) => (
                                            <button
                                                key={idx}
                                                className={`admin-video-marker ${marker.severity}`}
                                                onClick={() => seekToTimestamp(marker.timestamp)}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="12" y1="8" x2="12" y2="12" />
                                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                                </svg>
                                                {formatTime(marker.timestamp)} - {marker.flagType?.replace(/_/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Questions & Answers */}
                    <div className="admin-table-container">
                        <div className="admin-table-header">
                            <h2>Interview Q&A ({interview.questions?.length || 0} questions)</h2>
                        </div>
                        <div style={{ padding: '16px', maxHeight: '500px', overflow: 'auto' }}>
                            {interview.questions?.map((q, idx) => (
                                <div key={idx} style={{
                                    marginBottom: '20px',
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <span style={{
                                            background: 'rgba(59,130,246,0.2)',
                                            color: '#60a5fa',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            marginRight: '8px'
                                        }}>
                                            Q{idx + 1}
                                        </span>
                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                            {q.category} • {q.difficulty}
                                        </span>
                                    </div>
                                    <p style={{ color: '#f8fafc', marginBottom: '12px' }}>{q.question}</p>

                                    {interview.responses?.[idx] && (
                                        <>
                                            <div style={{
                                                background: 'rgba(0,0,0,0.2)',
                                                padding: '12px',
                                                borderRadius: '6px',
                                                marginBottom: '12px'
                                            }}>
                                                <p style={{ color: '#e2e8f0', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                                    "{interview.responses[idx].answer || 'No text response'}"
                                                </p>
                                            </div>

                                            {interview.responses[idx].evaluation && (
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                                    gap: '8px'
                                                }}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ color: '#22c55e', fontSize: '1.2rem', fontWeight: 700 }}>
                                                            {interview.responses[idx].evaluation.score}
                                                        </div>
                                                        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Overall</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ color: '#3b82f6', fontSize: '1.2rem', fontWeight: 700 }}>
                                                            {interview.responses[idx].evaluation.technicalAccuracy}
                                                        </div>
                                                        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Technical</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ color: '#8b5cf6', fontSize: '1.2rem', fontWeight: 700 }}>
                                                            {interview.responses[idx].evaluation.communication}
                                                        </div>
                                                        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Communication</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ color: '#f59e0b', fontSize: '1.2rem', fontWeight: 700 }}>
                                                            {interview.responses[idx].evaluation.confidence}
                                                        </div>
                                                        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Confidence</div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div>
                    {/* Candidate Info */}
                    <div className="admin-table-container" style={{ marginBottom: '16px' }}>
                        <div className="admin-table-header">
                            <h2>Candidate Info</h2>
                        </div>
                        <div style={{ padding: '16px' }}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ color: '#64748b', fontSize: '0.8rem' }}>Name</label>
                                <p style={{ color: '#f8fafc', margin: '4px 0 0', fontWeight: 600 }}>
                                    {interview.userId?.profile?.name || 'Unknown'}
                                </p>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ color: '#64748b', fontSize: '0.8rem' }}>Email</label>
                                <p style={{ color: '#60a5fa', margin: '4px 0 0', fontSize: '0.9rem' }}>
                                    {interview.userId?.email || '-'}
                                </p>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ color: '#64748b', fontSize: '0.8rem' }}>Desired Role</label>
                                <p style={{ color: '#f8fafc', margin: '4px 0 0' }}>
                                    {interview.userId?.jobSeekerProfile?.desiredRole || '-'}
                                </p>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ color: '#64748b', fontSize: '0.8rem' }}>Experience Level</label>
                                <p style={{ color: '#f8fafc', margin: '4px 0 0' }}>
                                    {interview.userId?.jobSeekerProfile?.experienceLevel || '-'}
                                </p>
                            </div>

                            {/* Skills */}
                            {interview.userId?.jobSeekerProfile?.skills?.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ color: '#64748b', fontSize: '0.8rem' }}>Skills</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                        {interview.userId.jobSeekerProfile.skills.slice(0, 6).map((skill, idx) => (
                                            <span key={idx} style={{
                                                padding: '3px 8px',
                                                background: 'rgba(59,130,246,0.15)',
                                                color: '#60a5fa',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem'
                                            }}>
                                                {skill}
                                            </span>
                                        ))}
                                        {interview.userId.jobSeekerProfile.skills.length > 6 && (
                                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                                +{interview.userId.jobSeekerProfile.skills.length - 6} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Resume Link */}
                            {interview.userResume?.fileUrl && (
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ color: '#64748b', fontSize: '0.8rem' }}>Resume</label>
                                    <a
                                        href={interview.userResume.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginTop: '6px',
                                            padding: '8px 12px',
                                            background: 'rgba(34,197,94,0.15)',
                                            border: '1px solid rgba(34,197,94,0.3)',
                                            borderRadius: '6px',
                                            color: '#4ade80',
                                            textDecoration: 'none',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="16" y1="13" x2="8" y2="13" />
                                            <line x1="16" y1="17" x2="8" y2="17" />
                                        </svg>
                                        {interview.userResume.fileName || 'View Resume'}
                                    </a>
                                </div>
                            )}

                            {/* Member Since */}
                            <div>
                                <label style={{ color: '#64748b', fontSize: '0.8rem' }}>Member Since</label>
                                <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: '0.85rem' }}>
                                    {interview.userId?.createdAt
                                        ? new Date(interview.userId.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })
                                        : '-'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Scores */}
                    <div className="admin-table-container" style={{ marginBottom: '16px' }}>
                        <div className="admin-table-header">
                            <h2>AI Evaluation</h2>
                        </div>
                        <div style={{ padding: '16px' }}>
                            <div style={{
                                textAlign: 'center',
                                padding: '20px',
                                background: 'rgba(59,130,246,0.1)',
                                borderRadius: '12px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ color: '#3b82f6', fontSize: '3rem', fontWeight: 700 }}>
                                    {interview.scoring?.overallScore || interview.adminReview?.aiScore || '-'}
                                </div>
                                <div style={{ color: '#94a3b8' }}>Overall AI Score</div>
                            </div>

                            {interview.scoring && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                        <div style={{ color: '#22c55e', fontSize: '1.5rem', fontWeight: 600 }}>
                                            {interview.scoring.technicalAccuracy || '-'}
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Technical</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                        <div style={{ color: '#8b5cf6', fontSize: '1.5rem', fontWeight: 600 }}>
                                            {interview.scoring.communication || '-'}
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Communication</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Proctoring Flags */}
                    <div className="admin-table-container" style={{ marginBottom: '16px' }}>
                        <div className="admin-table-header">
                            <h2>Proctoring Flags ({interview.proctoring?.totalFlags || 0})</h2>
                        </div>
                        <div style={{ padding: '16px' }}>
                            {interview.proctoring?.riskLevel && (
                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.8rem', marginRight: '8px' }}>Risk Level:</span>
                                    <span className={`status-badge ${interview.proctoring.riskLevel === 'high' ? 'rejected' : interview.proctoring.riskLevel === 'medium' ? 'pending' : 'approved'}`}>
                                        {interview.proctoring.riskLevel}
                                    </span>
                                </div>
                            )}

                            {interview.proctoring?.flags?.length > 0 ? (
                                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                                    {interview.proctoring.flags.map((flag, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px',
                                            background: 'rgba(239,68,68,0.1)',
                                            borderRadius: '6px',
                                            marginBottom: '6px'
                                        }}>
                                            <span className={`priority-badge ${flag.severity || 'medium'}`}>
                                                {flag.severity || 'medium'}
                                            </span>
                                            <span style={{ color: '#e2e8f0', fontSize: '0.85rem', flex: 1 }}>
                                                {flag.type?.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: '#64748b', textAlign: 'center' }}>No flags detected</p>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {!isReviewed ? (
                        <div className="admin-table-container">
                            <div className="admin-table-header">
                                <h2>Actions</h2>
                            </div>
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    className="admin-action-btn success"
                                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                                    onClick={() => setShowModal('approve')}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Approve Interview
                                </button>

                                <button
                                    className="admin-action-btn primary"
                                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                                    onClick={() => setShowModal('adjust')}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Adjust Score
                                </button>

                                <button
                                    className="admin-action-btn"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'center',
                                        padding: '12px',
                                        background: 'rgba(59,130,246,0.1)',
                                        color: '#60a5fa'
                                    }}
                                    onClick={() => setShowModal('reattempt')}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="23 4 23 10 17 10" />
                                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                                    </svg>
                                    Allow Reattempt
                                </button>

                                <button
                                    className="admin-action-btn danger"
                                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                                    onClick={() => setShowModal('cheating')}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    Confirm Cheating
                                </button>

                                <button
                                    className="admin-action-btn danger"
                                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                                    onClick={() => setShowModal('reject')}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="15" y1="9" x2="9" y2="15" />
                                        <line x1="9" y1="9" x2="15" y2="15" />
                                    </svg>
                                    Reject Interview
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="admin-table-container">
                            <div className="admin-table-header">
                                <h2>Review Status</h2>
                            </div>
                            <div style={{ padding: '20px', textAlign: 'center' }}>
                                <span className={`status-badge ${interview.adminReview?.status === 'approved' ? 'approved' :
                                    interview.adminReview?.status === 'rejected' ? 'rejected' :
                                        interview.adminReview?.status === 'cheating_confirmed' ? 'cheating' :
                                            'reattempt'
                                    }`} style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
                                    {interview.adminReview?.status?.replace(/_/g, ' ')}
                                </span>
                                {interview.adminReview?.adminNotes && (
                                    <p style={{ color: '#94a3b8', marginTop: '12px', fontSize: '0.85rem' }}>
                                        {interview.adminReview.adminNotes}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showModal && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>
                                {showModal === 'approve' && 'Approve Interview'}
                                {showModal === 'reject' && 'Reject Interview'}
                                {showModal === 'adjust' && 'Adjust Score'}
                                {showModal === 'reattempt' && 'Allow Reattempt'}
                                {showModal === 'cheating' && 'Confirm Cheating'}
                            </h2>
                            <button className="admin-modal-close" onClick={() => setShowModal(null)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        <div className="admin-modal-body">
                            {showModal === 'adjust' && (
                                <div className="admin-form-group" style={{ marginBottom: '16px' }}>
                                    <label style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                        New Score (0-100)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.newScore}
                                        onChange={(e) => setFormData({ ...formData, newScore: e.target.value })}
                                        placeholder="Enter new score"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'rgba(0,0,0,0.2)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            color: '#f8fafc',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                            )}

                            <div className="admin-form-group">
                                <label style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                    {showModal === 'cheating' ? 'Cheating Details' : 'Reason / Notes'}
                                </label>
                                <textarea
                                    value={showModal === 'cheating' ? formData.details : formData.reason}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        [showModal === 'cheating' ? 'details' : 'reason']: e.target.value
                                    })}
                                    placeholder={showModal === 'approve' ? 'Optional notes...' : 'Required...'}
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
                                className={`admin-action-btn ${showModal === 'approve' ? 'success' : showModal === 'reject' || showModal === 'cheating' ? 'danger' : 'primary'}`}
                                onClick={() => {
                                    const endpoints = {
                                        approve: 'approve',
                                        reject: 'reject',
                                        adjust: 'adjust-score',
                                        reattempt: 'allow-reattempt',
                                        cheating: 'confirm-cheating'
                                    };
                                    handleAction(showModal, endpoints[showModal]);
                                }}
                                disabled={actionLoading || (showModal !== 'approve' && !formData.reason && !formData.details && showModal !== 'adjust') || (showModal === 'adjust' && !formData.newScore)}
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

export default InterviewDetail;
