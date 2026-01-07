/**
 * RoundInfoPage Component
 * Professional, industry-ready design
 * Clean layout matching the interview page
 */

import React from 'react';
import './RoundInfoPage.css';

// Professional SVG icons for each round type
const RoundIcons = {
    technical: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
        </svg>
    ),
    deep_dive: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
        </svg>
    ),
    behavioral: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    coding: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    ),
    communication: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    ),
    default: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    )
};

// Get icon based on display name
const getRoundIcon = (displayName) => {
    if (!displayName) return RoundIcons.default;
    const name = displayName.toLowerCase();
    if (name.includes('technical') || name.includes('fundamental')) return RoundIcons.technical;
    if (name.includes('deep')) return RoundIcons.deep_dive;
    if (name.includes('hr') || name.includes('behavioral') || name.includes('communication') || name.includes('collaboration')) return RoundIcons.behavioral;
    if (name.includes('coding') || name.includes('challenge')) return RoundIcons.coding;
    return RoundIcons.default;
};

const RoundInfoPage = ({
    roundNumber,
    totalRounds,
    displayName,
    description,
    tips = [],
    difficulty,
    questionCount,
    focus = [],
    isCodingRound,
    onStartRound
}) => {
    return (
        <div className="round-info-overlay">
            <div className="round-info-card">
                {/* Header */}
                <div className="ri-header">
                    <span className="ri-round-label">Round {roundNumber} of {totalRounds}</span>
                </div>

                {/* Icon */}
                <div className="ri-icon">
                    {getRoundIcon(displayName)}
                </div>

                {/* Title */}
                <h1 className="ri-title">{displayName}</h1>

                {/* Difficulty */}
                {difficulty && (
                    <span className={`ri-difficulty ri-difficulty-${difficulty?.replace(/\s+/g, '-')?.toLowerCase()}`}>
                        {difficulty}
                    </span>
                )}

                {/* Description */}
                <p className="ri-description">{description}</p>

                {/* Question count */}
                <div className="ri-meta">
                    <span className="ri-questions">{questionCount} questions</span>
                    {isCodingRound && <span className="ri-coding">• Coding Required</span>}
                </div>

                {/* Focus Areas */}
                {focus && focus.length > 0 && (
                    <div className="ri-section">
                        <h3 className="ri-section-title">Focus Areas</h3>
                        <div className="ri-tags">
                            {focus.slice(0, 4).map((area, idx) => (
                                <span key={idx} className="ri-tag">{area}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tips */}
                {tips && tips.length > 0 && (
                    <div className="ri-section ri-tips-section">
                        <h3 className="ri-section-title">Tips for Success</h3>
                        <ul className="ri-tips">
                            {tips.slice(0, 3).map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Start Button */}
                <button className="ri-start-btn" onClick={onStartRound}>
                    Start Round {roundNumber}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default RoundInfoPage;
