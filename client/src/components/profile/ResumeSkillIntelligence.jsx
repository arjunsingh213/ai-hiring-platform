import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import './ResumeSkillIntelligence.css';

const LEVEL_LABELS = ['Unverified', 'Basic', 'Intermediate', 'Advanced', 'Expert'];
const LEVEL_COLORS = ['#94a3b8', '#60a5fa', '#a78bfa', '#f59e0b', '#10b981'];
const XP_THRESHOLDS = [0, 100, 300, 600, 1000];
const VERIFICATION_BADGES = {
    not_verified: { label: 'Not Verified', color: '#94a3b8', icon: '○' },
    in_progress: { label: 'In Progress', color: '#60a5fa', icon: '◐' },
    verified: { label: 'Verified', color: '#a78bfa', icon: '◉' },
    expert: { label: 'Expert', color: '#10b981', icon: '★' }
};

const ResumeSkillIntelligence = ({ userId, user, onSkillsUpdated }) => {
    const [skillNodes, setSkillNodes] = useState([]);
    const [groupedSkills, setGroupedSkills] = useState({});
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [resume, setResume] = useState(null);
    const [expandedDomain, setExpandedDomain] = useState(null);
    const [editingNode, setEditingNode] = useState(null);
    const [editName, setEditName] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchSkillNodes();
        fetchResume();
    }, [userId]);

    const fetchSkillNodes = async () => {
        try {
            const res = await api.get(`/skill-nodes/${userId}`);
            if (res?.success) {
                setSkillNodes(res.data || []);
                setGroupedSkills(res.grouped || {});
            }
        } catch (err) {
            console.error('Failed to fetch skill nodes:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchResume = async () => {
        try {
            const res = await api.get(`/resume/user/${userId}`);
            if (res?.success) {
                setResume(res.data);
            }
        } catch (err) {
            // No resume yet — that's fine
        }
    };

    const handleResumeUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('File size must be under 5MB');
            return;
        }

        setUploading(true);
        setUploadProgress(10);

        try {
            const formData = new FormData();
            formData.append('resume', file);

            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 8, 85));
            }, 300);

            const res = await api.post('/resume/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (res?.success) {
                setResume(res.data);
                // Refresh skill nodes after resume upload
                await fetchSkillNodes();
                if (onSkillsUpdated) onSkillsUpdated();
            }
        } catch (err) {
            console.error('Resume upload failed:', err);
            alert('Failed to upload resume. Please try again.');
        } finally {
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
            }, 500);
        }
    };

    const handleEditSkill = async (nodeId) => {
        if (!editName.trim()) return;
        try {
            await api.put(`/skill-nodes/${nodeId}`, { skillName: editName });
            setEditingNode(null);
            setEditName('');
            await fetchSkillNodes();
        } catch (err) {
            console.error('Failed to update skill:', err);
        }
    };

    const handleDeleteSkill = async (nodeId) => {
        if (!window.confirm('Remove this skill?')) return;
        try {
            await api.delete(`/skill-nodes/${nodeId}`);
            await fetchSkillNodes();
        } catch (err) {
            console.error('Failed to delete skill:', err);
        }
    };

    const getXPProgress = (node) => {
        const currentThreshold = XP_THRESHOLDS[node.level] || 0;
        const nextThreshold = XP_THRESHOLDS[Math.min(node.level + 1, 4)] || 1000;
        const progress = ((node.xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
        return Math.max(0, Math.min(100, progress));
    };

    const domainKeys = Object.keys(groupedSkills).sort((a, b) =>
        groupedSkills[b].length - groupedSkills[a].length
    );

    return (
        <div className="rsi-container">
            {/* Header */}
            <div className="rsi-header">
                <div className="rsi-header-left">
                    <div className="rsi-header-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M9 15l2 2 4-4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="rsi-title">Resume & Skill Intelligence</h2>
                        <p className="rsi-subtitle">
                            {skillNodes.length} skills detected • {skillNodes.filter(s => s.level > 0).length} verified
                        </p>
                    </div>
                </div>
                <button
                    className="rsi-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? (
                        <>
                            <div className="rsi-spinner" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            {resume ? 'Update Resume' : 'Upload Resume'}
                        </>
                    )}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleResumeUpload}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Upload Progress */}
            <AnimatePresence>
                {uploading && (
                    <motion.div
                        className="rsi-progress-bar"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className="rsi-progress-track">
                            <motion.div
                                className="rsi-progress-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <span className="rsi-progress-text">
                            {uploadProgress < 30 ? 'Uploading resume...' :
                                uploadProgress < 60 ? 'Extracting text...' :
                                    uploadProgress < 90 ? 'AI analyzing skills...' :
                                        'Creating skill nodes...'}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Resume Info */}
            {resume && (
                <div className="rsi-resume-info">
                    <div className="rsi-resume-file">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>{resume.fileName}</span>
                    </div>
                    {resume.aiAnalysis?.skillLevel && (
                        <span className={`rsi-level-badge rsi-level-${resume.aiAnalysis.skillLevel}`}>
                            {resume.aiAnalysis.skillLevel.charAt(0).toUpperCase() + resume.aiAnalysis.skillLevel.slice(1)}
                        </span>
                    )}
                </div>
            )}

            {/* Skill Nodes Grid */}
            {loading ? (
                <div className="rsi-loading">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="rsi-skeleton">
                            <div className="rsi-skeleton-shimmer" />
                        </div>
                    ))}
                </div>
            ) : skillNodes.length === 0 ? (
                <div className="rsi-empty">
                    <div className="rsi-empty-icon">📄</div>
                    <h3>No Skills Detected Yet</h3>
                    <p>Upload your resume to automatically detect and track your skills with AI-powered analysis.</p>
                    <button className="rsi-empty-cta" onClick={() => fileInputRef.current?.click()}>
                        Upload Resume
                    </button>
                </div>
            ) : (
                <div className="rsi-domains">
                    {domainKeys.map(domain => (
                        <div key={domain} className="rsi-domain-group">
                            <button
                                className={`rsi-domain-header ${expandedDomain === domain ? 'expanded' : ''}`}
                                onClick={() => setExpandedDomain(expandedDomain === domain ? null : domain)}
                            >
                                <div className="rsi-domain-info">
                                    <span className="rsi-domain-name">{domain}</span>
                                    <span className="rsi-domain-count">{groupedSkills[domain].length} skills</span>
                                </div>
                                <svg className="rsi-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            <AnimatePresence>
                                {expandedDomain === domain && (
                                    <motion.div
                                        className="rsi-skill-list"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        {groupedSkills[domain].map(node => (
                                            <div key={node._id} className="rsi-skill-node">
                                                <div className="rsi-skill-top">
                                                    {editingNode === node._id ? (
                                                        <div className="rsi-skill-edit">
                                                            <input
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleEditSkill(node._id)}
                                                                autoFocus
                                                            />
                                                            <button onClick={() => handleEditSkill(node._id)}>✓</button>
                                                            <button onClick={() => setEditingNode(null)}>✕</button>
                                                        </div>
                                                    ) : (
                                                        <div className="rsi-skill-name-row">
                                                            <span className="rsi-skill-name">{node.skillName}</span>
                                                            <span
                                                                className="rsi-verification-badge"
                                                                style={{ color: VERIFICATION_BADGES[node.verifiedStatus]?.color }}
                                                                title={VERIFICATION_BADGES[node.verifiedStatus]?.label}
                                                            >
                                                                {VERIFICATION_BADGES[node.verifiedStatus]?.icon}
                                                                <span className="rsi-badge-label">
                                                                    {VERIFICATION_BADGES[node.verifiedStatus]?.label}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="rsi-skill-actions">
                                                        <button
                                                            className="rsi-action-btn"
                                                            onClick={() => { setEditingNode(node._id); setEditName(node.skillName); }}
                                                            title="Edit"
                                                        >✏️</button>
                                                        <button
                                                            className="rsi-action-btn rsi-action-delete"
                                                            onClick={() => handleDeleteSkill(node._id)}
                                                            title="Remove"
                                                        >×</button>
                                                    </div>
                                                </div>

                                                {/* Level Ladder */}
                                                <div className="rsi-level-ladder">
                                                    {[0, 1, 2, 3, 4].map(lvl => (
                                                        <div
                                                            key={lvl}
                                                            className={`rsi-level-step ${lvl <= node.level ? 'active' : ''} ${lvl === node.level ? 'current' : ''}`}
                                                            style={{ '--level-color': LEVEL_COLORS[lvl] }}
                                                        >
                                                            <div className="rsi-level-dot" />
                                                            <span className="rsi-level-label">{LEVEL_LABELS[lvl]}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* XP Bar */}
                                                <div className="rsi-xp-section">
                                                    <div className="rsi-xp-info">
                                                        <span className="rsi-xp-text">{node.xp} XP</span>
                                                        {node.level < 4 && (
                                                            <span className="rsi-xp-next">
                                                                Next: {XP_THRESHOLDS[node.level + 1]} XP
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="rsi-xp-track">
                                                        <motion.div
                                                            className="rsi-xp-fill"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${getXPProgress(node)}%` }}
                                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                                            style={{ background: LEVEL_COLORS[node.level] }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Challenges completed */}
                                                {node.challengesCompleted > 0 && (
                                                    <div className="rsi-challenges-count">
                                                        <span>🏆 {node.challengesCompleted} challenges completed</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            )}

            {/* Overall Stats Bar */}
            {skillNodes.length > 0 && (
                <div className="rsi-stats-bar">
                    <div className="rsi-stat">
                        <span className="rsi-stat-value">{skillNodes.length}</span>
                        <span className="rsi-stat-label">Total Skills</span>
                    </div>
                    <div className="rsi-stat">
                        <span className="rsi-stat-value">{skillNodes.filter(s => s.level >= 1).length}</span>
                        <span className="rsi-stat-label">Verified</span>
                    </div>
                    <div className="rsi-stat">
                        <span className="rsi-stat-value">{skillNodes.filter(s => s.level >= 4).length}</span>
                        <span className="rsi-stat-label">Expert</span>
                    </div>
                    <div className="rsi-stat">
                        <span className="rsi-stat-value">{skillNodes.reduce((sum, s) => sum + s.xp, 0)}</span>
                        <span className="rsi-stat-label">Total XP</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResumeSkillIntelligence;
