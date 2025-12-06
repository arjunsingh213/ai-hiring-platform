import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './InterviewsPage.css';

const InterviewsPage = () => {
    const [interviews, setInterviews] = useState([]);
    const [activeTab, setActiveTab] = useState('slots');
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            const response = await api.get(`/interviews/user/${userId}`);
            setInterviews(response.data || []);
        } catch (error) {
            console.error('Error fetching interviews:', error);
        }
    };

    const startInterview = async (type) => {
        try {
            const response = await api.post('/interviews/start', {
                userId,
                interviewType: type
            });
            navigate(`/interview/${response.data._id}`);
        } catch (error) {
            console.error('Error starting interview:', error);
            alert(error.response?.data?.error || 'Failed to start interview');
        }
    };

    const completedInterviews = interviews.filter(i => i.status === 'completed');
    const upcomingInterviews = interviews.filter(i => i.status === 'in_progress' || i.status === 'scheduled');

    return (
        <div className="interviews-page">
            <div className="page-header">
                <h1>Interviews</h1>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => startInterview('technical')}>
                        Start Technical Interview
                    </button>
                    <button className="btn btn-primary" onClick={() => startInterview('hr')}>
                        Start HR Interview
                    </button>
                </div>
            </div>

            <div className="interview-tabs">
                <button
                    className={`tab-btn ${activeTab === 'slots' ? 'active' : ''}`}
                    onClick={() => setActiveTab('slots')}
                >
                    Interview Slots
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
                        {upcomingInterviews.length === 0 ? (
                            <div className="empty-state card">
                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                                    <path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                <h3>No upcoming interviews</h3>
                                <p>Start an AI interview to practice and get evaluated</p>
                                <button className="btn btn-primary" onClick={() => startInterview('technical')}>
                                    Start Interview
                                </button>
                            </div>
                        ) : (
                            upcomingInterviews.map((interview) => (
                                <div key={interview._id} className="interview-card card">
                                    <div className="card-header">
                                        <div className="company-logo">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                                <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                                <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3>AI Interview Platform</h3>
                                            <p className="interview-type">{interview.interviewType} Interview</p>
                                        </div>
                                    </div>
                                    <div className="interview-details">
                                        <p><strong>Date:</strong> {new Date(interview.createdAt).toLocaleDateString()}</p>
                                        <p><strong>Time:</strong> {new Date(interview.createdAt).toLocaleTimeString()}</p>
                                        <p><strong>Status:</strong> <span className="badge">{interview.status}</span></p>
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => navigate(`/interview/${interview._id}`)}
                                    >
                                        Continue Interview
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'assessments' && (
                    <div className="assessments-grid">
                        {completedInterviews.length === 0 ? (
                            <div className="empty-state card">
                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" />
                                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                <h3>No completed assessments</h3>
                                <p>Complete an interview to see your assessment results</p>
                            </div>
                        ) : (
                            completedInterviews.map((interview) => (
                                <div key={interview._id} className="assessment-card card">
                                    <div className="assessment-header">
                                        <h3>{interview.interviewType} Interview</h3>
                                        <span className={`badge ${interview.passed ? 'badge-success' : 'badge-secondary'}`}>
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
                                                {interview.scoring.strengths.map((strength, index) => (
                                                    <li key={index}>{strength}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterviewsPage;
