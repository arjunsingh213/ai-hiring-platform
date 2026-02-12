import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import ChallengeCard from './ChallengeCard';
import ChallengeDetail from './ChallengeDetail';
import CreateChallengeModal from './CreateChallengeModal';
import ChallengeHistory from './ChallengeHistory';
import './ChallengesTab.css';

const LEVEL_LABELS = ['—', 'Basic', 'Intermediate', 'Advanced', 'Expert'];
const LEVEL_COLORS = ['#64748b', '#60a5fa', '#a78bfa', '#f59e0b', '#10b981'];
const LEVEL_ICONS = ['', '📘', '📗', '📙', '🏆'];

const ChallengesTab = () => {
    const [activeSection, setActiveSection] = useState('domain');
    const [challenges, setChallenges] = useState([]);
    const [skillLadders, setSkillLadders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChallenge, setSelectedChallenge] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [generatingSkill, setGeneratingSkill] = useState(null); // { skillName, level }
    const [expandedSkills, setExpandedSkills] = useState({});
    const [domainMessage, setDomainMessage] = useState('');
    const userId = localStorage.getItem('userId');

    const sections = [
        { id: 'domain', label: 'Skill Challenges', icon: '🎯' },
        { id: 'custom', label: 'Community', icon: '⚡' },
        { id: 'history', label: 'History', icon: '📊' }
    ];

    useEffect(() => {
        if (activeSection !== 'history') {
            fetchChallenges();
        }
    }, [activeSection]);

    const fetchChallenges = async () => {
        setLoading(true);
        try {
            if (activeSection === 'domain') {
                const res = await api.get(`/challenges/domain?userId=${userId}`);
                setChallenges(res.data || []);
                setSkillLadders(res.skillLadders || []);
                setDomainMessage(res.message || '');
            } else {
                const res = await api.get('/challenges?challengeType=custom&status=active');
                setChallenges(res.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch challenges:', err);
            setChallenges([]);
            setSkillLadders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateChallenge = async (skillName, level, forceRegenerate = false) => {
        setGeneratingSkill({ skillName, level });
        try {
            const res = await api.post('/challenges/domain/generate', {
                userId, skillName, level, forceRegenerate
            });
            if (res.success) {
                // Refresh the ladders
                await fetchChallenges();
                // Auto-expand this skill
                setExpandedSkills(prev => ({ ...prev, [skillName]: true }));
                // If this was a retry, auto-open the new challenge
                if (forceRegenerate && res.data) {
                    setSelectedChallenge(res.data);
                }
            }
        } catch (err) {
            console.error('Challenge generation failed:', err);
        } finally {
            setGeneratingSkill(null);
        }
    };

    const toggleSkillExpand = (skillName) => {
        setExpandedSkills(prev => ({ ...prev, [skillName]: !prev[skillName] }));
    };

    const handleChallengeCreated = () => {
        setShowCreateModal(false);
        if (activeSection === 'custom') fetchChallenges();
    };

    // Domain section: Skill Ladder view
    const renderSkillLadders = () => {
        if (domainMessage && skillLadders.length === 0) {
            return (
                <div className="challenges-empty">
                    <div className="empty-icon">📄</div>
                    <h3>Upload Your Resume First</h3>
                    <p>{domainMessage}</p>
                    <p className="empty-sub">Go to your Profile → Resume & Skill Intelligence to upload your resume and unlock skill-based challenges.</p>
                </div>
            );
        }

        if (skillLadders.length === 0) {
            return (
                <div className="challenges-empty">
                    <div className="empty-icon">🎯</div>
                    <h3>No Skills Detected</h3>
                    <p>Upload your resume to discover your skills and unlock personalized challenges.</p>
                </div>
            );
        }

        return (
            <div className="skill-ladders">
                {/* Stats summary */}
                <div className="skill-ladders-stats">
                    <div className="sl-stat">
                        <span className="sl-stat-value">{skillLadders.length}</span>
                        <span className="sl-stat-label">Skills</span>
                    </div>
                    <div className="sl-stat">
                        <span className="sl-stat-value">{skillLadders.filter(s => s.mastered).length}</span>
                        <span className="sl-stat-label">Mastered</span>
                    </div>
                    <div className="sl-stat">
                        <span className="sl-stat-value">
                            {skillLadders.reduce((sum, s) => sum + (s.skillNode?.xp || 0), 0)}
                        </span>
                        <span className="sl-stat-label">Total XP</span>
                    </div>
                    <div className="sl-stat">
                        <span className="sl-stat-value">
                            {skillLadders.reduce((sum, s) => sum + (s.skillNode?.challengesCompleted || 0), 0)}
                        </span>
                        <span className="sl-stat-label">Completed</span>
                    </div>
                </div>

                {/* Skill Ladder Cards */}
                {skillLadders.map((ladder, idx) => {
                    const node = ladder.skillNode;
                    const isExpanded = expandedSkills[node.skillName];
                    const progressPercent = ladder.mastered ? 100 : ((node.highestLevelCompleted || 0) / 4) * 100;

                    return (
                        <motion.div
                            key={node._id || idx}
                            className={`skill-ladder-card ${ladder.mastered ? 'mastered' : ''}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            {/* Skill Header */}
                            <button
                                className={`skill-ladder-header ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => toggleSkillExpand(node.skillName)}
                            >
                                <div className="sl-header-left">
                                    <div className="sl-skill-icon" style={{ borderColor: LEVEL_COLORS[node.level || 0] }}>
                                        {LEVEL_ICONS[node.level || 0] || '📘'}
                                    </div>
                                    <div className="sl-skill-info">
                                        <span className="sl-skill-name">{node.skillName}</span>
                                        <div className="sl-skill-meta">
                                            <span className="sl-skill-domain">{node.domainCategory}</span>
                                            <span className="sl-skill-level" style={{ color: LEVEL_COLORS[node.level || 0] }}>
                                                {LEVEL_LABELS[node.level || 0]}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="sl-header-right">
                                    <div className="sl-xp-badge">
                                        {node.xp || 0} XP
                                    </div>
                                    {/* Progress mini bar */}
                                    <div className="sl-progress-mini">
                                        <div
                                            className="sl-progress-mini-fill"
                                            style={{
                                                width: `${progressPercent}%`,
                                                background: ladder.mastered
                                                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                                                    : `linear-gradient(90deg, ${LEVEL_COLORS[node.level || 0]}, ${LEVEL_COLORS[Math.min((node.level || 0) + 1, 4)]})`
                                            }}
                                        />
                                    </div>
                                    <svg className={`sl-chevron ${isExpanded ? 'rotated' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                            </button>

                            {/* Expanded: Level Ladder */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        className="sl-levels-container"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        <div className="sl-levels-track">
                                            {ladder.levels.map((lvl, li) => (
                                                <div key={li} className={`sl-level-node ${lvl.status}`}>
                                                    {/* Connector line */}
                                                    {li > 0 && (
                                                        <div className={`sl-connector ${lvl.status === 'completed' || ladder.levels[li - 1]?.status === 'completed'
                                                            ? 'active' : ''
                                                            }`} />
                                                    )}

                                                    {/* Level circle */}
                                                    <div
                                                        className="sl-level-circle"
                                                        style={{
                                                            borderColor: lvl.status === 'locked' ? '#334155' : LEVEL_COLORS[lvl.level],
                                                            background: lvl.status === 'completed'
                                                                ? LEVEL_COLORS[lvl.level]
                                                                : 'transparent'
                                                        }}
                                                    >
                                                        {lvl.status === 'completed' ? '✓' :
                                                            lvl.status === 'locked' ? '🔒' :
                                                                `L${lvl.level}`}
                                                    </div>

                                                    {/* Level info */}
                                                    <div className="sl-level-info">
                                                        <span className="sl-level-label" style={{
                                                            color: lvl.status === 'locked' ? '#475569' : LEVEL_COLORS[lvl.level]
                                                        }}>
                                                            {LEVEL_LABELS[lvl.level]}
                                                        </span>

                                                        {/* Action button or status */}
                                                        {lvl.status === 'completed' && (
                                                            <span className="sl-level-completed-badge">
                                                                ✅ Passed
                                                                {lvl.challenge?.bestScore > 0 && ` (${lvl.challenge.bestScore}%)`}
                                                            </span>
                                                        )}

                                                        {lvl.status === 'unlocked' && lvl.challenge && (
                                                            lvl.challenge.attemptCount > 0 && !lvl.challenge.passed ? (
                                                                <button
                                                                    className="sl-level-generate-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleGenerateChallenge(node.skillName, lvl.level, true);
                                                                    }}
                                                                    disabled={generatingSkill?.skillName === node.skillName}
                                                                >
                                                                    {generatingSkill?.skillName === node.skillName
                                                                        ? (
                                                                            <>
                                                                                <span className="sl-spinner" />
                                                                                Generating New...
                                                                            </>
                                                                        ) : `🔄 Retry with New Questions (${lvl.challenge.bestScore}%)`}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="sl-level-start-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedChallenge(lvl.challenge);
                                                                    }}
                                                                >
                                                                    Start Challenge
                                                                </button>
                                                            )
                                                        )}

                                                        {lvl.status === 'generate' && (
                                                            <button
                                                                className="sl-level-generate-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleGenerateChallenge(node.skillName, lvl.level);
                                                                }}
                                                                disabled={generatingSkill?.skillName === node.skillName}
                                                            >
                                                                {generatingSkill?.skillName === node.skillName
                                                                    ? (
                                                                        <>
                                                                            <span className="sl-spinner" />
                                                                            Generating...
                                                                        </>
                                                                    ) : '⚡ Generate Challenge'}
                                                            </button>
                                                        )}

                                                        {lvl.status === 'locked' && (
                                                            <span className="sl-level-locked-text">
                                                                Complete L{lvl.level - 1} to unlock
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="challenges-tab">
            {/* Segmented Control */}
            <div className="challenges-segmented-control">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        className={`segment-btn ${activeSection === section.id ? 'active' : ''}`}
                        onClick={() => setActiveSection(section.id)}
                    >
                        <span className="segment-icon">{section.icon}</span>
                        <span className="segment-label">{section.label}</span>
                    </button>
                ))}
                <div
                    className="segment-indicator"
                    style={{
                        width: `${100 / sections.length}%`,
                        transform: `translateX(${sections.findIndex(s => s.id === activeSection) * 100}%)`
                    }}
                />
            </div>

            {/* Create Challenge Button (only for custom section) */}
            {activeSection === 'custom' && (
                <motion.button
                    className="create-challenge-floating-btn"
                    onClick={() => setShowCreateModal(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create Challenge
                </motion.button>
            )}

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {activeSection === 'history' ? (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        <ChallengeHistory userId={userId} />
                    </motion.div>
                ) : activeSection === 'domain' ? (
                    <motion.div
                        key="domain"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {loading ? (
                            <div className="challenges-loading">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="challenge-skeleton">
                                        <div className="skeleton-shimmer" />
                                    </div>
                                ))}
                            </div>
                        ) : renderSkillLadders()}
                    </motion.div>
                ) : (
                    <motion.div
                        key="custom"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="challenges-grid"
                    >
                        {loading ? (
                            <div className="challenges-loading">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="challenge-skeleton">
                                        <div className="skeleton-shimmer" />
                                    </div>
                                ))}
                            </div>
                        ) : challenges.length === 0 ? (
                            <div className="challenges-empty">
                                <div className="empty-icon">⚡</div>
                                <h3>No Community Challenges Yet</h3>
                                <p>Be the first to create a challenge for the community!</p>
                                <button className="empty-cta-btn" onClick={() => setShowCreateModal(true)}>
                                    Create First Challenge
                                </button>
                            </div>
                        ) : (
                            challenges.map(challenge => (
                                <ChallengeCard
                                    key={challenge._id}
                                    challenge={challenge}
                                    onClick={() => setSelectedChallenge(challenge)}
                                    showSkillMatch={false}
                                />
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Challenge Detail Modal */}
            <AnimatePresence>
                {selectedChallenge && (
                    <ChallengeDetail
                        challenge={selectedChallenge}
                        onClose={() => setSelectedChallenge(null)}
                        onComplete={() => {
                            setSelectedChallenge(null);
                            fetchChallenges();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Create Challenge Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateChallengeModal
                        onClose={() => setShowCreateModal(false)}
                        onCreated={handleChallengeCreated}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChallengesTab;
