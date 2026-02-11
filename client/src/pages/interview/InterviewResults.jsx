import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Skeleton, { CardSkeleton } from '../../components/Skeleton';
import FeedbackModal from '../../components/FeedbackModal';
import './InterviewResults.css';

const InterviewResults = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedQuestion, setExpandedQuestion] = useState(null);
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'jobseeker');
    const [showFeedback, setShowFeedback] = useState(false);

    useEffect(() => {
        fetchResults();
    }, [interviewId]);

    const fetchResults = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/interviews/${interviewId}/detailed-results`);
            setResults(response.data);
        } catch (err) {
            console.error('Error fetching results:', err);

            // SECURITY: If unauthorized or forbidden, redirect to landing/signup
            if (err.status === 401 || err.status === 403 || err.code === 'FORBIDDEN') {
                navigate('/');
                return;
            }

            setError(err.error || 'Failed to load results');
        } finally {
            setLoading(false);

            // Trigger feedback if it's a domain interview and not shown yet
            const userId = localStorage.getItem('userId');
            if (userId && !localStorage.getItem(`feedback_domain_${interviewId}`)) {
                setShowFeedback(true);
                localStorage.setItem(`feedback_domain_${interviewId}`, 'true');
            }
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'var(--success)';
        if (score >= 60) return 'var(--primary)';
        if (score >= 40) return 'var(--warning)';
        return 'var(--danger)';
    };

    const getQualityColor = (quality) => {
        switch (quality) {
            case 'excellent': return 'var(--success)';
            case 'good': return 'var(--primary)';
            case 'fair': return 'var(--warning)';
            default: return 'var(--danger)';
        }
    };

    // Helper to safely render any value as a string
    const safeRender = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (typeof value === 'object') {
            // If it's an object, try to extract a meaningful string
            if (value.text) return value.text;
            if (value.message) return value.message;
            if (value.name) return value.name;
            if (value.title) return value.title;
            return JSON.stringify(value);
        }
        return String(value);
    };

    if (loading) {
        return (
            <div className="results-page">
                <div className="loading-container skeleton-loading">
                    <Skeleton variant="title" width="250px" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '24px' }}>
                        <Skeleton variant="rect" height="100px" />
                        <Skeleton variant="rect" height="100px" />
                    </div>
                    <div style={{ marginTop: '24px' }}>
                        <CardSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="results-page">
                <div className="error-container card">
                    <h2>Unable to Load Results</h2>
                    <p>{safeRender(error)}</p>
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const { interview, candidate, job, scoring, strengths, weaknesses, breakdown, recommendations, codingResults } = results.data || results || {};

    // Safety checks
    if (!interview || !scoring) {
        return (
            <div className="results-page">
                <div className="error-container card">
                    <h2>Unable to Load Results</h2>
                    <p>Interview data is incomplete. Please try again.</p>
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="results-page">
            {/* Back Navigation */}
            <button
                className="back-btn"
                onClick={() => navigate(-1)}
                title="Go Back"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
            </button>

            {/* Header */}
            <div className="results-header card">
                <div className="header-content">
                    <div className="interview-info">
                        <h1>Interview Results</h1>
                        {job && <p className="job-title">{safeRender(job.title)} at {safeRender(job.company)}</p>}
                        <div className="meta-badges">
                            <span className={`badge ${interview.passed ? 'badge-success' : 'badge-danger'}`}>
                                {interview.passed ? 'Passed' : 'Not Passed'}
                            </span>
                            <span className="badge">Duration: {formatDuration(interview.duration || 0)}</span>
                            <span className="badge">{safeRender(interview.interviewType)} Interview</span>
                        </div>
                    </div>
                    <div className="overall-score">
                        <div
                            className="score-circle large"
                            style={{
                                background: `conic-gradient(${getScoreColor(scoring.overall)} ${scoring.overall * 3.6}deg, var(--bg-tertiary) 0deg)`
                            }}
                        >
                            <div className="score-inner">
                                <span className="score-value">{scoring.overall}</span>
                                <span className="score-label">Overall</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="results-tabs">
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recommendations')}
                >
                    Recommendations
                </button>
            </div>

            {/* Content */}
            <div className="results-content">
                {activeTab === 'overview' && (
                    <div className="overview-tab">
                        {/* Score Cards */}
                        <div className="score-cards">
                            <div className="score-card card">
                                <div className="score-icon technical">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                                    </svg>
                                </div>
                                <div className="score-details">
                                    <span className="score-title">Technical Skills</span>
                                    <span className="score-num" style={{ color: getScoreColor(scoring.technical || scoring.technicalScore || 0) }}>
                                        {scoring.technical || scoring.technicalScore || 0}%
                                    </span>
                                </div>
                                <div className="score-bar">
                                    <div
                                        className="score-fill"
                                        style={{
                                            width: `${scoring.technical || scoring.technicalScore || 0}%`,
                                            background: getScoreColor(scoring.technical || scoring.technicalScore || 0)
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div className="score-card card">
                                <div className="score-icon communication">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                                <div className="score-details">
                                    <span className="score-title">Communication</span>
                                    <span className="score-num" style={{ color: getScoreColor(scoring.communication || scoring.communicationScore || 0) }}>
                                        {scoring.communication || scoring.communicationScore || 0}%
                                    </span>
                                </div>
                                <div className="score-bar">
                                    <div
                                        className="score-fill"
                                        style={{
                                            width: `${scoring.communication || scoring.communicationScore || 0}%`,
                                            background: getScoreColor(scoring.communication || scoring.communicationScore || 0)
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div className="score-card card">
                                <div className="score-icon confidence">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                    </svg>
                                </div>
                                <div className="score-details">
                                    <span className="score-title">Confidence</span>
                                    <span className="score-num" style={{ color: getScoreColor(scoring.confidence || scoring.confidenceScore || 0) }}>
                                        {scoring.confidence || scoring.confidenceScore || 0}%
                                    </span>
                                </div>
                                <div className="score-bar">
                                    <div
                                        className="score-fill"
                                        style={{
                                            width: `${scoring.confidence || scoring.confidenceScore || 0}%`,
                                            background: getScoreColor(scoring.confidence || scoring.confidenceScore || 0)
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div className="score-card card">
                                <div className="score-icon relevance">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <circle cx="12" cy="12" r="6" />
                                        <circle cx="12" cy="12" r="2" />
                                    </svg>
                                </div>
                                <div className="score-details">
                                    <span className="score-title">Relevance</span>
                                    <span className="score-num" style={{ color: getScoreColor(scoring.relevance || scoring.relevanceScore || 0) }}>
                                        {scoring.relevance || scoring.relevanceScore || 0}%
                                    </span>
                                </div>
                                <div className="score-bar">
                                    <div
                                        className="score-fill"
                                        style={{
                                            width: `${scoring.relevance}%`,
                                            background: getScoreColor(scoring.relevance)
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Coding Score Card - Only show if coding was done */}
                            {(typeof scoring.coding === 'number' || codingResults) && (
                                <div className="score-card card coding-score">
                                    <div className="score-icon coding">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="16 18 22 12 16 6" />
                                            <polyline points="8 6 2 12 8 18" />
                                        </svg>
                                    </div>
                                    <div className="score-details">
                                        <span className="score-title">
                                            Coding {codingResults?.language ? `(${codingResults.language})` : ''}
                                        </span>
                                        <span className="score-num" style={{ color: getScoreColor(scoring.coding || 0) }}>
                                            {codingResults?.skipped === true ? 'Skipped' : `${scoring.coding || 0}%`}
                                        </span>
                                    </div>
                                    {codingResults?.skipped !== true && typeof scoring.coding === 'number' && (
                                        <div className="score-bar">
                                            <div
                                                className="score-fill"
                                                style={{
                                                    width: `${scoring.coding || 0}%`,
                                                    background: getScoreColor(scoring.coding || 0)
                                                }}
                                            ></div>
                                        </div>
                                    )}
                                    {typeof codingResults?.testsPassed === 'number' && (
                                        <div className="coding-tests-info">
                                            Tests: {codingResults.testsPassed}/{codingResults.totalTests || 0}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="analysis-section">
                            <div className="strengths-card card">
                                <h3>Strengths</h3>
                                <ul>
                                    {(strengths || []).map((s, i) => (
                                        <li key={i} className="strength-item">{safeRender(s)}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="weaknesses-card card">
                                <h3>Areas for Improvement</h3>
                                <ul>
                                    {(weaknesses || []).length > 0 ? (weaknesses || []).map((w, i) => (
                                        <li key={i} className="weakness-item">{safeRender(w)}</li>
                                    )) : (
                                        <li className="no-items">Great job! No major weaknesses identified.</li>
                                    )}
                                </ul>
                            </div>
                        </div>

                        {/* Detailed Feedback */}
                        {results.detailedFeedback && (
                            <div className="feedback-section card">
                                <h3>Detailed Feedback</h3>
                                <p>{safeRender(results.detailedFeedback)}</p>
                            </div>
                        )}
                    </div>
                )}



                {activeTab === 'recommendations' && (
                    <div className="recommendations-tab">
                        <h2>Personalized Recommendations</h2>
                        <p className="recommendations-intro">
                            Based on your interview performance, here are tailored suggestions to help you improve:
                        </p>

                        <div className="recommendations-list">
                            {(recommendations || []).map((rec, index) => (
                                <div key={index} className={`recommendation-card card priority-${safeRender(rec?.priority)}`}>
                                    <div className="rec-header">
                                        <span className={`priority-badge ${safeRender(rec?.priority)}`}>
                                            {rec?.priority === 'high' ? '🔴' : rec?.priority === 'medium' ? '🟡' : '🟢'}
                                            {safeRender(rec?.priority)} priority
                                        </span>
                                        <h3>{safeRender(rec?.area)}</h3>
                                    </div>
                                    <p className="rec-suggestion">{safeRender(rec?.suggestion)}</p>
                                    {rec?.resources?.length > 0 && (
                                        <div className="rec-resources">
                                            <strong>Helpful Resources:</strong>
                                            <div className="resource-tags">
                                                {rec.resources.map((r, i) => (
                                                    <span key={i} className="resource-tag">{safeRender(r)}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {recommendations.length === 0 && (
                            <div className="no-recommendations card">
                                <h3>🎉 Excellent Performance!</h3>
                                <p>You did great in this interview. Keep up the good work and continue refining your skills!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            {userRole === 'jobseeker' && (
                <div className="results-actions">
                    <button className="btn btn-primary" onClick={() => navigate('/jobseeker/jobs')}>
                        Browse More Jobs
                    </button>
                </div>
            )}

            {showFeedback && (
                <FeedbackModal
                    featureId="domain-interview"
                    onClose={() => {
                        setShowFeedback(false);
                        localStorage.setItem(`feedback_domain_${interviewId}`, 'true');
                        navigate('/jobseeker/jobs');
                    }}
                    userId={localStorage.getItem('userId')}
                />
            )}
        </div>
    );
};

export default InterviewResults;
