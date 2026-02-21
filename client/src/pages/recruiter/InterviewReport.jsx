import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import './InterviewReport.css';

const InterviewReport = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [report, setReport] = useState(null);
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [validating, setValidating] = useState(false);
    const [showEditPanel, setShowEditPanel] = useState(false);
    const [validation, setValidation] = useState({
        comments: '',
        overrideScore: '',
        overrideRecommendation: ''
    });

    useEffect(() => {
        fetchReport();
    }, [roomCode]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/video-rooms/${roomCode}`);
            setRoom(res.data.data);
            setReport(res.data.data?.postInterviewReport?.rawReport || res.data.data?.postInterviewReport || null);
        } catch (error) {
            toast.error('Failed to load report');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        try {
            setGenerating(true);
            const res = await api.post(`/video-rooms/${roomCode}/report`);
            setReport(res.data.data);
            toast.success('Report generated successfully!');
        } catch (error) {
            toast.error('Failed to generate report');
        } finally {
            setGenerating(false);
        }
    };

    const handleValidation = async (decision) => {
        try {
            setValidating(true);
            await api.put(`/video-rooms/${roomCode}/report/validate`, {
                decision,
                overrideScore: validation.overrideScore ? parseInt(validation.overrideScore) : undefined,
                overrideRecommendation: validation.overrideRecommendation || undefined,
                comments: validation.comments
            });
            toast.success(`Report ${decision}!`);
            fetchReport();
        } catch (error) {
            toast.error('Validation failed');
        } finally {
            setValidating(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#6366f1';
        if (score >= 40) return '#f59e0b';
        return '#ef4444';
    };

    const getScoreClass = (score) => {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    };

    const getRecommendationEmoji = (rec) => {
        const map = { strong_hire: '🌟', hire: '✅', maybe: '🤔', no_hire: '❌' };
        return map[rec] || '❓';
    };

    if (loading) {
        return (
            <div className="interview-report">
                <div className="report-loading">
                    <div className="spinner" />
                    <p>Loading report...</p>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="interview-report">
                <div className="report-header">
                    <div className="report-header-content">
                        <h1>📊 Post-Interview Report</h1>
                        <div className="report-meta">
                            <span>Room: {roomCode}</span>
                            <span>Status: {room?.status || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
                <div className="report-section" style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <h2 style={{ border: 'none', justifyContent: 'center' }}>No Report Generated Yet</h2>
                    <p style={{ color: '#6b7280', marginBottom: 24 }}>
                        Generate an AI-powered intelligence report from the interview transcript, notes, and integrity signals.
                    </p>
                    <button
                        onClick={handleGenerateReport}
                        disabled={generating}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white', border: 'none', padding: '14px 32px',
                            borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer'
                        }}
                    >
                        {generating ? '⏳ Generating Report...' : '🤖 Generate AI Report'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="interview-report">
            {/* Header */}
            <motion.div className="report-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="report-header-content">
                    <h1>📊 Post-Interview Intelligence Report</h1>
                    <div className="report-meta">
                        <span>📋 Room: {roomCode}</span>
                        <span>👤 {room?.candidateId?.profile?.name || 'Candidate'}</span>
                        <span>💼 {room?.jobId?.title || 'Position'}</span>
                        <span>🕐 {room?.duration || 0} min</span>
                    </div>
                </div>
            </motion.div>

            {/* Score Cards */}
            <motion.div className="report-score-cards"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="score-card">
                    <p className="score-value">{report.overallScore || 0}</p>
                    <p className="score-label">Overall Score</p>
                </div>
                <div className="score-card">
                    <p className="score-value">{report.technicalAssessment?.score || 0}</p>
                    <p className="score-label">Technical</p>
                </div>
                <div className="score-card">
                    <p className="score-value">{report.communicationAssessment?.score || 0}</p>
                    <p className="score-label">Communication</p>
                </div>
                <div className="score-card recommendation">
                    <p className="score-value">
                        {getRecommendationEmoji(report.recommendation)} {(report.recommendation || 'undecided').replace('_', ' ')}
                    </p>
                    <p className="score-label">Recommendation</p>
                </div>
            </motion.div>

            {/* Executive Summary */}
            <motion.div className="report-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <h2>📝 Executive Summary</h2>
                <div className="executive-summary">
                    {report.executiveSummary || report.summary || 'No summary available.'}
                </div>
            </motion.div>

            {/* Competency Scores */}
            {report.competencyScores && report.competencyScores.length > 0 && (
                <motion.div className="report-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2>🎯 Competency Analysis</h2>
                    <div className="competency-grid">
                        {report.competencyScores.map((comp, i) => (
                            <div key={i} className="competency-item">
                                <div className="competency-item-header">
                                    <h3>{comp.competency}</h3>
                                    <span className={`competency-score ${getScoreClass(comp.score)}`}>
                                        {comp.score}
                                    </span>
                                </div>
                                <div className="competency-bar">
                                    <div
                                        className="competency-bar-fill"
                                        style={{
                                            width: `${comp.score}%`,
                                            background: getScoreColor(comp.score)
                                        }}
                                    />
                                </div>
                                <div className="competency-evidence">
                                    <ul>
                                        {(comp.evidence || []).map((e, j) => (
                                            <li key={j}>{e}</li>
                                        ))}
                                    </ul>
                                    {comp.strengths?.length > 0 && (
                                        <p style={{ color: '#10b981', fontSize: 12 }}>
                                            ✅ {comp.strengths.join(', ')}
                                        </p>
                                    )}
                                    {comp.concerns?.length > 0 && (
                                        <p style={{ color: '#ef4444', fontSize: 12 }}>
                                            ⚠️ {comp.concerns.join(', ')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Technical Assessment */}
            {report.technicalAssessment && (
                <motion.div className="report-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <h2>💻 Technical Assessment</h2>
                    <p><strong>Depth:</strong> {report.technicalAssessment.depth || 'N/A'}</p>

                    {report.technicalAssessment.keyFindings?.length > 0 && (
                        <ul>
                            {report.technicalAssessment.keyFindings.map((f, i) => (
                                <li key={i} style={{ margin: '6px 0', color: '#374151' }}>{f}</li>
                            ))}
                        </ul>
                    )}

                    <div className="tech-skills">
                        {(report.technicalAssessment.skillsVerified || []).map((s, i) => (
                            <span key={i} className="skill-tag verified">✅ {s}</span>
                        ))}
                        {(report.technicalAssessment.skillGaps || []).map((s, i) => (
                            <span key={i} className="skill-tag gap">❌ {s}</span>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Key Quotes */}
            {report.keyQuotes && report.keyQuotes.length > 0 && (
                <motion.div className="report-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h2>💬 Key Quotes</h2>
                    {report.keyQuotes.map((q, i) => (
                        <div key={i} className={`quote-card ${q.sentiment}`}>
                            <p className="quote-text">"{q.quote}"</p>
                            <p className="quote-context">{q.context}</p>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Integrity Assessment */}
            {report.integrityAssessment && (
                <motion.div className="report-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <h2>🛡️ Integrity Assessment</h2>
                    <span className={`integrity-badge ${report.integrityAssessment.overallLevel}`}>
                        {report.integrityAssessment.overallLevel === 'green' && '✅'}
                        {report.integrityAssessment.overallLevel === 'yellow' && '⚠️'}
                        {report.integrityAssessment.overallLevel === 'red' && '🚨'}
                        {' '}{(report.integrityAssessment.overallLevel || 'green').toUpperCase()}
                    </span>
                    <p style={{ marginTop: 12, color: '#374151' }}>
                        {report.integrityAssessment.summary}
                    </p>
                    {report.integrityAssessment.flagCount > 0 && (
                        <p style={{ fontSize: 13, color: '#6b7280' }}>
                            {report.integrityAssessment.flagCount} flag(s) detected during interview
                        </p>
                    )}
                </motion.div>
            )}

            {/* Follow-Up Recommendations */}
            {report.followUpRecommendations && report.followUpRecommendations.length > 0 && (
                <motion.div className="report-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <h2>📋 Follow-Up Recommendations</h2>
                    <ul className="followup-list">
                        {report.followUpRecommendations.map((r, i) => (
                            <li key={i}>{r}</li>
                        ))}
                    </ul>
                </motion.div>
            )}

            {/* Recruiter Validation Panel */}
            <motion.div className="validation-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
            >
                <h2>⚖️ Recruiter Validation</h2>
                <p style={{ color: '#4b5563', fontSize: 14 }}>
                    Review the AI-generated report and confirm, edit, or override the assessment.
                    Your validation is required before ATP updates.
                </p>

                {room?.recruiterValidation ? (
                    <div style={{ background: '#d1fae5', padding: 16, borderRadius: 10, marginTop: 12 }}>
                        <p style={{ color: '#065f46', fontWeight: 600 }}>
                            ✅ Report validated ({room.recruiterValidation.decision}) on{' '}
                            {new Date(room.recruiterValidation.validatedAt).toLocaleDateString()}
                        </p>
                        {room.recruiterValidation.recruiterComments && (
                            <p style={{ color: '#065f46', fontSize: 13 }}>
                                Comment: {room.recruiterValidation.recruiterComments}
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        {showEditPanel && (
                            <div className="override-inputs">
                                <div className="override-input">
                                    <label>Override Score (0-100)</label>
                                    <input
                                        type="number" min="0" max="100"
                                        value={validation.overrideScore}
                                        onChange={(e) => setValidation({ ...validation, overrideScore: e.target.value })}
                                        placeholder="Leave empty to keep AI score"
                                    />
                                </div>
                                <div className="override-input">
                                    <label>Override Recommendation</label>
                                    <select
                                        value={validation.overrideRecommendation}
                                        onChange={(e) => setValidation({ ...validation, overrideRecommendation: e.target.value })}
                                    >
                                        <option value="">Keep AI recommendation</option>
                                        <option value="strong_hire">Strong Hire 🌟</option>
                                        <option value="hire">Hire ✅</option>
                                        <option value="maybe">Maybe 🤔</option>
                                        <option value="no_hire">No Hire ❌</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <textarea
                            className="validation-comments"
                            placeholder="Add your comments about this candidate (optional)..."
                            value={validation.comments}
                            onChange={(e) => setValidation({ ...validation, comments: e.target.value })}
                        />

                        <div className="validation-actions">
                            <button
                                className="validation-btn accept"
                                onClick={() => handleValidation('accepted')}
                                disabled={validating}
                            >
                                ✅ Accept Report
                            </button>
                            <button
                                className="validation-btn edit"
                                onClick={() => {
                                    if (!showEditPanel) {
                                        setShowEditPanel(true);
                                    } else {
                                        handleValidation('edited');
                                    }
                                }}
                                disabled={validating}
                            >
                                ✏️ {showEditPanel ? 'Submit Edits' : 'Edit & Override'}
                            </button>
                            <button
                                className="validation-btn reject"
                                onClick={() => handleValidation('rejected')}
                                disabled={validating}
                            >
                                ❌ Reject Report
                            </button>
                        </div>
                    </>
                )}
            </motion.div>

            {/* Back Button */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'none', border: '1px solid #d1d5db', padding: '10px 24px',
                        borderRadius: 10, fontWeight: 600, cursor: 'pointer', color: '#6b7280'
                    }}
                >
                    ← Back
                </button>
            </div>
        </div>
    );
};

export default InterviewReport;
