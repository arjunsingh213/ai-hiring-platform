import React, { useState, useEffect, useMemo } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
    CartesianGrid, BarChart, Bar, LineChart, Line,
    AreaChart, Area, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket, joinUserRoom } from '../../services/socketService';
import './AITalentPassport.css';

/* ═══════════════════════════════════════════════════
   ENTERPRISE AI TALENT PASSPORT v2 – COMPLETE OVERHAUL
   Real-time data, multi-domain, multi-graph analytics
   ═══════════════════════════════════════════════════ */

const LEVEL_LABELS = { 1: 'Basic', 2: 'Intermediate', 3: 'Advanced', 4: 'Professional', 5: 'Expert' };
const LEVEL_COLORS = { 1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6', 4: '#8b5cf6', 5: '#10b981' };
const XP_THRESHOLDS = { 1: 0, 2: 100, 3: 300, 4: 600, 5: 1000 };

const GRAPH_OPTIONS = [
    { value: 'radar', label: 'Radar Chart (Skill Depth)' },
    { value: 'bar', label: 'Bar Graph (Skill Comparison)' },
    { value: 'line', label: 'Line Graph (Skill Growth)' },
    { value: 'area', label: 'Area Chart (Performance Trend)' },
    { value: 'risk', label: 'Risk Trend Graph' },
    { value: 'xp', label: 'XP Progress Chart' }
];

const AITalentPassport = ({
    passport, userName, userPhoto, userDomain, viewMode = 'candidate', userId,
    jobDomains = [], verifiedProjects = [], skillHistory = [], onSubmitProject, resumeSkills = []
}) => {
    const isRecruiter = viewMode === 'recruiter';
    const [expandedSection, setExpandedSection] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [selectedDomain, setSelectedDomain] = useState('');
    const [selectedGraph, setSelectedGraph] = useState('radar');
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [liveUpdate, setLiveUpdate] = useState(null);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // WebSocket listener for real-time ATP updates
    useEffect(() => {
        if (!userId) return;

        const socket = getSocket();
        joinUserRoom(userId);

        const handleLiveUpdate = (data) => {
            console.log('[ATP-WS] Live update received:', data.type);
            setLiveUpdate(data);
            setTimeout(() => setLiveUpdate(null), 5000);
        };

        socket.on('atp_update', handleLiveUpdate);

        return () => {
            socket.off('atp_update', handleLiveUpdate);
        };
    }, [userId]);

    // Initialize selected domain from available domains
    useEffect(() => {
        const domains = passport?.domainScores?.map(d => d.domain) || jobDomains || [];
        if (domains.length > 0 && !selectedDomain) {
            setSelectedDomain(domains[0]);
        }
    }, [passport, jobDomains, selectedDomain]);

    const atpId = useMemo(() => {
        const num = String(Math.abs(hashCode(userId || userName || 'default')) % 90000 + 10000);
        return `ATP-${num}`;
    }, [userName, userId]);

    // Always render UI even if empty (User Request: "do not show blank atp")

    const {
        talentScore = 0, domainScore = 0, communicationScore = 0,
        problemSolvingScore = 0, gdScore = 0, professionalismScore = 0,
        globalPercentile = 0, levelBand = 'Level 1',
        skillHeatmap = [], proofOfWork = {}, behavioralProfile = {},
        reliability = {}, careerPredictions = {}, lastUpdated, totalAssessmentsCompleted = 0,
        domainScores = [], cognitiveMetrics = {}, interviewSkillHistory = []
    } = passport || {};

    // Available domains (from ATP data or jobDomains prop)
    const availableDomains = domainScores.length > 0
        ? domainScores.map(d => d.domain)
        : jobDomains;

    // Current domain data
    const currentDomainData = domainScores.find(d => d.domain === selectedDomain) || {
        domain: selectedDomain || 'General',
        domainScore: domainScore,
        skills: [],
        marketReadinessScore: 0,
        domainStabilityIndex: 0,
        riskAdjustedATP: 0
    };

    // Skills for selected domain
    const domainSkills = currentDomainData.skills || [];

    // Cognitive metrics with fallback
    const cm = cognitiveMetrics || {};
    const cognitiveData = [
        { label: 'Technical Accuracy', value: cm.technicalAccuracy || 0, key: 'technicalAccuracy' },
        { label: 'Communication Clarity', value: cm.communicationClarity || 0, key: 'communicationClarity' },
        { label: 'Problem Decomposition', value: cm.problemDecomposition || 0, key: 'problemDecomposition' },
        { label: 'Concept Depth', value: cm.conceptDepth || 0, key: 'conceptDepth' },
        { label: 'Code Quality', value: cm.codeQuality || 0, key: 'codeQuality' }
    ];
    const hasCognitiveData = cognitiveData.some(c => c.value > 0);

    // Radar chart data from domain skills
    const radarData = domainSkills.length > 0
        ? domainSkills.map(s => ({
            subject: s.skillName,
            value: s.score || 0,
            confidence: s.confidence || 0,
            level: LEVEL_LABELS[s.level] || 'Basic',
            fullMark: 100
        }))
        : [
            { subject: 'Frontend', value: domainScore, fullMark: 100 },
            { subject: 'Backend', value: problemSolvingScore, fullMark: 100 },
            { subject: 'Database', value: Math.round((domainScore + problemSolvingScore) / 2), fullMark: 100 },
            { subject: 'System Design', value: gdScore, fullMark: 100 },
            { subject: 'Communication', value: communicationScore, fullMark: 100 }
        ];

    // Bar chart data
    const barData = domainSkills.map(s => ({
        name: s.skillName,
        score: s.score || 0,
        challenge: s.challengePerformance || 0,
        interview: s.interviewPerformance || 0,
        project: s.projectValidation || 0,
        confidence: s.confidence || 0
    }));

    // Line chart data (skill growth from history)
    const historyForDomain = (interviewSkillHistory || []).filter(h => h.domain === selectedDomain);
    const lineData = buildGrowthData(historyForDomain);

    // Area chart — performance trend
    const areaData = buildPerformanceTrend(historyForDomain);

    // Risk trend data
    const riskData = domainSkills.map(s => ({
        name: s.skillName,
        risk: s.riskIndex || 0,
        confidence: s.confidence || 0,
        recency: s.recencyScore || 0
    }));

    // XP progress data
    const xpData = domainSkills.map(s => ({
        name: s.skillName,
        xp: s.xp || 0,
        level: s.level || 1,
        nextThreshold: XP_THRESHOLDS[Math.min(5, (s.level || 1) + 1)] || 1000,
        progress: ((s.xp || 0) / (XP_THRESHOLDS[Math.min(5, (s.level || 1) + 1)] || 1000)) * 100
    }));

    // Behavioral radar
    const behavRadarData = cognitiveData.map(c => ({
        subject: c.label.split(' ')[0],
        value: c.value
    }));

    const roleValidation = getStrengthLabel(talentScore);
    const domainFit = getStrengthLabel(currentDomainData.domainScore);

    const toggleSection = (s) => setExpandedSection(expandedSection === s ? null : s);

    // Approved projects
    const approvedProjects = verifiedProjects.filter(p => p.status === 'approved');
    const pendingProjects = verifiedProjects.filter(p => p.status === 'pending');

    console.log('[ATP] Render Props:', {
        total: verifiedProjects.length,
        approved: approvedProjects.length,
        pending: pendingProjects.length,
        rawStatuses: verifiedProjects.map(p => p.status)
    });

    return (
        <div className={`atp-v2 ${isRecruiter ? 'atp-v2--recruiter' : 'atp-v2--candidate'}`}>

            {/* Live Update Indicator */}
            <AnimatePresence>
                {liveUpdate && (
                    <motion.div
                        className="atp-v2-live-badge"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <span className="atp-v2-live-dot" />
                        <span>Live: {(liveUpdate.type || 'update').replace(/_/g, ' ')}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════ SECTION 1: PROFILE HEADER + DOMAIN DROPDOWN ═══════ */}
            <section className="atp-v2-header">
                <div className="atp-v2-header__left">
                    <div className="atp-v2-avatar">
                        {userPhoto ? (
                            <img src={userPhoto} alt={userName} />
                        ) : (
                            <div className="atp-v2-avatar__fallback">{userName?.charAt(0)?.toUpperCase() || 'U'}</div>
                        )}
                    </div>
                    <div className="atp-v2-header__info">
                        <h2 className="atp-v2-header__name">{userName} <span className="atp-v2-header__id">— {atpId}</span></h2>
                        <div className="atp-v2-header__domain-row">
                            {availableDomains.length > 1 ? (
                                <select
                                    className="atp-v2-domain-select"
                                    value={selectedDomain}
                                    onChange={(e) => setSelectedDomain(e.target.value)}
                                >
                                    {availableDomains.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="atp-v2-header__domain-text">{selectedDomain || userDomain || 'Full Stack'}</span>
                            )}
                        </div>
                        <div className="atp-v2-header__badges">
                            <span className="atp-v2-badge atp-v2-badge--level">{levelBand}</span>
                            <span className="atp-v2-badge atp-v2-badge--assessments">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
                                {totalAssessmentsCompleted} Assessments
                            </span>
                            {isRecruiter && (
                                <span className="atp-v2-badge atp-v2-badge--percentile">Top {Math.max(1, 100 - globalPercentile)}%</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="atp-v2-header__right">
                    <ATPRing score={isRecruiter ? (currentDomainData.riskAdjustedATP || talentScore) : talentScore} size={isMobile ? 100 : 130} />
                    {isRecruiter && currentDomainData.riskAdjustedATP > 0 && (
                        <span className="atp-v2-ring-label">Risk-Adjusted</span>
                    )}
                </div>
            </section>

            {/* ═══════ DOMAIN PROGRESS BARS ═══════ */}
            {/* User Request: "add the domains which were selected by the user in the atp in a text progress line bar" */}
            <section className="atp-v2-domain-progress">
                {(jobDomains.length > 0 ? jobDomains : ['General']).map((domain, i) => {
                    const dScore = domainScores.find(d => d.domain === domain)?.domainScore || 0;
                    return (
                        <div key={i} className="atp-v2-domain-bar">
                            <div className="atp-v2-domain-bar__info">
                                <span className="atp-v2-domain-bar__label">{domain}</span>
                                <span className="atp-v2-domain-bar__score">{dScore}/100</span>
                            </div>
                            <div className="atp-v2-domain-bar__track">
                                <motion.div
                                    className="atp-v2-domain-bar__fill"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${dScore}%` }}
                                    transition={{ duration: 1, delay: 0.2 + (i * 0.1) }}
                                    style={{ background: getScoreGradient(dScore) }}
                                />
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* ═══════ RECRUITER KEY METRICS STRIP ═══════ */}
            {isRecruiter && (
                <div className="atp-v2-recruiter-metrics">
                    <div className="atp-v2-metric-card">
                        <span className="atp-v2-metric-card__label">Domain Fit</span>
                        <span className={`atp-v2-metric-card__value atp-v2-metric-card__value--${domainFit.toLowerCase()}`}>{domainFit}</span>
                    </div>
                    <div className="atp-v2-metric-card">
                        <span className="atp-v2-metric-card__label">Skill Confidence</span>
                        <span className="atp-v2-metric-card__value">{domainSkills.length > 0 ? Math.round(domainSkills.reduce((s, sk) => s + (sk.confidence || 0), 0) / domainSkills.length) : 0}%</span>
                    </div>
                    <div className="atp-v2-metric-card">
                        <span className="atp-v2-metric-card__label">Market Readiness</span>
                        <span className="atp-v2-metric-card__value">{currentDomainData.marketReadinessScore || 0}%</span>
                    </div>
                    <div className="atp-v2-metric-card">
                        <span className="atp-v2-metric-card__label">Domain Stability</span>
                        <span className="atp-v2-metric-card__value">{currentDomainData.domainStabilityIndex || 0}%</span>
                    </div>
                </div>
            )}

            {/* ═══════ SECTION 2: DOMAIN SKILLS TABLE ═══════ */}
            <MobileCollapsible title={`${selectedDomain || 'Domain'} Skills`} subtitle="Level, XP, Confidence & Risk" isMobile={isMobile} expanded={expandedSection === 'skills'} onToggle={() => toggleSection('skills')}>
                <section className="atp-v2-section atp-v2-skills">
                    <div className="atp-v2-section__header">
                        <h3>DOMAIN SKILLS — {selectedDomain || 'ALL'}</h3>
                        <span className="atp-v2-section__sub">Score = Challenge×40% + Interview×50% + Project×10%</span>
                    </div>
                    {domainSkills.length > 0 ? (
                        <div className="atp-v2-skills__table-wrap">
                            <table className="atp-v2-skills__table">
                                <thead>
                                    <tr>
                                        <th>Skill</th>
                                        <th>Level</th>
                                        <th>Score</th>
                                        <th>XP</th>
                                        {isRecruiter && <th>Confidence</th>}
                                        {isRecruiter && <th>Risk</th>}
                                        {isRecruiter && <th>Recency</th>}
                                        {!isRecruiter && <th>Next Level</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {domainSkills.map((skill, i) => {
                                        const nextXP = XP_THRESHOLDS[Math.min(5, (skill.level || 1) + 1)] || 1000;
                                        const xpProgress = Math.min(100, ((skill.xp || 0) / nextXP) * 100);
                                        const daysSinceAssessed = skill.lastAssessedAt
                                            ? Math.floor((Date.now() - new Date(skill.lastAssessedAt).getTime()) / 86400000)
                                            : 999;
                                        const isStale = daysSinceAssessed > 90;

                                        return (
                                            <motion.tr key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                                <td className="atp-v2-skills__name">
                                                    <span className="atp-v2-skills__dot" style={{ background: LEVEL_COLORS[skill.level] || '#6b7280' }} />
                                                    {skill.skillName}
                                                </td>
                                                <td>
                                                    <span className={`atp-v2-level-badge atp-v2-level-badge--${skill.level || 1}`}>
                                                        L{skill.level || 1} {LEVEL_LABELS[skill.level] || 'Basic'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="atp-v2-score-bar">
                                                        <motion.div
                                                            className="atp-v2-score-bar__fill"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${skill.score || 0}%` }}
                                                            transition={{ duration: 0.8, delay: i * 0.1 }}
                                                            style={{ background: getScoreGradient(skill.score) }}
                                                        />
                                                        <span className="atp-v2-score-bar__text">{skill.score || 0}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="atp-v2-xp">{skill.xp || 0}</span>
                                                </td>
                                                {isRecruiter && (
                                                    <td>
                                                        <span className="atp-v2-confidence">{skill.confidence || 0}%</span>
                                                    </td>
                                                )}
                                                {isRecruiter && (
                                                    <td>
                                                        <span className={`atp-v2-risk ${skill.riskIndex > 50 ? 'atp-v2-risk--high' : skill.riskIndex > 20 ? 'atp-v2-risk--med' : 'atp-v2-risk--low'}`}>
                                                            {skill.riskIndex || 0}%
                                                        </span>
                                                    </td>
                                                )}
                                                {isRecruiter && (
                                                    <td>
                                                        <span className={`atp-v2-recency ${isStale ? 'atp-v2-recency--stale' : ''}`}>
                                                            {isStale ? '⚠ Stale' : `${daysSinceAssessed}d ago`}
                                                        </span>
                                                    </td>
                                                )}
                                                {!isRecruiter && (
                                                    <td>
                                                        <div className="atp-v2-xp-progress">
                                                            <div className="atp-v2-xp-progress__bar">
                                                                <motion.div
                                                                    className="atp-v2-xp-progress__fill"
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${xpProgress}%` }}
                                                                    transition={{ duration: 1, delay: i * 0.1 }}
                                                                />
                                                            </div>
                                                            <span className="atp-v2-xp-progress__label">{skill.xp || 0}/{nextXP} XP</span>
                                                        </div>
                                                    </td>
                                                )}
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="atp-v2-empty-chart">No skills data for this domain yet. Complete challenges or interviews to build your profile.</div>
                    )}
                </section>
            </MobileCollapsible>

            {/* ═══════ SECTION 3: MULTI-GRAPH ANALYTICS ═══════ */}
            <MobileCollapsible title="Analytics" subtitle={isRecruiter ? 'Multi-graph skill analysis' : 'Your skill growth'} isMobile={isMobile} expanded={expandedSection === 'analytics'} onToggle={() => toggleSection('analytics')}>
                <section className="atp-v2-section atp-v2-analytics-split">
                    {/* LEFT: Skills List (Verified + Resume) */}
                    <div className="atp-v2-analytics__left">
                        <h4>Verified & Reported Skills</h4>
                        <div className="atp-v2-skill-list-scroll">
                            {/* Verified Skills */}
                            {domainSkills.map((s, i) => (
                                <div key={`verified-${i}`} className="atp-v2-mini-skill">
                                    <div className="atp-v2-mini-skill__header">
                                        <span>{s.skillName}</span>
                                        <span className="atp-v2-badge--verified">Verified</span>
                                    </div>
                                    <div className="atp-v2-mini-skill__bar">
                                        <div className="atp-v2-mini-skill__fill" style={{ width: `${s.score || 0}%`, background: LEVEL_COLORS[s.level] }} />
                                    </div>
                                </div>
                            ))}
                            {/* Resume Skills (Self-Reported) */}
                            {resumeSkills
                                .filter(rs => !domainSkills.find(ds => ds.skillName.toLowerCase() === rs.name.toLowerCase()))
                                .map((rs, i) => (
                                    <div key={`resume-${i}`} className="atp-v2-mini-skill atp-v2-mini-skill--resume">
                                        <div className="atp-v2-mini-skill__header">
                                            <span>{rs.name}</span>
                                            <span className="atp-v2-badge--pending">Resume</span>
                                        </div>
                                        <div className="atp-v2-mini-skill__bar">
                                            <div className="atp-v2-mini-skill__fill" style={{ width: '5%', background: '#6b7280' }} />
                                        </div>
                                    </div>
                                ))}
                            {(domainSkills.length === 0 && resumeSkills.length === 0) && (
                                <div className="atp-v2-empty-text">No skills found. Add skills to your resume or complete challenges.</div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Chart */}
                    <div className="atp-v2-analytics__right">
                        <div className="atp-v2-section__header">
                            <h3>ANALYTICS GRAPH</h3>
                            <div className="atp-v2-graph-select-wrap">
                                <select
                                    className="atp-v2-graph-select"
                                    value={selectedGraph}
                                    onChange={(e) => setSelectedGraph(e.target.value)}
                                >
                                    {GRAPH_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="atp-v2-analytics__chart">
                            {renderChart(selectedGraph, {
                                radarData, barData, lineData, areaData, riskData, xpData,
                                domainSkills, isMobile, isRecruiter
                            })}
                        </div>
                    </div>
                </section>
            </MobileCollapsible>

            {/* ═══════ SECTION 4: COGNITIVE TELEMETRY ═══════ */}
            <div className={`atp-v2-bottom-grid ${isRecruiter ? 'atp-v2-bottom-grid--recruiter' : ''}`}>
                <MobileCollapsible title="Cognitive Telemetry" subtitle="Interview-derived metrics" isMobile={isMobile} expanded={expandedSection === 'behav'} onToggle={() => toggleSection('behav')}>
                    <section className="atp-v2-section atp-v2-behavioral">
                        <div className="atp-v2-section__header">
                            <h3>COGNITIVE TELEMETRY</h3>
                            <span className="atp-v2-section__sub">Derived from {cm.evaluationCount || 0} interview{(cm.evaluationCount || 0) !== 1 ? 's' : ''}</span>
                        </div>
                        {/* Always show Cognitive Telemetry (User Request) */}
                        <div className="atp-v2-behavioral__body">
                            <div className="atp-v2-behavioral__left">
                                <div className="atp-v2-cognitive-list">
                                    {cognitiveData.map((c, i) => (
                                        <div key={i} className="atp-v2-cognitive-row">
                                            <span className="atp-v2-cognitive-row__label">{c.label}</span>
                                            <div className="atp-v2-cognitive-row__bar-wrap">
                                                <motion.div
                                                    className="atp-v2-cognitive-row__bar"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${c.value}%` }}
                                                    transition={{ duration: 0.8, delay: i * 0.1 }}
                                                    style={{ background: c.value > 0 ? getScoreGradient(c.value) : '#334155' }}
                                                />
                                            </div>
                                            <span className="atp-v2-cognitive-row__value">{c.value || 'Pending'}</span>
                                        </div>
                                    ))}
                                </div>
                                {cm.lastEvaluatedAt && (
                                    <div className="atp-v2-cognitive-timestamp">
                                        Last evaluated: {new Date(cm.lastEvaluatedAt).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                            <div className="atp-v2-behavioral__right">
                                <ResponsiveContainer width="100%" height={200}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={behavRadarData}>
                                        <PolarGrid stroke="var(--atp-grid)" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--atp-axis)', fontSize: 10 }} />
                                        <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                                        <Radar dataKey="value" stroke="var(--atp-accent)" fill="var(--atp-accent)" fillOpacity={0.4} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </section>
                </MobileCollapsible>

                {/* ═══════ AI + MARKET FEEDBACK (Recruiter Only) ═══════ */}
                {isRecruiter && (
                    <MobileCollapsible title="AI + Market Feedback" subtitle="Hiring intelligence" isMobile={isMobile} expanded={expandedSection === 'market'} onToggle={() => toggleSection('market')}>
                        <section className="atp-v2-section atp-v2-market">
                            <div className="atp-v2-section__header">
                                <h3>AI + Market Feedback</h3>
                            </div>
                            <div className="atp-v2-market__scores">
                                <MarketRow icon="✓" label="Domain Fit Score" value={currentDomainData.domainScore || 0} color="var(--atp-success)" />
                                <MarketRow icon="◉" label="Risk-Adjusted ATP" value={currentDomainData.riskAdjustedATP || 0} color="var(--atp-accent)" />
                                <MarketRow icon="○" label="Market Readiness" value={currentDomainData.marketReadinessScore || 0} color="var(--atp-warning)" />
                                <MarketRow icon="◎" label={`${careerPredictions?.recommendedRoles?.[0]?.role || 'Best Fit Role'}`} value={Math.min(99, talentScore)} color="var(--atp-muted)" />
                            </div>
                            <div className="atp-v2-market__insights">
                                <h4>Validation Strength <span className="atp-v2-market__arrow">▸▸▸</span></h4>
                                <div className="atp-v2-market__insight-item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--atp-success)" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
                                    {domainSkills.filter(s => s.validationScore > 70).length} skills with strong validation
                                </div>
                                <div className="atp-v2-market__insight-item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--atp-warning)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                                    {domainSkills.filter(s => s.riskIndex > 50).length} skills with elevated risk
                                </div>
                            </div>
                        </section>
                    </MobileCollapsible>
                )}

                {/* ═══════ CANDIDATE XP PROGRESS ═══════ */}
                {!isRecruiter && domainSkills.length > 0 && (
                    <MobileCollapsible title="Level Progress" subtitle="XP to next level" isMobile={isMobile} expanded={expandedSection === 'progress'} onToggle={() => toggleSection('progress')}>
                        <section className="atp-v2-section atp-v2-growth">
                            <div className="atp-v2-section__header">
                                <h3>SKILL LEVEL PROGRESS</h3>
                                <span className="atp-v2-section__sub">Complete challenges & interviews to earn XP</span>
                            </div>
                            {domainSkills.map((skill, i) => {
                                const nextLevel = Math.min(5, (skill.level || 1) + 1);
                                const nextXP = XP_THRESHOLDS[nextLevel] || 1000;
                                const progress = Math.min(100, ((skill.xp || 0) / nextXP) * 100);
                                return (
                                    <div key={i} className="atp-v2-growth__item">
                                        <div className="atp-v2-growth__info">
                                            <span className="atp-v2-growth__skill">{skill.skillName}</span>
                                            <span className="atp-v2-growth__levels">
                                                L{skill.level || 1} {LEVEL_LABELS[skill.level] || 'Basic'} →
                                                L{nextLevel} {LEVEL_LABELS[nextLevel]}
                                            </span>
                                        </div>
                                        <div className="atp-v2-growth__meta">
                                            <span className="atp-v2-growth__xp-count">{skill.xp || 0} / {nextXP} XP</span>
                                        </div>
                                        <div className="atp-v2-growth__bar">
                                            <motion.div
                                                className="atp-v2-growth__fill"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 1, delay: i * 0.15 }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </section>
                    </MobileCollapsible>
                )}
            </div>

            {/* ═══════ SECTION 5: VERIFIED PROJECTS ═══════ */}
            <MobileCollapsible title="Projects" subtitle={`${approvedProjects.length} verified`} isMobile={isMobile} expanded={expandedSection === 'projects'} onToggle={() => toggleSection('projects')}>
                <section className="atp-v2-section atp-v2-projects-section">
                    <div className="atp-v2-section__header">
                        <h3>VERIFIED PROJECTS</h3>
                        {!isRecruiter && (
                            <button className="atp-v2-submit-project-btn" onClick={() => setShowProjectModal(true)}>
                                + Submit Project
                            </button>
                        )}
                    </div>
                    <div className="atp-v2-projects">
                        {approvedProjects.length > 0 ? (
                            approvedProjects.map((proj, i) => (
                                <div key={i} className="atp-v2-project-card">
                                    <div className="atp-v2-project-card__img" style={{ background: `linear-gradient(135deg, ${['#1a1a2e', '#0f3460', '#16213e', '#1a0a2e'][i % 4]} 0%, #16213e 100%)` }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--atp-accent)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                                    </div>
                                    <h5>{proj.title}</h5>
                                    <p>Domain: {proj.domain}</p>
                                    <p className="atp-v2-project-card__stack">
                                        {proj.techStack?.join(', ') || 'N/A'}
                                    </p>
                                    <div className="atp-v2-project-card__badges">
                                        <span className="atp-v2-badge atp-v2-badge--verified">✓ Verified</span>
                                        <span className="atp-v2-badge atp-v2-badge--complexity">{proj.complexity || 'medium'}</span>
                                    </div>
                                    {proj.githubUrl && (
                                        <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" className="atp-v2-project-card__link">View on GitHub →</a>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="atp-v2-empty-chart">
                                {isRecruiter ? 'No verified projects for this candidate.' : 'Submit a GitHub project to showcase your work and earn ATP points.'}
                            </div>
                        )}
                    </div>

                    {/* Pending projects (candidate only) */}
                    {!isRecruiter && pendingProjects.length > 0 && (
                        <div className="atp-v2-pending-projects">
                            <h4>Pending Review ({pendingProjects.length})</h4>
                            {pendingProjects.map((proj, i) => (
                                <div key={i} className="atp-v2-pending-project-row">
                                    <span>{proj.title}</span>
                                    <span className="atp-v2-badge atp-v2-badge--pending">⏳ Pending</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </MobileCollapsible>

            {/* ═══════ RECRUITER ACTION BAR ═══════ */}
            {isRecruiter && (
                <div className="atp-v2-actions">
                    <button className="atp-v2-action-btn atp-v2-action-btn--primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
                        Shortlist
                    </button>
                    <button className="atp-v2-action-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        Invite to Interview
                    </button>
                    <button className="atp-v2-action-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
                        Share Profile
                    </button>
                </div>
            )}

            {/* Identity + Proctoring footer */}
            <div className="atp-v2-trust-strip">
                <span className="atp-v2-trust-badge atp-v2-trust-badge--verified">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" /></svg>
                    Identity Verified
                </span>
                <span className="atp-v2-trust-badge atp-v2-trust-badge--verified">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" /></svg>
                    Proctoring Clean
                </span>
            </div>

            {/* ═══════ PROJECT SUBMISSION MODAL ═══════ */}
            <AnimatePresence>
                {showProjectModal && (
                    <ProjectSubmitModal
                        domains={availableDomains}
                        userId={userId}
                        onClose={() => setShowProjectModal(false)}
                        onSubmit={onSubmitProject}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

/* ═══════════════════════════════
   CHART RENDERER
   ═══════════════════════════════ */
function renderChart(type, { radarData, barData, lineData, areaData, riskData, xpData, domainSkills, isMobile, isRecruiter }) {
    const chartHeight = isMobile ? 260 : 320;

    if (domainSkills.length === 0 && !['radar'].includes(type)) {
        return <div className="atp-v2-empty-chart">No data yet for this chart type. Complete assessments to populate analytics.</div>;
    }

    switch (type) {
        case 'radar':
            return (
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="var(--atp-grid)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--atp-axis)', fontSize: 11, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Tooltip content={<SkillTooltip />} />
                        <Radar dataKey="value" stroke="var(--atp-accent)" fill="var(--atp-accent)" fillOpacity={0.35} strokeWidth={2} />
                    </RadarChart>
                </ResponsiveContainer>
            );
        case 'bar':
            return (
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--atp-grid)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--atp-axis)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--atp-axis)', fontSize: 11 }} />
                        <Tooltip content={<BarTooltip />} />
                        <Legend />
                        <Bar dataKey="challenge" name="Challenge" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="interview" name="Interview" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="project" name="Project" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            );
        case 'line':
            return (
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <LineChart data={lineData.length > 0 ? lineData : [{ date: 'No data', score: 0 }]} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--atp-grid)" />
                        <XAxis dataKey="date" tick={{ fill: 'var(--atp-axis)', fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--atp-axis)', fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="var(--atp-accent)" strokeWidth={2} dot={{ r: 4, fill: 'var(--atp-accent)' }} />
                    </LineChart>
                </ResponsiveContainer>
            );
        case 'area':
            return (
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <AreaChart data={areaData.length > 0 ? areaData : [{ date: 'No data', performance: 0 }]} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--atp-grid)" />
                        <XAxis dataKey="date" tick={{ fill: 'var(--atp-axis)', fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--atp-axis)', fontSize: 11 }} />
                        <Tooltip />
                        <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--atp-accent)" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="var(--atp-accent)" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="performance" stroke="var(--atp-accent)" fill="url(#areaGradient)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            );
        case 'risk':
            return (
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={riskData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--atp-grid)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--atp-axis)', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--atp-axis)', fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="risk" name="Risk Index" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="confidence" name="Confidence" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="recency" name="Recency" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            );
        case 'xp':
            return (
                <div className="atp-v2-xp-chart">
                    {xpData.map((sk, i) => (
                        <div key={i} className="atp-v2-xp-chart__row">
                            <span className="atp-v2-xp-chart__name">{sk.name}</span>
                            <span className="atp-v2-xp-chart__level">L{sk.level}</span>
                            <div className="atp-v2-xp-chart__bar-wrap">
                                <motion.div
                                    className="atp-v2-xp-chart__bar"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, sk.progress)}%` }}
                                    transition={{ duration: 1, delay: i * 0.1 }}
                                    style={{ background: LEVEL_COLORS[sk.level] || '#3b82f6' }}
                                />
                            </div>
                            <span className="atp-v2-xp-chart__text">{sk.xp}/{sk.nextThreshold} XP</span>
                        </div>
                    ))}
                </div>
            );
        default:
            return <div className="atp-v2-empty-chart">Select a graph type</div>;
    }
}

/* ═══════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════ */

const ATPRing = ({ score, size = 130 }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 80 ? 'var(--atp-success)' : score >= 60 ? 'var(--atp-warning)' : 'var(--atp-risk)';
    const label = score >= 80 ? 'Strong' : score >= 60 ? 'Good' : 'Developing';

    return (
        <div className="atp-v2-ring" style={{ width: size, height: size }}>
            <svg viewBox="0 0 100 100" className="atp-v2-ring__svg">
                <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--atp-accent)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.8" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--atp-grid)" strokeWidth="6" />
                <motion.circle cx="50" cy="50" r={radius} fill="transparent" stroke={color} strokeWidth="6"
                    strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
            </svg>
            <div className="atp-v2-ring__content">
                <span className="atp-v2-ring__label-top">ATP</span>
                <span className="atp-v2-ring__label-top">SCORE</span>
                <motion.span className="atp-v2-ring__score" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    {score}
                </motion.span>
                <span className="atp-v2-ring__label-bottom" style={{ color }}>{label}</span>
            </div>
        </div>
    );
};

const SkillTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="atp-v2-tooltip">
            <div className="atp-v2-tooltip__header">
                <strong>{d.subject}</strong>
                <span className="atp-v2-tooltip__score">{d.value}</span>
            </div>
            {d.confidence !== undefined && (
                <div className="atp-v2-tooltip__row"><span>Confidence</span><span>{d.confidence}%</span></div>
            )}
            {d.level && (
                <div className="atp-v2-tooltip__row"><span>Level</span><span>{d.level}</span></div>
            )}
        </div>
    );
};

const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="atp-v2-tooltip">
            <div className="atp-v2-tooltip__header"><strong>{label}</strong></div>
            {payload.map((p, i) => (
                <div key={i} className="atp-v2-tooltip__row">
                    <span style={{ color: p.color }}>{p.name}</span>
                    <span>{p.value}%</span>
                </div>
            ))}
        </div>
    );
};

const MarketRow = ({ icon, label, value, color, tag }) => (
    <div className="atp-v2-market__row">
        <span className="atp-v2-market__row-icon" style={{ color }}>{icon}</span>
        <span className="atp-v2-market__row-label">{label} {tag && <span className="atp-v2-market__tag">{tag}</span>}</span>
        <div className="atp-v2-market__row-bar">
            <motion.div style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1 }} />
        </div>
        <span className="atp-v2-market__row-value">{value}</span>
    </div>
);

const ProjectSubmitModal = ({ domains, userId, onClose, onSubmit }) => {
    const [form, setForm] = useState({
        githubUrl: '', title: '', description: '', domain: domains[0] || '', techStack: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.githubUrl || !form.title || !form.domain) {
            setError('GitHub URL, title, and domain are required.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/projects/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    githubUrl: form.githubUrl,
                    title: form.title,
                    description: form.description,
                    domain: form.domain,
                    techStack: form.techStack.split(',').map(s => s.trim()).filter(Boolean)
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                if (onSubmit) onSubmit(data.data);
                setTimeout(() => onClose(), 1500);
            } else {
                setError(data.error || 'Failed to submit project');
            }
        } catch (err) {
            setError(err.message || 'Network error');
        }
        setSubmitting(false);
    };

    return (
        <motion.div className="atp-v2-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div className="atp-v2-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                <div className="atp-v2-modal__header">
                    <h3>Submit Project for Verification</h3>
                    <button className="atp-v2-modal__close" onClick={onClose}>×</button>
                </div>
                {success ? (
                    <div className="atp-v2-modal__success">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--atp-success)" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
                        <p>Project submitted for admin review!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="atp-v2-modal__form">
                        <div className="atp-v2-modal__field">
                            <label>GitHub URL *</label>
                            <input type="url" value={form.githubUrl} onChange={e => setForm({ ...form, githubUrl: e.target.value })} placeholder="https://github.com/user/repo" required />
                        </div>
                        <div className="atp-v2-modal__field">
                            <label>Project Title *</label>
                            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="My Awesome Project" required />
                        </div>
                        <div className="atp-v2-modal__field">
                            <label>Description</label>
                            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." rows={3} />
                        </div>
                        <div className="atp-v2-modal__field">
                            <label>Domain *</label>
                            <select value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}>
                                {domains.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="atp-v2-modal__field">
                            <label>Tech Stack (comma-separated)</label>
                            <input type="text" value={form.techStack} onChange={e => setForm({ ...form, techStack: e.target.value })} placeholder="React, Node.js, MongoDB" />
                        </div>
                        {error && <div className="atp-v2-modal__error">{error}</div>}
                        <button type="submit" className="atp-v2-action-btn atp-v2-action-btn--primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit for Review'}
                        </button>
                    </form>
                )}
            </motion.div>
        </motion.div>
    );
};

const MobileCollapsible = ({ title, subtitle, isMobile, expanded, onToggle, children }) => {
    if (!isMobile) return children;
    return (
        <div className="atp-v2-mobile-section">
            <button className="atp-v2-mobile-section__toggle" onClick={onToggle}>
                <div>
                    <strong>{title}</strong>
                    {subtitle && <span>{subtitle}</span>}
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>
            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ═══════════ HELPERS ═══════════ */
function getStrengthLabel(score) {
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Moderate';
    if (score >= 40) return 'Developing';
    return 'Weak';
}

function getScoreGradient(score) {
    if (score >= 80) return 'linear-gradient(90deg, #059669, #10b981)';
    if (score >= 60) return 'linear-gradient(90deg, #d97706, #f59e0b)';
    if (score >= 40) return 'linear-gradient(90deg, #2563eb, #3b82f6)';
    return 'linear-gradient(90deg, #dc2626, #ef4444)';
}

function getNodeColor(depth) {
    if (depth >= 80) return '#10b981';
    if (depth >= 60) return '#4ab4ff';
    if (depth >= 40) return '#f59e0b';
    return '#ef4444';
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash;
}

function buildGrowthData(history) {
    if (!history || history.length === 0) return [];
    // Group by date, sum xpDelta as cumulative score
    const dateMap = {};
    let cumulative = 0;
    history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (const h of history) {
        const date = new Date(h.timestamp).toLocaleDateString();
        cumulative += (h.xpDelta || 0);
        dateMap[date] = cumulative;
    }
    return Object.entries(dateMap).map(([date, score]) => ({ date, score: Math.min(100, Math.round(score / 10)) }));
}

function buildPerformanceTrend(history) {
    if (!history || history.length === 0) return [];
    const dateMap = {};
    for (const h of history) {
        const date = new Date(h.timestamp).toLocaleDateString();
        if (!dateMap[date]) dateMap[date] = [];
        dateMap[date].push(h.scoreDelta || 0);
    }
    return Object.entries(dateMap).map(([date, scores]) => ({
        date,
        performance: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    }));
}

export default AITalentPassport;
