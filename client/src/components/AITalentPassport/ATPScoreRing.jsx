import React from 'react';
import './ATPScoreRing.css';

const ATPScoreRing = ({ score, label = "ATP Score", size = 200 }) => {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getScoreColor = (s) => {
        if (s >= 80) return 'var(--atp-success)';
        if (s >= 60) return 'var(--atp-warning)';
        return 'var(--atp-risk)';
    };

    return (
        <div className="atp-score-ring-container" style={{ width: size, height: size }}>
            <svg className="atp-score-ring-svg" viewBox="0 0 200 200">
                {/* Background Track */}
                <circle
                    className="atp-ring-track"
                    cx="100"
                    cy="100"
                    r={radius}
                    strokeWidth="12"
                    fill="transparent"
                />
                {/* Progress Fill */}
                <circle
                    className="atp-ring-progress"
                    cx="100"
                    cy="100"
                    r={radius}
                    strokeWidth="12"
                    fill="transparent"
                    stroke={getScoreColor(score)}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
            <div className="atp-score-content">
                <span className="atp-score-value">{score}</span>
                <span className="atp-score-label">{label}</span>
            </div>
        </div>
    );
};

export default ATPScoreRing;
