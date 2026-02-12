import React from 'react';
import { motion } from 'framer-motion';

const ChallengeCard = ({ challenge, onClick, showSkillMatch = false }) => {
    const userSkills = (() => {
        try {
            const stored = localStorage.getItem('userSkills');
            return stored ? JSON.parse(stored).map(s => s.toLowerCase()) : [];
        } catch { return []; }
    })();

    const isMatched = (skill) => userSkills.some(us => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us));

    return (
        <motion.div
            className="challenge-card"
            onClick={onClick}
            whileHover={{ y: -2 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="challenge-card-header">
                <h3 className="challenge-card-title">{challenge.title}</h3>
                <div className="challenge-card-badges">
                    <span className={`difficulty-badge ${challenge.difficulty}`}>
                        {challenge.difficulty}
                    </span>
                </div>
            </div>

            <p className="challenge-card-desc">{challenge.description}</p>

            <div className="challenge-card-meta">
                <div className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {challenge.timeLimit || 30} min
                </div>
                <div className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {challenge.questions?.length || 0} questions
                </div>
                <div className="meta-item">
                    <span className="domain-badge">{challenge.domain}</span>
                </div>
            </div>

            {challenge.skillTags?.length > 0 && (
                <div className="challenge-card-skills">
                    {challenge.skillTags.slice(0, 4).map((skill, i) => (
                        <span key={i} className={`skill-tag ${showSkillMatch && isMatched(skill) ? 'matched' : ''}`}>
                            {skill}
                        </span>
                    ))}
                    {challenge.skillTags.length > 4 && (
                        <span className="skill-tag">+{challenge.skillTags.length - 4}</span>
                    )}
                </div>
            )}

            <div className="challenge-card-footer">
                {challenge.atpImpact?.enabled && (
                    <div className="atp-impact-preview">
                        <span className="atp-label">ATP Impact</span>
                        <span className="atp-value">+{challenge.atpImpact.maxContribution || 0}</span>
                    </div>
                )}

                <div>
                    {challenge.attemptCount > 0 && (
                        <span className="attempt-info">
                            {challenge.attemptCount}/{challenge.maxAttempts || 3} attempts
                        </span>
                    )}
                    {challenge.bestScore > 0 && (
                        <span className="best-score"> · Best: {challenge.bestScore}%</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default ChallengeCard;
