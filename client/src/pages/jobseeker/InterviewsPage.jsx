import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import './InterviewsPage.css';

const InterviewsPage = () => {
    const toast = useToast();
    const [interviews, setInterviews] = useState([]);
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
        navigate(`/interview/${interviewId}`);
    };

    // Separate interviews by type
    const platformInterviews = interviews.filter(i => !i.jobId);
    const jobInterviews = interviews.filter(i => i.jobId);
    const completedInterviews = interviews.filter(i => i.status === 'completed' && i.scoring);
    const upcomingInterviews = interviews.filter(i => i.status === 'in_progress' || i.status === 'scheduled');

    const canApplyForJobs = platformInterviewStatus?.canApplyForJobs;
    const interviewStatus = platformInterviewStatus?.status || 'pending';

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
                <div className="loading-state">
                    <div className="loading-spinner-large"></div>
                    <p>Loading interviews...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="interviews-page">
            <div className="page-header">
                <h1>Interviews</h1>
            </div>

            {/* Platform Interview Status Banner */}
            {!canApplyForJobs && (
                <div className="platform-interview-banner card-highlight">
                    <div className="banner-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 11l3 3L22 4" />
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                        </svg>
                    </div>
                    <div className="banner-content">
                        <h2>Platform Interview Required</h2>
                        <p>
                            You must complete and pass the Platform Interview to unlock job applications.
                            This is a domain-specific interview based on your resume and skills.
                        </p>
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
                    </div>
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
                </div>
            )}

            {/* If passed, show success message */}
            {canApplyForJobs && (
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
                    {canApplyForJobs ? 'Job Interviews' : 'Platform Interview'}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    Completed Interviews
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
                        {!canApplyForJobs ? (
                            /* Show Platform Interview for users who haven't passed */
                            <div className="interview-card card card-platform">
                                <div className="card-header">
                                    <div className="company-logo platform-logo">
                                        <span>🎯</span>
                                    </div>
                                    <div>
                                        <h3>Domain-Specific Platform Interview</h3>
                                        <p className="interview-type">Required to apply for jobs</p>
                                    </div>
                                </div>
                                <div className="interview-details">
                                    <p><strong>Type:</strong> Technical + HR (10 questions)</p>
                                    <p><strong>Duration:</strong> ~20 minutes</p>
                                    <p><strong>Status:</strong> <span className={`badge badge-${interviewStatus}`}>{interviewStatus}</span></p>
                                    {platformInterviewStatus?.attempts > 0 && (
                                        <p><strong>Attempts:</strong> {platformInterviewStatus.attempts}</p>
                                    )}
                                </div>
                                <div className="interview-info">
                                    <h4>What to expect:</h4>
                                    <ul>
                                        <li>5 Technical questions based on your skills</li>
                                        <li>5 HR/Behavioral questions</li>
                                        <li>Coding challenge (if applicable)</li>
                                        <li>AI-powered evaluation</li>
                                    </ul>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={startPlatformInterview}
                                    disabled={interviewStatus === 'failed' && !platformInterviewStatus?.canRetry}
                                >
                                    {interviewStatus === 'in_progress' ? 'Continue Interview' : 'Start Interview'}
                                </button>
                            </div>
                        ) : upcomingInterviews.filter(i => i.jobId).length === 0 ? (
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
                                        <p><strong>Time:</strong> {new Date(interview.createdAt).toLocaleTimeString()}</p>
                                        <p><strong>Status:</strong> <span className="badge">{interview.status}</span></p>
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => continueJobInterview(interview._id)}
                                    >
                                        Continue Interview
                                    </button>
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
                                            <span className="value">{interview.scoring?.technicalAccuracy || 0}%</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Communication</span>
                                            <span className="value">{interview.scoring?.communication || 0}%</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Confidence</span>
                                            <span className="value">{interview.scoring?.confidence || 0}%</span>
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
            </div>
        </div>
    );
};

export default InterviewsPage;
