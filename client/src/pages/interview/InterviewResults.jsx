import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './InterviewResults.css';

const InterviewResults = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedQuestion, setExpandedQuestion] = useState(null);

    useEffect(() => {
        fetchResults();
    }, [interviewId]);

    const fetchResults = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/interviews/${interviewId}/detailed-results`);
            setResults(response.data);
        } catch (err) {
            setError(err.error || 'Failed to load results');
        } finally {
            setLoading(false);
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

    if (loading) {
        return (
            <div className="results-page">
                <div className="loading-container">
                    <div className="loading-spinner large"></div>
                    <p>Loading your results...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="results-page">
                <div className="error-container card">
                    <h2>Unable to Load Results</h2>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/jobseeker/interviews')}>
                        Back to Interviews
                    </button>
                </div>
            </div>
        );
    }

    const { interview, candidate, job, scoring, strengths, weaknesses, breakdown, recommendations } = results;

    return (
        <div className="results-page">
            {/* Header */}
            <div className="results-header card">
                <div className="header-content">
                    <div className="interview-info">
                        <h1>Interview Results</h1>
                        {job && <p className="job-title">{job.title} at {job.company}</p>}
                        <div className="meta-badges">
                            <span className={`badge ${interview.passed ? 'badge-success' : 'badge-danger'}`}>
                                {interview.passed ? '✓ Passed' : '✗ Not Passed'}
                            </span>
                            <span className="badge">Duration: {formatDuration(interview.duration)}</span>
                            <span className="badge">{interview.interviewType} Interview</span>
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
                    className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('questions')}
                >
                    Question Breakdown
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
                                <div className="score-icon technical">📊</div>
                                <div className="score-details">
                                    <span className="score-title">Technical Skills</span>
                                    <span className="score-num" style={{ color: getScoreColor(scoring.technical) }}>
                                        {scoring.technical}%
                                    </span>
                                </div>
                                <div className="score-bar">
                                    <div
                                        className="score-fill"
                                        style={{
                                            width: `${scoring.technical}%`,
                                            background: getScoreColor(scoring.technical)
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div className="score-card card">
                                <div className="score-icon communication">💬</div>
                                <div className="score-details">
                                    <span className="score-title">Communication</span>
                                    <span className="score-num" style={{ color: getScoreColor(scoring.communication) }}>
                                        {scoring.communication}%
                                    </span>
                                </div>
                                <div className="score-bar">
                                    <div
                                        className="score-fill"
                                        style={{
                                            width: `${scoring.communication}%`,
                                            background: getScoreColor(scoring.communication)
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div className="score-card card">
                                <div className="score-icon confidence">💪</div>
                                <div className="score-details">
                                    <span className="score-title">Confidence</span>
                                    <span className="score-num" style={{ color: getScoreColor(scoring.confidence) }}>
                                        {scoring.confidence}%
                                    </span>
                                </div>
                                <div className="score-bar">
                                    <div
                                        className="score-fill"
                                        style={{
                                            width: `${scoring.confidence}%`,
                                            background: getScoreColor(scoring.confidence)
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div className="score-card card">
                                <div className="score-icon relevance">🎯</div>
                                <div className="score-details">
                                    <span className="score-title">Relevance</span>
                                    <span className="score-num" style={{ color: getScoreColor(scoring.relevance) }}>
                                        {scoring.relevance}%
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
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="analysis-section">
                            <div className="strengths-card card">
                                <h3>✓ Strengths</h3>
                                <ul>
                                    {strengths.map((s, i) => (
                                        <li key={i} className="strength-item">{s}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="weaknesses-card card">
                                <h3>⚠ Areas for Improvement</h3>
                                <ul>
                                    {weaknesses.length > 0 ? weaknesses.map((w, i) => (
                                        <li key={i} className="weakness-item">{w}</li>
                                    )) : (
                                        <li className="no-items">Great job! No major weaknesses identified.</li>
                                    )}
                                </ul>
                            </div>
                        </div>

                        {/* Detailed Feedback */}
                        {results.detailedFeedback && (
                            <div className="feedback-section card">
                                <h3>📝 Detailed Feedback</h3>
                                <p>{results.detailedFeedback}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'questions' && (
                    <div className="questions-tab">
                        <div className="questions-list">
                            {breakdown.map((item, index) => (
                                <div
                                    key={index}
                                    className={`question-card card ${expandedQuestion === index ? 'expanded' : ''}`}
                                >
                                    <div
                                        className="question-header"
                                        onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                                    >
                                        <div className="question-info">
                                            <span className="question-number">Q{item.questionNumber}</span>
                                            <div className="question-meta">
                                                <span className={`category-badge ${item.category}`}>
                                                    {item.category}
                                                </span>
                                                <span className="difficulty-badge">
                                                    {item.difficulty}
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className="quality-badge"
                                            style={{ background: getQualityColor(item.qualityScore) }}
                                        >
                                            {item.qualityLabel}
                                        </div>
                                        <span className="expand-icon">
                                            {expandedQuestion === index ? '▼' : '▶'}
                                        </span>
                                    </div>

                                    <div className="question-text">
                                        <strong>Question:</strong> {item.question}
                                    </div>

                                    {expandedQuestion === index && (
                                        <div className="question-details">
                                            <div className="answer-section">
                                                <h4>Your Answer:</h4>
                                                <p className="answer-text">{item.answer}</p>
                                                <span className="word-count">{item.wordCount} words</span>
                                            </div>

                                            {item.assessingSkill && (
                                                <div className="skill-section">
                                                    <strong>Skill Assessed:</strong> {item.assessingSkill}
                                                </div>
                                            )}

                                            <div className="feedback-section">
                                                <h4>Feedback:</h4>
                                                <p>{item.feedback}</p>
                                            </div>

                                            {item.expectedTopics.length > 0 && (
                                                <div className="topics-section">
                                                    <strong>Expected Topics:</strong>
                                                    <div className="topic-tags">
                                                        {item.expectedTopics.map((t, i) => (
                                                            <span key={i} className="topic-tag">{t}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'recommendations' && (
                    <div className="recommendations-tab">
                        <h2>Personalized Recommendations</h2>
                        <p className="recommendations-intro">
                            Based on your interview performance, here are tailored suggestions to help you improve:
                        </p>

                        <div className="recommendations-list">
                            {recommendations.map((rec, index) => (
                                <div key={index} className={`recommendation-card card priority-${rec.priority}`}>
                                    <div className="rec-header">
                                        <span className={`priority-badge ${rec.priority}`}>
                                            {rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'}
                                            {rec.priority} priority
                                        </span>
                                        <h3>{rec.area}</h3>
                                    </div>
                                    <p className="rec-suggestion">{rec.suggestion}</p>
                                    {rec.resources.length > 0 && (
                                        <div className="rec-resources">
                                            <strong>Helpful Resources:</strong>
                                            <div className="resource-tags">
                                                {rec.resources.map((r, i) => (
                                                    <span key={i} className="resource-tag">{r}</span>
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
            <div className="results-actions">
                <button className="btn btn-secondary" onClick={() => navigate('/jobseeker/interviews')}>
                    Back to Interviews
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/jobseeker/jobs')}>
                    Browse More Jobs
                </button>
            </div>
        </div>
    );
};

export default InterviewResults;
