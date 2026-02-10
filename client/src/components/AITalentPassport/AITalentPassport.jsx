import React, { useState, useEffect } from 'react';
import FeedbackModal from '../FeedbackModal';
import './AITalentPassport.css';

/**
 * AI Talent Passport Component
 * Professional, industry-ready design with no emojis
 * Uses SVG icons and clean data visualization
 */
const AITalentPassport = ({ passport, userName }) => {
    const [showFeedback, setShowFeedback] = useState(false);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        if (passport && passport.isActive && userId) {
            const feedbackShown = localStorage.getItem(`feedback_atp_${userId}`);
            if (!feedbackShown) {
                // Show after a slight delay to let user see the passport first
                const timer = setTimeout(() => {
                    setShowFeedback(true);
                    localStorage.setItem(`feedback_atp_${userId}`, 'true');
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [passport, userId]);

    if (!passport || !passport.isActive) {
        return (
            <div className="atp-container">
                <div className="atp-empty-state">
                    <div className="atp-empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h3>AI Talent Passport</h3>
                    <p>Complete interviews and assessments to generate your verified talent credentials</p>
                </div>
            </div>
        );
    }

    const {
        talentScore, domainScore, communicationScore, problemSolvingScore,
        gdScore, professionalismScore, globalPercentile, levelBand,
        skillHeatmap, proofOfWork, behavioralProfile, reliability,
        careerPredictions, version, lastUpdated
    } = passport;

    const getScoreLevel = (score) => {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'average';
        return 'needs-improvement';
    };

    const formatDate = (date) => {
        if (!date) return 'Not available';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="atp-container">
            {/* Header */}
            <div className="atp-header">
                <div className="atp-header-left">
                    <h2>AI Talent Passport</h2>
                    <div className="atp-meta">
                        <span className="atp-version">{version || 'v1.0'}</span>
                        <span className="atp-separator">|</span>
                        <span className="atp-updated">Updated {formatDate(lastUpdated)}</span>
                    </div>
                </div>
                <div className="atp-header-right">
                    <div className={`atp-level-badge level-${levelBand?.replace(' ', '-').toLowerCase()}`}>
                        {levelBand || 'Level 1'}
                    </div>
                </div>
            </div>

            {/* Main Score Card */}
            <div className="atp-main-card">
                <div className="atp-score-display">
                    <div className={`atp-score-ring ${getScoreLevel(talentScore)}`}>
                        <svg viewBox="0 0 36 36" className="atp-circular-chart">
                            <path className="atp-circle-bg"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path className="atp-circle-progress"
                                strokeDasharray={`${talentScore}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <div className="atp-score-text">
                            <span className="atp-score-value">{talentScore || 0}</span>
                            <span className="atp-score-max">/100</span>
                        </div>
                    </div>
                    <div className="atp-score-label">Talent Score</div>
                </div>
                <div className="atp-percentile-info">
                    <div className="atp-percentile-value">Top {Math.max(1, 100 - (globalPercentile || 0))}%</div>
                    <div className="atp-percentile-label">Global Ranking</div>
                </div>
            </div>

            {/* Core Competencies */}
            <div className="atp-section">
                <h3 className="atp-section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Core Competencies
                </h3>
                <div className="atp-competencies-grid">
                    <CompetencyCard title="Domain Expertise" score={domainScore} />
                    <CompetencyCard title="Communication" score={communicationScore} />
                    <CompetencyCard title="Problem Solving" score={problemSolvingScore} />
                    <CompetencyCard title="Group Discussion" score={gdScore} />
                    <CompetencyCard title="Professionalism" score={professionalismScore} />
                </div>
            </div>

            {/* Skill Proficiency */}
            {skillHeatmap && skillHeatmap.length > 0 && (
                <div className="atp-section">
                    <h3 className="atp-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Skill Proficiency
                    </h3>
                    <div className="atp-skills-list">
                        {skillHeatmap.slice(0, 8).map((skill, index) => (
                            <div key={index} className="atp-skill-row">
                                <span className="atp-skill-name">{skill.skillName}</span>
                                <div className="atp-skill-bar-container">
                                    <div
                                        className={`atp-skill-bar ${getScoreLevel(skill.proficiency)}`}
                                        style={{ width: `${skill.proficiency}%` }}
                                    />
                                </div>
                                <span className="atp-skill-value">{skill.proficiency}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Proof of Work */}
            <div className="atp-section">
                <h3 className="atp-section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Verified Achievements
                </h3>
                <div className="atp-achievements-grid">
                    <div className="atp-achievement-card">
                        <div className="atp-achievement-icon coding">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </div>
                        <div className="atp-achievement-content">
                            <span className="atp-achievement-value">{proofOfWork?.codingTasks?.completed || 0}</span>
                            <span className="atp-achievement-label">Coding Assessments</span>
                            <span className="atp-achievement-avg">Avg: {Math.round(proofOfWork?.codingTasks?.avgScore || 0)}%</span>
                        </div>
                    </div>
                    <div className="atp-achievement-card">
                        <div className="atp-achievement-icon simulations">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="atp-achievement-content">
                            <span className="atp-achievement-value">{proofOfWork?.simulations?.completed || 0}</span>
                            <span className="atp-achievement-label">Simulations</span>
                            <span className="atp-achievement-avg">Avg: {Math.round(proofOfWork?.simulations?.avgScore || 0)}%</span>
                        </div>
                    </div>
                    <div className="atp-achievement-card">
                        <div className="atp-achievement-icon missions">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                            </svg>
                        </div>
                        <div className="atp-achievement-content">
                            <span className="atp-achievement-value">{proofOfWork?.missions?.completed || 0}</span>
                            <span className="atp-achievement-label">Missions</span>
                            <span className="atp-achievement-avg">Avg: {Math.round(proofOfWork?.missions?.avgScore || 0)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Behavioral Profile */}
            <div className="atp-section">
                <h3 className="atp-section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Behavioral Profile
                </h3>
                <div className="atp-behavioral-grid">
                    <div className="atp-behavioral-metrics">
                        <BehavioralMetric label="Leadership" value={behavioralProfile?.leadership} />
                        <BehavioralMetric label="Teamwork" value={behavioralProfile?.teamwork} />
                        <BehavioralMetric label="Confidence" value={behavioralProfile?.confidence} />
                    </div>
                    <div className="atp-traits">
                        <div className="atp-trait">
                            <span className="atp-trait-label">Stress Response</span>
                            <span className={`atp-trait-value ${behavioralProfile?.stressResponse?.toLowerCase().replace(' ', '-')}`}>
                                {behavioralProfile?.stressResponse || 'Average'}
                            </span>
                        </div>
                        <div className="atp-trait">
                            <span className="atp-trait-label">Communication Style</span>
                            <span className="atp-trait-value">
                                {behavioralProfile?.communicationStyle || 'Analytical'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reliability */}
            <div className="atp-section">
                <h3 className="atp-section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Reliability Metrics
                </h3>
                <div className="atp-reliability-grid">
                    <ReliabilityCard label="Punctuality" value={reliability?.punctuality} />
                    <ReliabilityCard label="Task Completion" value={reliability?.taskCompletionRate} />
                    <ReliabilityCard label="Responsiveness" value={reliability?.responsiveness} />
                    <ReliabilityCard label="Consistency" value={reliability?.consistency} />
                </div>
            </div>

            {/* Career Predictions */}
            {careerPredictions && (
                <div className="atp-section">
                    <h3 className="atp-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Career Insights
                    </h3>

                    <div className="atp-readiness-bar">
                        <div className="atp-readiness-header">
                            <span>Career Readiness</span>
                            <span>{careerPredictions.readinessPercentage || 0}%</span>
                        </div>
                        <div className="atp-progress-track">
                            <div
                                className={`atp-progress-fill ${getScoreLevel(careerPredictions.readinessPercentage)}`}
                                style={{ width: `${careerPredictions.readinessPercentage || 0}%` }}
                            />
                        </div>
                    </div>

                    {careerPredictions.recommendedRoles?.length > 0 && (
                        <div className="atp-roles-section">
                            <h4>Recommended Roles</h4>
                            <div className="atp-roles-list">
                                {careerPredictions.recommendedRoles.map((role, index) => (
                                    <div key={index} className="atp-role-card">
                                        <div className="atp-role-info">
                                            <span className="atp-role-title">{role.role}</span>
                                            <span className="atp-role-salary">
                                                ${role.salaryEstimate?.min?.toLocaleString()} - ${role.salaryEstimate?.max?.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className={`atp-role-fit ${getScoreLevel(role.fitScore)}`}>
                                            {role.fitScore}% Match
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {careerPredictions.learningRoadmap?.length > 0 && (
                        <div className="atp-roadmap-section">
                            <h4>Learning Roadmap</h4>
                            <div className="atp-roadmap-list">
                                {careerPredictions.learningRoadmap.map((item, index) => (
                                    <div key={index} className="atp-roadmap-item">
                                        <div className="atp-roadmap-info">
                                            <span className="atp-roadmap-skill">{item.skill}</span>
                                            <span className="atp-roadmap-levels">
                                                {item.currentLevel} → {item.targetLevel}
                                            </span>
                                        </div>
                                        <div className="atp-roadmap-meta">
                                            <span className={`atp-priority priority-${item.priority?.toLowerCase()}`}>
                                                {item.priority}
                                            </span>
                                            <span className="atp-roadmap-time">{item.estimatedTime}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showFeedback && (
                <FeedbackModal
                    featureId="atp"
                    onClose={() => setShowFeedback(false)}
                    userId={userId}
                />
            )}
        </div>
    );
};

// Competency Card Component
const CompetencyCard = ({ title, score }) => {
    const getScoreLevel = (score) => {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'average';
        return 'needs-improvement';
    };

    return (
        <div className="atp-competency-card">
            <div className={`atp-competency-score ${getScoreLevel(score)}`}>
                {score || 0}
            </div>
            <div className="atp-competency-title">{title}</div>
        </div>
    );
};

// Behavioral Metric Component
const BehavioralMetric = ({ label, value }) => {
    return (
        <div className="atp-behavioral-item">
            <div className="atp-behavioral-header">
                <span>{label}</span>
                <span>{value || 0}%</span>
            </div>
            <div className="atp-behavioral-track">
                <div
                    className="atp-behavioral-fill"
                    style={{ width: `${value || 0}%` }}
                />
            </div>
        </div>
    );
};

// Reliability Card Component
const ReliabilityCard = ({ label, value }) => {
    const displayValue = Math.round(value || 0);

    return (
        <div className="atp-reliability-card">
            <div className="atp-reliability-value">{displayValue}%</div>
            <div className="atp-reliability-label">{label}</div>
        </div>
    );
};

export default AITalentPassport;
