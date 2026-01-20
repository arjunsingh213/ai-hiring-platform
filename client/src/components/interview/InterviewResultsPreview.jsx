import React, { useState } from 'react';

const InterviewResultsPreview = ({ results, onContinue }) => {
    const [activeTab, setActiveTab] = useState('overview');

    if (!results) return null;

    // Handle both data structures (direct from API vs nested data property)
    const { interview, candidate, job, scoring, strengths, weaknesses, recommendations, codingResults } = results.data || results || {};

    // Helper functions
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981'; // success
        if (score >= 60) return '#3b82f6'; // primary
        if (score >= 40) return '#f59e0b'; // warning
        return '#ef4444'; // danger
    };

    const safeRender = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return value.text || value.message || JSON.stringify(value);
        return String(value);
    };

    return (
        <div className="interview-results-preview">
            {/* Header Card */}
            <div className="card results-header" style={{ marginBottom: '24px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>Preliminary Results</h2>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`badge ${scoring?.overall >= 60 ? 'badge-success' : 'badge-danger'}`}
                                style={{
                                    padding: '4px 12px', borderRadius: '16px', fontSize: '0.875rem', fontWeight: '500',
                                    backgroundColor: scoring?.overall >= 60 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: scoring?.overall >= 60 ? '#10b981' : '#ef4444'
                                }}>
                                {scoring?.overall >= 60 ? 'Passing Score' : 'Needs Improvement'}
                            </span>
                            <span className="badge" style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.875rem', backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                                {safeRender(interview?.interviewType || 'Technical')}
                            </span>
                        </div>
                    </div>

                    {/* Overall Score Circle */}
                    <div style={{
                        position: 'relative', width: '80px', height: '80px', borderRadius: '50%',
                        background: `conic-gradient(${getScoreColor(scoring?.overall || 0)} ${(scoring?.overall || 0) * 3.6}deg, #e5e7eb 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{
                            width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'white',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>{scoring?.overall || 0}</span>
                            <span style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase' }}>Overall</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Tabs */}
            <div className="results-tabs" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        padding: '12px 16px', borderBottom: activeTab === 'overview' ? '2px solid #3b82f6' : 'none',
                        color: activeTab === 'overview' ? '#3b82f6' : '#6b7280', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer'
                    }}>
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('feedback')}
                    style={{
                        padding: '12px 16px', borderBottom: activeTab === 'feedback' ? '2px solid #3b82f6' : 'none',
                        color: activeTab === 'feedback' ? '#3b82f6' : '#6b7280', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer'
                    }}>
                    Feedback & Growth
                </button>
            </div>

            <div className="results-content">
                {activeTab === 'overview' && (
                    <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                        {/* Breakdown Scores */}
                        <div className="card" style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>Detailed Breakdown</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Metric Item */}
                                {['Technical', 'Communication', 'Confidence', 'Relevance'].map((metric) => {
                                    const key = metric.toLowerCase();
                                    const score = scoring?.[key] || 0;
                                    return (
                                        <div key={key}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>{metric}</span>
                                                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: getScoreColor(score) }}>{score}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${score}%`, height: '100%', backgroundColor: getScoreColor(score), borderRadius: '4px' }}></div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Coding Score (Conditional) */}
                                {(typeof scoring?.coding === 'number' || codingResults) && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                                                Coding {codingResults?.language ? `(${codingResults.language})` : ''}
                                            </span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: getScoreColor(scoring?.coding || 0) }}>
                                                {codingResults?.skipped ? 'Skipped' : `${scoring?.coding || 0}%`}
                                            </span>
                                        </div>
                                        {codingResults?.skipped !== true && (
                                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${scoring?.coding || 0}%`, height: '100%', backgroundColor: getScoreColor(scoring?.coding || 0), borderRadius: '4px' }}></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Strengths */}
                        <div className="card" style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>Key Strengths</h3>
                            <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                {(strengths || []).map((s, i) => (
                                    <li key={i} style={{ marginBottom: '8px', color: '#4b5563' }}>{safeRender(s)}</li>
                                ))}
                                {(!strengths || strengths.length === 0) && <li style={{ color: '#9ca3af' }}>No specific strengths highlighted.</li>}
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === 'feedback' && (
                    <div className="feedback-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Areas for Improvement */}
                        <div className="card" style={{ padding: '24px', borderLeft: '4px solid #f59e0b' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px', color: '#b45309' }}>Areas for Growth</h3>
                            <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                {(weaknesses || []).map((w, i) => (
                                    <li key={i} style={{ marginBottom: '8px', color: '#4b5563' }}>{safeRender(w)}</li>
                                ))}
                                {(!weaknesses || weaknesses.length === 0) && <li style={{ color: '#10b981' }}>Great job! No major concerns identified.</li>}
                            </ul>
                        </div>

                        {/* Detailed Suggestions */}
                        {(recommendations?.length > 0) && (
                            <div className="card" style={{ padding: '24px' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>AI Recommendations</h3>
                                <div style={{ display: 'grid', gap: '16px' }}>
                                    {recommendations.map((rec, i) => (
                                        <div key={i} style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{
                                                    width: '8px', height: '8px', borderRadius: '50%',
                                                    backgroundColor: rec?.priority === 'high' ? '#ef4444' : rec?.priority === 'medium' ? '#f59e0b' : '#10b981'
                                                }}></span>
                                                <strong style={{ color: '#111827' }}>{safeRender(rec?.area)}</strong>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563' }}>{safeRender(rec?.suggestion)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Persistence Note */}
            <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.875rem', color: '#1e40af' }}>
                <strong>Note:</strong> These results have been saved to your profile. You can review them anytime in the "My Interviews" section after admin approval.
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                <button
                    className="btn btn-primary"
                    onClick={onContinue}
                    style={{ padding: '12px 32px', fontSize: '1rem' }}
                >
                    Continue to Dashboard
                </button>
            </div>
        </div>
    );
};

export default InterviewResultsPreview;
