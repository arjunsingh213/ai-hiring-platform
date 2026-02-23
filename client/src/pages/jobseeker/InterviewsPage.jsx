import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import { CardSkeleton } from '../../components/Skeleton';
import './InterviewsPage.css';

const InterviewsPage = () => {
    const toast = useToast();
    const [interviews, setInterviews] = useState([]);
    const [videoRooms, setVideoRooms] = useState([]);
    const [activeTab, setActiveTab] = useState('slots');
    const [platformInterviewStatus, setPlatformInterviewStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch platform interview status
            const statusResponse = await api.get(`/onboarding-interview/status/${userId}`);
            if (statusResponse.success) {
                setPlatformInterviewStatus(statusResponse.data);
            }

            // Fetch all interviews
            const interviewsResponse = await api.get(`/interviews/user/${userId}`);
            setInterviews(interviewsResponse.data || []);

            // Fetch video interview rooms
            try {
                const roomsResponse = await api.get('/video-rooms/my/rooms');
                console.log('[InterviewsPage] Video rooms response:', roomsResponse);
                const roomsData = roomsResponse?.data || roomsResponse;
                setVideoRooms(Array.isArray(roomsData) ? roomsData : roomsData.data || []);
            } catch (e) {
                console.error('[InterviewsPage] Video rooms fetch error:', e);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const startPlatformInterview = () => {
        navigate('/onboarding/jobseeker?step=interview');
    };

    const continueJobInterview = (interviewId) => {
        navigate(`/interview/${interviewId}/ready`);
    };

    // Separate interviews by type
    const platformInterviews = interviews.filter(i => !i.jobId);
    const jobInterviews = interviews.filter(i => i.jobId);
    const completedInterviews = interviews.filter(i => i.status === 'completed' && i.scoring);
    const upcomingInterviews = interviews.filter(i => i.status === 'in_progress' || i.status === 'scheduled');

    const interviewStatus = platformInterviewStatus?.status || 'pending';
    const isPassed = interviewStatus === 'passed';
    const isPendingReview = interviewStatus === 'pending_review';

    // Get interview display name based on job info
    const getInterviewDisplayName = (interview) => {
        if (interview.jobId) {
            // Job-specific interview - show job role name
            const jobTitle = interview.jobId?.title || 'Job Application';
            return `${jobTitle} Interview`;
        }
        return `${interview.interviewType || 'Technical'} Interview`;
    };

    if (loading) {
        return (
            <div className="interviews-page">
                <div className="page-header"><h1>Interviews</h1></div>
                <div className="loading-state skeleton-loading">
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </div>
        );
    }

    return (
        <div className="interviews-page">
            <div className="page-header">
                <h1>Interviews</h1>
            </div>

            {/* Platform Interview Status Banner - Show as Recommended if not passed */}
            {!isPassed && (
                <div className={`platform-interview-banner card-highlight ${isPendingReview ? 'pending-review' : ''}`}>
                    <div className="banner-icon">
                        {isPendingReview ? (
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        ) : (
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 11l3 3L22 4" />
                                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                            </svg>
                        )}
                    </div>
                    <div className="banner-content">
                        {isPendingReview ? (
                            <>
                                <h2>✅ Interview Submitted</h2>
                                <p>
                                    Thank you! Your interview has been submitted. You can now browse and apply for jobs!
                                </p>
                                <p className="review-note">
                                    Our AI has evaluated your responses, and you can view your results in the "Completed Interviews" tab below.
                                </p>
                            </>
                        ) : (
                            <>
                                <h2>Platform Interview Recommended</h2>
                                <p>
                                    Improve your profile visibility by completing the Platform Interview.
                                    This domain-specific assessment helps recruiters find you faster!
                                </p>

                                {/* Rejected State */}
                                {(interviewStatus === 'rejected' || interviewStatus === 'cheating') && (
                                    <div className="rejection-notice">
                                        <div className="rejection-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="15" y1="9" x2="9" y2="15" />
                                                <line x1="9" y1="9" x2="15" y2="15" />
                                            </svg>
                                        </div>
                                        <div className="rejection-content">
                                            <strong>
                                                {interviewStatus === 'cheating'
                                                    ? '⚠️ Interview Flagged for Policy Violation'
                                                    : '❌ Interview Not Approved'}
                                            </strong>
                                            {platformInterviewStatus?.rejectionReason && (
                                                <p className="rejection-reason">{platformInterviewStatus.rejectionReason}</p>
                                            )}
                                            {platformInterviewStatus?.canRetry ? (
                                                <p className="retry-message">✅ You can now retry the interview!</p>
                                            ) : (
                                                <p className="retry-message retry-locked">
                                                    🔒 Retry available after {new Date(platformInterviewStatus?.retryAfter).toLocaleDateString()}
                                                    {interviewStatus === 'cheating' && ' (30-day wait period)'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Failed State */}
                                {interviewStatus === 'failed' && platformInterviewStatus?.canRetry && (
                                    <p className="retry-message">
                                        You can now retry the interview!
                                    </p>
                                )}
                                {interviewStatus === 'failed' && !platformInterviewStatus?.canRetry && (
                                    <p className="retry-message retry-locked">
                                        Retry available after {new Date(platformInterviewStatus?.retryAfter).toLocaleDateString()}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                    {!isPendingReview && interviewStatus !== 'rejected' && interviewStatus !== 'cheating' && (
                        <button
                            className="btn btn-primary btn-large"
                            onClick={startPlatformInterview}
                            disabled={interviewStatus === 'failed' && !platformInterviewStatus?.canRetry}
                        >
                            {interviewStatus === 'pending' || interviewStatus === 'skipped'
                                ? 'Start Platform Interview'
                                : interviewStatus === 'in_progress'
                                    ? 'Continue Platform Interview'
                                    : platformInterviewStatus?.canRetry
                                        ? 'Retry Platform Interview'
                                        : 'Retry Locked'}
                        </button>
                    )}
                    {(interviewStatus === 'rejected' || interviewStatus === 'cheating') && platformInterviewStatus?.canRetry && (
                        <button
                            className="btn btn-primary btn-large"
                            onClick={startPlatformInterview}
                        >
                            Retry Platform Interview
                        </button>
                    )}
                </div>
            )}

            {/* If passed, show success message */}
            {isPassed && (
                <div className="platform-status-success">
                    <div className="status-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <div className="status-content">
                        <h3>Platform Interview Completed</h3>
                        <p>
                            Score: <strong>{platformInterviewStatus?.score || platformInterviewStatus?.data?.score || '—'}%</strong> |
                            You can now apply for jobs and complete job-specific interviews.
                        </p>
                    </div>
                </div>
            )}


            <div className="interview-tabs">
                <button
                    className={`tab-btn ${activeTab === 'slots' ? 'active' : ''}`}
                    onClick={() => setActiveTab('slots')}
                >
                    Interviews
                </button>
                <button
                    className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    Completed Interviews
                </button>
                <button
                    className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
                    onClick={() => setActiveTab('video')}
                >
                    Video Interviews {videoRooms.length > 0 && <span className="tab-count">{videoRooms.length}</span>}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'assessments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('assessments')}
                >
                    Assessments
                </button>
            </div>

            <div className="interviews-content">
                {activeTab === 'slots' && (
                    <div className="interviews-grid">
                        {/* Always show Platform Interview if not passed */}
                        {!isPassed && (
                            <div className={`interview-card card card-platform ${isPendingReview ? 'under-review' : ''}`}>
                                <div className="card-header">
                                    <div className="company-logo platform-logo">
                                        <span>{isPendingReview ? '🕐' : '🎯'}</span>
                                    </div>
                                    <div>
                                        <h3>Domain-Specific Platform Interview</h3>
                                        <p className="interview-type">
                                            {isPendingReview ? 'Evaluation complete' : 'Complete to unlock job applications'}
                                        </p>
                                    </div>
                                </div>
                                <div className="interview-details">
                                    <p><strong>Type:</strong> Domain-Specific Interview (Dynamic rounds based on your profile)</p>
                                    <p><strong>Duration:</strong> ~15-25 minutes</p>
                                    <p>
                                        <strong>Status:</strong>{' '}
                                        <span className={`badge badge-${interviewStatus}`}>
                                            {isPendingReview ? 'Under Review' : interviewStatus}
                                        </span>
                                    </p>
                                    {platformInterviewStatus?.attempts > 0 && (
                                        <p><strong>Attempts:</strong> {platformInterviewStatus.attempts}</p>
                                    )}
                                </div>
                                {isPendingReview ? (
                                    <div className="review-timeline">
                                        <h4>🚀 Access Unlocked</h4>
                                        <ul>
                                            <li>You have successfully completed the platform interview</li>
                                            <li>Your AI results are available in the Results tab</li>
                                            <li>You can now apply for job-specific interviews</li>
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="interview-info">
                                        <h4>What to expect:</h4>
                                        <ul>
                                            <li>Questions tailored to your domain & skills from your resume</li>
                                            <li>Dynamic rounds: Technical, HR, and domain-specific</li>
                                            <li>Coding challenge (if applicable to your domain)</li>
                                            <li>AI-powered evaluation with human review</li>
                                        </ul>
                                    </div>
                                )}
                                {/* Only show Start Interview button if:
                                    - Not pending review
                                    - Not cheating/rejected without canRetry
                                    - Not failed without canRetry */}
                                {!isPendingReview &&
                                    !(interviewStatus === 'cheating' && !platformInterviewStatus?.canRetry) &&
                                    !(interviewStatus === 'rejected' && !platformInterviewStatus?.canRetry) &&
                                    !(interviewStatus === 'failed' && !platformInterviewStatus?.canRetry) && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={startPlatformInterview}
                                        >
                                            {interviewStatus === 'in_progress'
                                                ? 'Continue Interview'
                                                : platformInterviewStatus?.canRetry
                                                    ? 'Retry Interview'
                                                    : 'Start Interview'}
                                        </button>
                                    )}
                            </div>
                        )}

                        {/* Always show Job Interviews */}
                        {upcomingInterviews.filter(i => i.jobId).length === 0 ? (
                            /* No job interviews available */
                            <div className="empty-state card">
                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                                    <path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                <h3>No job interviews pending</h3>
                                <p>Apply for jobs to receive interview invitations</p>
                                <button className="btn btn-primary" onClick={() => navigate('/jobseeker/jobs')}>
                                    Browse Jobs
                                </button>
                            </div>
                        ) : (
                            /* Show job-specific interviews */
                            upcomingInterviews.filter(i => i.jobId).map((interview) => (
                                <div key={interview._id} className="interview-card card card-job">
                                    <div className="card-header">
                                        <div className="company-logo">
                                            {interview.jobId?.company?.logo ? (
                                                <img src={interview.jobId.company.logo} alt="Company" />
                                            ) : (
                                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                                    <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                                    <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" />
                                                </svg>
                                            )}
                                        </div>
                                        <div>
                                            <h3>{interview.jobId?.title || 'Job Application'} Interview</h3>
                                            <p className="interview-type">{interview.jobId?.company?.name || 'Company'}</p>
                                        </div>
                                    </div>
                                    <div className="interview-details">
                                        <p><strong>Date:</strong> {new Date(interview.createdAt).toLocaleDateString()}</p>
                                        <p><strong>Status:</strong> <span className="badge">{interview.status}</span></p>

                                        {/* Dynamic Pipeline Timeline */}
                                        {interview.jobId?.pipelineRounds?.length > 0 && (
                                            <div className="interview-timeline-container">
                                                <h4>Interview Journey</h4>
                                                <div className="interview-pipeline-mini">
                                                    {interview.jobId.pipelineRounds.map((round, idx) => {
                                                        const isCompleted = interview.roundResults?.some(r => r.roundIndex === idx);
                                                        const isCurrent = (interview.currentRoundIndex || 0) === idx && interview.status === 'in_progress';
                                                        return (
                                                            <div key={round._id || idx} className={`pipeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}>
                                                                <div className="step-marker">
                                                                    {round.type === 'AI' ? '🤖' : '👥'}
                                                                    {isCompleted && <span className="step-check">✓</span>}
                                                                </div>
                                                                <div className="step-label">
                                                                    {round.subtype || round.type}
                                                                </div>
                                                                {idx < interview.jobId.pipelineRounds.length - 1 && (
                                                                    <div className="step-connector"></div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Active Round Details */}
                                    {interview.jobId?.pipelineRounds?.length > 0 && (
                                        <div className="active-round-info card-highlight-mini">
                                            {(() => {
                                                const currentIndex = interview.currentRoundIndex || 0;
                                                const currentRound = interview.jobId.pipelineRounds[currentIndex];
                                                if (!currentRound) return null;

                                                const isAI = currentRound.type === 'AI';

                                                return (
                                                    <div className="round-details-box">
                                                        <div className="round-header">
                                                            <span className="round-type-tag">{currentRound.subtype || currentRound.type}</span>
                                                            <span className={`round-method-tag ${isAI ? 'ai' : 'human'}`}>
                                                                {isAI ? 'AI Interview' : 'Human Interview'}
                                                            </span>
                                                        </div>
                                                        <p className="round-desc">{currentRound.description || 'Proceed to the next stage of your application.'}</p>

                                                        {!isAI && (
                                                            <div className="human-round-meta">
                                                                {currentRound.configuration?.meetingLink && (
                                                                    <div className="meta-item">
                                                                        <span>🔗</span>
                                                                        <a href={currentRound.configuration.meetingLink} target="_blank" rel="noopener noreferrer">Join Meeting</a>
                                                                    </div>
                                                                )}
                                                                {currentRound.configuration?.location && (
                                                                    <div className="meta-item">
                                                                        <span>📍</span>
                                                                        {currentRound.configuration.location}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="round-action">
                                                            {isAI ? (
                                                                <button
                                                                    className="btn btn-primary"
                                                                    onClick={() => continueJobInterview(interview._id)}
                                                                >
                                                                    {interview.status === 'in_progress' ? 'Continue AI Interview' : 'Start AI Round'}
                                                                </button>
                                                            ) : (
                                                                <div className="human-round-status">
                                                                    <span className="status-indicator"></span>
                                                                    Waiting for recruiter to start this round
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {!(interview.jobId?.pipelineRounds?.length > 0) && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => continueJobInterview(interview._id)}
                                        >
                                            Continue Interview
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'completed' && (
                    <div className="assessments-grid">
                        {completedInterviews.length === 0 ? (
                            <div className="empty-state card">
                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" />
                                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                <h3>No completed interviews</h3>
                                <p>Complete an interview to see your results here</p>
                            </div>
                        ) : (
                            completedInterviews.map((interview) => (
                                <div key={interview._id} className={`assessment-card card ${interview.jobId ? 'card-job' : 'card-platform'}`}>
                                    <div className="assessment-header">
                                        <h3>{getInterviewDisplayName(interview)}</h3>
                                        <span className={`badge ${interview.passed ? 'badge-success' : 'badge-danger'}`}>
                                            {interview.passed ? 'Passed' : 'Not Passed'}
                                        </span>
                                    </div>
                                    <div className="assessment-score">
                                        <div className="score-circle">
                                            <span className="score-value">{interview.scoring?.overallScore || 0}</span>
                                            <span className="score-label">/100</span>
                                        </div>
                                    </div>
                                    <div className="assessment-details">
                                        <div className="detail-item">
                                            <span className="label">Technical Accuracy</span>
                                            <span className="value">{interview.scoring?.technicalScore || 0}%</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Communication</span>
                                            <span className="value">{interview.scoring?.communicationScore || 0}%</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Confidence</span>
                                            <span className="value">{interview.scoring?.confidenceScore || 0}%</span>
                                        </div>
                                    </div>
                                    {interview.scoring?.strengths?.length > 0 && (
                                        <div className="strengths">
                                            <h4>Strengths</h4>
                                            <ul>
                                                {interview.scoring.strengths.slice(0, 3).map((strength, index) => (
                                                    <li key={index}>{strength}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <button
                                        className="btn btn-primary btn-block"
                                        onClick={() => navigate(`/interview/${interview._id}/results`)}
                                    >
                                        View Detailed Scorecard
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'assessments' && (
                    <div className="empty-state card">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M9 9h6M9 12h6M9 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <h3>Assessments Coming Soon</h3>
                        <p>Future feature for skill-based assessments (MCQ, coding challenges, etc.)</p>
                    </div>
                )}

                {activeTab === 'video' && (
                    <div className="assessments-grid">
                        {videoRooms.length === 0 ? (
                            <div className="empty-state card">
                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                                    <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                <h3>No video interviews yet</h3>
                                <p>When a recruiter schedules a video interview, it will appear here</p>
                            </div>
                        ) : (
                            videoRooms.map((room) => {
                                const isUpcoming = ['scheduled', 'waiting'].includes(room.status);
                                const isLive = room.status === 'live';
                                const isDone = room.status === 'completed';
                                return (
                                    <div key={room._id} className={`interview-card card card-job`}>
                                        <div className="card-header">
                                            <div className="company-logo">
                                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                                    <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" />
                                                    <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3>{room.jobId?.title || 'Video Interview'}</h3>
                                                <p className="interview-type">
                                                    with {room.recruiterId?.profile?.name || 'Recruiter'}
                                                </p>
                                            </div>
                                            <span className={`badge ${isLive ? 'badge-danger' : isDone ? 'badge-success' : 'badge-info'}`}
                                                style={isLive ? { animation: 'pulse 1.5s infinite' } : {}}
                                            >
                                                {isLive ? 'LIVE' : isDone ? 'Completed' : 'Scheduled'}
                                            </span>
                                        </div>
                                        <div className="interview-details">
                                            <p><strong>Date:</strong> {new Date(room.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                            <p><strong>Time:</strong> {new Date(room.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                                            <p><strong>Duration:</strong> {room.duration || 45} min</p>
                                            <p><strong>Room Code:</strong> <code style={{ background: 'var(--bg-tertiary, #f3f4f6)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{room.roomCode}</code></p>
                                        </div>
                                        {(isUpcoming || isLive) && (
                                            <button
                                                className="btn btn-primary btn-block"
                                                onClick={() => navigate(`/interview-room/${room.roomCode}`)}
                                                style={isLive ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)' } : {}}
                                            >
                                                {isLive ? 'Join Now' : 'Join Interview'}
                                            </button>
                                        )}
                                        {isDone && (
                                            <button
                                                className="btn btn-secondary btn-block"
                                                onClick={() => navigate(`/interview-room/${room.roomCode}`)}
                                                style={{ opacity: 0.8 }}
                                            >
                                                View Details
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterviewsPage;
