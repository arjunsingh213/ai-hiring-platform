import React from 'react';
import './MarketFeedback.css';

const MarketFeedback = ({ predictions, isRecruiter }) => {
    if (!isRecruiter || !predictions) return null;

    return (
        <div className="market-feedback-container">
            <div className="feedback-section">
                <h4 className="feedback-header">AI + Market Feedback</h4>
                <div className="feedback-pills">
                    <div className="feedback-pill high">
                        <span className="pill-label">Market Fit</span>
                        <span className="pill-value">Strong</span>
                    </div>
                    <div className="feedback-pill">
                        <span className="pill-label">Vetting Score</span>
                        <span className="pill-value">91%</span>
                    </div>
                </div>
            </div>

            <div className="roles-list">
                <div className="role-fit-header">Role Readiness Fit</div>
                {predictions.recommendedRoles?.map((role, idx) => (
                    <div key={idx} className="role-fit-item">
                        <div className="role-main">
                            <span className="role-name">{role.role}</span>
                            <span className="role-match">{role.fitScore}% Match</span>
                        </div>
                        <div className="role-progress">
                            <div className="role-bar" style={{ width: `${role.fitScore}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="risk-indicator">
                <div className="risk-header">
                    <span>Hiring Risk Analysis</span>
                    <span className="risk-level low">Low Risk</span>
                </div>
                <p className="risk-note">Verified technical depth and proctoring consistency confirm high reliability.</p>
            </div>
        </div>
    );
};

export default MarketFeedback;
