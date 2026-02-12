import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';

const ChallengeHistory = ({ userId }) => {
    const [stats, setStats] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, [userId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const [statsRes, historyRes] = await Promise.all([
                api.get(`/challenges/history/stats?userId=${userId}`),
                api.get(`/challenges/history?userId=${userId}&limit=50`)
            ]);
            setStats(statsRes.data);
            setAttempts(historyRes.data || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="challenges-loading">
                {[1, 2, 3].map(i => <div key={i} className="challenge-skeleton"><div className="skeleton-shimmer" /></div>)}
            </div>
        );
    }

    return (
        <div className="challenge-history">
            {/* Stats Summary */}
            {stats && (
                <div className="history-stats-grid">
                    <motion.div className="history-stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                        <div className="history-stat-value">{stats.totalCompleted}</div>
                        <div className="history-stat-label">Completed</div>
                    </motion.div>
                    <motion.div className="history-stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <div className="history-stat-value">{stats.avgScore}%</div>
                        <div className="history-stat-label">Avg Score</div>
                    </motion.div>
                    <motion.div className="history-stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <div className="history-stat-value">+{(stats.totalATPEarned || 0).toFixed(1)}</div>
                        <div className="history-stat-label">ATP Earned</div>
                    </motion.div>
                    <motion.div className="history-stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <div className="history-stat-value">🔥 {stats.streak || 0}</div>
                        <div className="history-stat-label">Day Streak</div>
                    </motion.div>
                </div>
            )}

            {/* Improvement Chart (Simple bar representation) */}
            {stats?.scoreHistory?.length > 0 && (
                <div className="history-chart-container">
                    <h3>Score Trend</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, padding: '0 4px' }}>
                        {stats.scoreHistory.slice(-20).map((entry, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${entry.score}%` }}
                                    transition={{ delay: i * 0.03, duration: 0.4 }}
                                    style={{
                                        width: '100%',
                                        maxWidth: 24,
                                        borderRadius: '4px 4px 0 0',
                                        background: entry.score >= 70
                                            ? 'linear-gradient(to top, #059669, #10b981)'
                                            : entry.score >= 40
                                                ? 'linear-gradient(to top, #d97706, #f59e0b)'
                                                : 'linear-gradient(to top, #dc2626, #ef4444)',
                                        minHeight: 4
                                    }}
                                    title={`${entry.score}% - ${entry.domain || ''}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Domain Breakdown */}
            {stats?.byDomain && Object.keys(stats.byDomain).length > 0 && (
                <div className="history-chart-container">
                    <h3>By Domain</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {Object.entries(stats.byDomain).sort((a, b) => b[1] - a[1]).map(([domain, count], i) => (
                            <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: '0.78rem', color: '#94a3b8', minWidth: 140, textAlign: 'right' }}>{domain}</span>
                                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(count / stats.totalCompleted) * 100}%` }}
                                        transition={{ delay: i * 0.1 }}
                                        style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 4 }}
                                    />
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: 24 }}>{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Attempt History List */}
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 12px' }}>Recent Attempts</h3>
            {attempts.length === 0 ? (
                <div className="challenges-empty">
                    <div className="empty-icon">📊</div>
                    <h3>No Challenge History</h3>
                    <p>Complete challenges to see your progress here.</p>
                </div>
            ) : (
                <div className="history-list">
                    {attempts.map((attempt, i) => (
                        <motion.div
                            key={attempt._id}
                            className="history-item"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <div className="history-item-info">
                                <div className="history-item-title">
                                    {attempt.challengeId?.title || 'Challenge'}
                                </div>
                                <div className="history-item-meta">
                                    <span>{attempt.challengeId?.domain || '-'}</span>
                                    <span className={`difficulty-badge ${attempt.challengeId?.difficulty}`} style={{ padding: '1px 6px', fontSize: '0.6rem' }}>
                                        {attempt.challengeId?.difficulty}
                                    </span>
                                    <span>{formatDate(attempt.completedAt)}</span>
                                    {attempt.timeSpent && <span>{Math.round(attempt.timeSpent / 60)}m</span>}
                                </div>
                            </div>
                            <div className="history-item-score">
                                <div className={`history-score-value ${getScoreColor(attempt.finalScore)}`}>
                                    {attempt.finalScore || 0}%
                                </div>
                                {attempt.atpImpactScore > 0 && (
                                    <span className="history-atp-badge">ATP +{attempt.atpImpactScore}</span>
                                )}
                                {attempt.riskLevel && attempt.riskLevel !== 'low' && (
                                    <span className={`risk-indicator ${attempt.riskLevel}`} style={{ marginTop: 4 }}>
                                        {attempt.riskLevel}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChallengeHistory;
