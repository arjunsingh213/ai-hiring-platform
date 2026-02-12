import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AdminChallengeMonitoring.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LEVEL_LABELS = ['Unverified', 'Basic', 'Intermediate', 'Advanced', 'Expert'];
const LEVEL_COLORS = ['#64748b', '#60a5fa', '#a78bfa', '#f59e0b', '#10b981'];

const AdminChallengeMonitoring = () => {
    const [view, setView] = useState('overview'); // overview | challenges | flagged | detail | skillnodes
    const [stats, setStats] = useState(null);
    const [challenges, setChallenges] = useState([]);
    const [flagged, setFlagged] = useState([]);
    const [selectedChallenge, setSelectedChallenge] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', domain: '', search: '' });

    // SkillNode state
    const [snStats, setSnStats] = useState(null);
    const [skillNodes, setSkillNodes] = useState([]);
    const [snFilters, setSnFilters] = useState({ search: '', domain: '', level: '', riskMin: '' });
    const [snLoading, setSnLoading] = useState(false);

    const adminToken = localStorage.getItem('adminToken');
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

    const headers = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

    useEffect(() => {
        fetchStats();
        fetchChallenges();
        fetchFlagged();
        fetchSnStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/challenges/stats`, { headers });
            const data = await res.json();
            if (data.success) setStats(data.data);
        } catch (err) { console.error('Stats fetch failed:', err); }
    };

    const fetchChallenges = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.domain) params.append('domain', filters.domain);
            if (filters.search) params.append('search', filters.search);

            const res = await fetch(`${API_URL}/admin/challenges?${params}`, { headers });
            const data = await res.json();
            if (data.success) setChallenges(data.data);
        } catch (err) { console.error('Challenges fetch failed:', err); }
        setLoading(false);
    };

    const fetchFlagged = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/challenges/flagged`, { headers });
            const data = await res.json();
            if (data.success) setFlagged(data.data);
        } catch (err) { console.error('Flagged fetch failed:', err); }
    };

    const fetchChallengeDetail = async (id) => {
        try {
            const res = await fetch(`${API_URL}/admin/challenges/${id}`, { headers });
            const data = await res.json();
            if (data.success) { setSelectedChallenge(data.data); setView('detail'); }
        } catch (err) { console.error('Detail fetch failed:', err); }
    };

    const handleAction = async (action, id, body = {}) => {
        try {
            const method = action === 'delete' ? 'DELETE' : action === 'edit' ? 'PUT' : 'POST';
            let url = `${API_URL}/admin/challenges/${id}`;
            if (action === 'suspend') url += '/suspend';

            const res = await fetch(url, {
                method, headers,
                body: JSON.stringify({ adminId: adminInfo._id, ...body })
            });
            const data = await res.json();
            if (data.success) {
                fetchChallenges();
                fetchStats();
                if (selectedChallenge) fetchChallengeDetail(id);
            }
            return data;
        } catch (err) { console.error('Action failed:', err); }
    };

    const handleReviewAttempt = async (riskLogId, action, notes = '') => {
        try {
            const res = await fetch(`${API_URL}/admin/challenges/attempts/${riskLogId}/review`, {
                method: 'POST', headers,
                body: JSON.stringify({ adminId: adminInfo._id, action, notes })
            });
            const data = await res.json();
            if (data.success) {
                fetchFlagged();
                fetchStats();
            }
            return data;
        } catch (err) { console.error('Review failed:', err); }
    };

    const handleResetATP = async (attemptId, reason = '') => {
        try {
            const res = await fetch(`${API_URL}/admin/challenges/attempts/${attemptId}/reset-atp`, {
                method: 'POST', headers,
                body: JSON.stringify({ adminId: adminInfo._id, reason })
            });
            const data = await res.json();
            if (data.success) { fetchStats(); }
            return data;
        } catch (err) { console.error('ATP Reset failed:', err); }
    };

    const getRiskColor = (level) => {
        const colors = { low: '#10b981', medium: '#f59e0b', high: '#f87171', critical: '#ef4444' };
        return colors[level] || '#94a3b8';
    };

    // ===== SkillNode functions =====
    const fetchSnStats = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/challenges/skillnodes/stats`, { headers });
            const data = await res.json();
            if (data.success) setSnStats(data.data);
        } catch (err) { console.error('SN stats fetch failed:', err); }
    };

    const fetchSkillNodes = async () => {
        setSnLoading(true);
        try {
            const params = new URLSearchParams();
            if (snFilters.search) params.append('search', snFilters.search);
            if (snFilters.domain) params.append('domain', snFilters.domain);
            if (snFilters.level !== '') params.append('level', snFilters.level);
            if (snFilters.riskMin) params.append('riskMin', snFilters.riskMin);

            const res = await fetch(`${API_URL}/admin/challenges/skillnodes?${params}`, { headers });
            const data = await res.json();
            if (data.success) setSkillNodes(data.data);
        } catch (err) { console.error('SkillNodes fetch failed:', err); }
        setSnLoading(false);
    };

    const handleSnAdjust = async (nodeId, body) => {
        try {
            const res = await fetch(`${API_URL}/admin/challenges/skillnodes/${nodeId}`, {
                method: 'PUT', headers,
                body: JSON.stringify({ adminId: adminInfo._id, ...body })
            });
            const data = await res.json();
            if (data.success) { fetchSkillNodes(); fetchSnStats(); }
            return data;
        } catch (err) { console.error('SN adjust failed:', err); }
    };

    return (
        <div className="acm-container">
            {/* Header */}
            <div className="acm-header">
                <div>
                    <h1>Challenge Monitoring</h1>
                    <p>Monitor challenges, review flagged attempts, and manage ATP impacts</p>
                </div>
            </div>

            {/* Sub-navigation */}
            <div className="acm-subnav">
                {['overview', 'challenges', 'flagged', 'skillnodes'].map(tab => (
                    <button
                        key={tab}
                        className={`acm-subnav-btn ${view === tab ? 'active' : ''}`}
                        onClick={() => { setView(tab); if (tab === 'skillnodes' && skillNodes.length === 0) fetchSkillNodes(); }}
                    >
                        {tab === 'overview' && '📊 '}
                        {tab === 'challenges' && '⚡ '}
                        {tab === 'flagged' && '🚩 '}
                        {tab === 'skillnodes' && '🧠 '}
                        {tab === 'skillnodes' ? 'SkillNodes' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === 'flagged' && flagged.length > 0 && (
                            <span className="acm-badge">{flagged.length}</span>
                        )}
                        {tab === 'skillnodes' && snStats?.highRiskCount > 0 && (
                            <span className="acm-badge warn">{snStats.highRiskCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Overview */}
            {view === 'overview' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="acm-overview">
                    {stats && (
                        <>
                            <div className="acm-stats-grid">
                                <div className="acm-stat-card">
                                    <div className="acm-stat-value">{stats.totalActive}</div>
                                    <div className="acm-stat-label">Active Challenges</div>
                                </div>
                                <div className="acm-stat-card warn">
                                    <div className="acm-stat-value">{stats.totalSuspended}</div>
                                    <div className="acm-stat-label">Suspended</div>
                                </div>
                                <div className="acm-stat-card danger">
                                    <div className="acm-stat-value">{stats.flaggedAttempts}</div>
                                    <div className="acm-stat-label">Pending Review</div>
                                </div>
                                <div className="acm-stat-card info">
                                    <div className="acm-stat-value">{stats.totalAttempts}</div>
                                    <div className="acm-stat-label">Total Completions</div>
                                </div>
                                <div className="acm-stat-card">
                                    <div className="acm-stat-value">{stats.totalCustom}</div>
                                    <div className="acm-stat-label">Custom</div>
                                </div>
                                <div className="acm-stat-card">
                                    <div className="acm-stat-value">{stats.totalDomain}</div>
                                    <div className="acm-stat-label">Domain</div>
                                </div>
                            </div>

                            {/* Top Domains */}
                            {stats.topDomains?.length > 0 && (
                                <div className="acm-section-card">
                                    <h3>Top Domains</h3>
                                    <div className="acm-domain-bars">
                                        {stats.topDomains.map((d, i) => (
                                            <div key={i} className="acm-domain-row">
                                                <span className="acm-domain-name">{d._id}</span>
                                                <div className="acm-domain-bar-track">
                                                    <motion.div
                                                        className="acm-domain-bar-fill"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(d.count / (stats.topDomains[0]?.count || 1)) * 100}%` }}
                                                        transition={{ delay: i * 0.1 }}
                                                    />
                                                </div>
                                                <span className="acm-domain-count">{d.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Most Flagged */}
                            {stats.mostFlagged?.length > 0 && (
                                <div className="acm-section-card">
                                    <h3>Most Flagged Challenges</h3>
                                    <div className="acm-flagged-list">
                                        {stats.mostFlagged.map((f, i) => (
                                            <div key={i} className="acm-flagged-item" onClick={() => f.challengeId && fetchChallengeDetail(f.challengeId)}>
                                                <span className="acm-flagged-title">{f.title || 'Unknown'}</span>
                                                <span className="acm-flagged-domain">{f.domain}</span>
                                                <span className="acm-flagged-count">{f.flagCount} flags</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            )}

            {/* Challenges List */}
            {view === 'challenges' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* Filters */}
                    <div className="acm-filters">
                        <input
                            className="acm-filter-input"
                            placeholder="Search challenges..."
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && fetchChallenges()}
                        />
                        <select className="acm-filter-select" value={filters.status}
                            onChange={e => { setFilters({ ...filters, status: e.target.value }); setTimeout(fetchChallenges, 0); }}>
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="deleted">Deleted</option>
                        </select>
                        <select className="acm-filter-select" value={filters.domain}
                            onChange={e => { setFilters({ ...filters, domain: e.target.value }); setTimeout(fetchChallenges, 0); }}>
                            <option value="">All Domains</option>
                            {['Software Engineering', 'Marketing', 'Customer Support', 'Design', 'Product Management', 'Data Science', 'Sales', 'HR', 'Finance'].map(d =>
                                <option key={d} value={d}>{d}</option>
                            )}
                        </select>
                    </div>

                    {/* Table */}
                    <div className="acm-table-container">
                        <table className="acm-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Creator</th>
                                    <th>Domain</th>
                                    <th>Type</th>
                                    <th>Attempts</th>
                                    <th>Avg Score</th>
                                    <th>Flag Rate</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {challenges.map(c => (
                                    <tr key={c._id} onClick={() => fetchChallengeDetail(c._id)} style={{ cursor: 'pointer' }}>
                                        <td className="acm-cell-title">{c.title}</td>
                                        <td>{c.creatorId?.profile?.name || 'System'}</td>
                                        <td><span className="acm-domain-tag">{c.domain}</span></td>
                                        <td><span className={`acm-type-tag ${c.challengeType}`}>{c.challengeType}</span></td>
                                        <td>{c.stats?.totalAttempts || 0}</td>
                                        <td>{c.stats?.avgScore || 0}%</td>
                                        <td>
                                            <span style={{ color: (c.stats?.flagRate || 0) > 20 ? '#f87171' : '#94a3b8' }}>
                                                {c.stats?.flagRate || 0}%
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`acm-status-tag ${c.status}`}>{c.status}</span>
                                        </td>
                                        <td>
                                            <div className="acm-action-btns" onClick={e => e.stopPropagation()}>
                                                {c.status === 'active' && (
                                                    <button className="acm-action-btn warn" onClick={() => handleAction('suspend', c._id, { reason: 'Admin review' })}>
                                                        Suspend
                                                    </button>
                                                )}
                                                <button className="acm-action-btn danger" onClick={() => handleAction('delete', c._id, { reason: 'Removed by admin' })}>
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {challenges.length === 0 && !loading && (
                            <div className="acm-empty">No challenges found.</div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Flagged Attempts */}
            {view === 'flagged' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="acm-flagged-queue">
                        {flagged.length === 0 ? (
                            <div className="acm-empty">
                                <span className="acm-empty-icon">✅</span>
                                <h3>No Pending Reviews</h3>
                                <p>All flagged attempts have been reviewed.</p>
                            </div>
                        ) : (
                            flagged.map(log => (
                                <div key={log._id} className="acm-flagged-card">
                                    <div className="acm-flagged-card-header">
                                        <div>
                                            <h4>{log.challengeId?.title || 'Challenge'}</h4>
                                            <span className="acm-flagged-user">
                                                By: {log.userId?.profile?.name || 'Unknown'} ({log.userId?.email || '-'})
                                            </span>
                                        </div>
                                        <div className="acm-risk-badge" style={{ background: `${getRiskColor(log.riskLevel)}20`, color: getRiskColor(log.riskLevel) }}>
                                            Risk: {log.riskScore} ({log.riskLevel})
                                        </div>
                                    </div>

                                    {/* Flags */}
                                    <div className="acm-flags-list">
                                        {log.flags?.map((flag, i) => (
                                            <span key={i} className={`acm-flag-tag ${flag.severity}`}>
                                                {flag.type?.replace('_', ' ')} — {flag.details}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Attempt Details */}
                                    {log.attemptId && (
                                        <div className="acm-attempt-details">
                                            <div className="acm-detail-row">
                                                <span>Score:</span>
                                                <strong>{log.attemptId.finalScore || 0}%</strong>
                                            </div>
                                            <div className="acm-detail-row">
                                                <span>Tab Switches:</span>
                                                <strong>{log.attemptId.antiCheatLog?.tabSwitches || 0}</strong>
                                            </div>
                                            <div className="acm-detail-row">
                                                <span>Paste Attempts:</span>
                                                <strong>{log.attemptId.antiCheatLog?.pasteAttempts || 0}</strong>
                                            </div>
                                            <div className="acm-detail-row">
                                                <span>LLM Confidence:</span>
                                                <strong>{log.attemptId.aiDetection?.llmConfidenceScore || 0}%</strong>
                                            </div>
                                            <div className="acm-detail-row">
                                                <span>Time Spent:</span>
                                                <strong>{Math.round((log.attemptId.timeSpent || 0) / 60)}m</strong>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="acm-flagged-actions">
                                        <button className="acm-action-btn success" onClick={() => handleReviewAttempt(log._id, 'approved', 'Approved after review')}>
                                            ✓ Approve & Apply ATP
                                        </button>
                                        <button className="acm-action-btn danger" onClick={() => handleReviewAttempt(log._id, 'rejected', 'Rejected - suspicious activity')}>
                                            ✕ Reject
                                        </button>
                                        {log.attemptId?._id && (
                                            <button className="acm-action-btn warn" onClick={() => handleResetATP(log.attemptId._id, 'Admin reset')}>
                                                Reset ATP
                                            </button>
                                        )}
                                        <button className="acm-action-btn danger" onClick={() => handleAction('ban', `users/${log.userId?._id}`, { reason: 'Repeated violations' })}>
                                            Ban Creator
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}

            {/* SkillNodes Tab */}
            {view === 'skillnodes' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* SN Stats */}
                    {snStats && (
                        <div className="acm-stats-grid">
                            <div className="acm-stat-card">
                                <div className="acm-stat-value">{snStats.totalSkillNodes}</div>
                                <div className="acm-stat-label">Total SkillNodes</div>
                            </div>
                            <div className="acm-stat-card info">
                                <div className="acm-stat-value">{snStats.totalUsers}</div>
                                <div className="acm-stat-label">Users</div>
                            </div>
                            <div className="acm-stat-card">
                                <div className="acm-stat-value">{snStats.avgXp}</div>
                                <div className="acm-stat-label">Avg XP</div>
                            </div>
                            <div className="acm-stat-card success">
                                <div className="acm-stat-value">{snStats.expertCount}</div>
                                <div className="acm-stat-label">Experts (L4)</div>
                            </div>
                            <div className="acm-stat-card danger">
                                <div className="acm-stat-value">{snStats.highRiskCount}</div>
                                <div className="acm-stat-label">High Risk</div>
                            </div>
                            <div className="acm-stat-card">
                                <div className="acm-stat-value">{snStats.recentActivity}</div>
                                <div className="acm-stat-label">Active (24h)</div>
                            </div>
                        </div>
                    )}

                    {/* Level Distribution + Top Skills */}
                    {snStats && (
                        <div className="acm-sn-panels">
                            <div className="acm-section-card">
                                <h3>Level Distribution</h3>
                                <div className="acm-domain-bars">
                                    {snStats.levelDistribution?.map((ld, i) => (
                                        <div key={i} className="acm-domain-row">
                                            <span className="acm-domain-name" style={{ color: LEVEL_COLORS[ld._id] || '#94a3b8' }}>
                                                L{ld._id} {LEVEL_LABELS[ld._id] || ''}
                                            </span>
                                            <div className="acm-domain-bar-track">
                                                <motion.div
                                                    className="acm-domain-bar-fill"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(ld.count / (snStats.totalSkillNodes || 1)) * 100}%` }}
                                                    style={{ background: LEVEL_COLORS[ld._id] || '#6366f1' }}
                                                />
                                            </div>
                                            <span className="acm-domain-count">{ld.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="acm-section-card">
                                <h3>Top Skills</h3>
                                <div className="acm-flagged-list">
                                    {snStats.topSkills?.map((s, i) => (
                                        <div key={i} className="acm-flagged-item">
                                            <span className="acm-flagged-title">{s.skill}</span>
                                            <span className="acm-flagged-domain">Avg L{s.avgLevel}</span>
                                            <span className="acm-flagged-count">{s.count} users</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="acm-filters">
                        <input
                            className="acm-filter-input"
                            placeholder="Search skills..."
                            value={snFilters.search}
                            onChange={e => setSnFilters({ ...snFilters, search: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && fetchSkillNodes()}
                        />
                        <select className="acm-filter-select" value={snFilters.level}
                            onChange={e => { setSnFilters({ ...snFilters, level: e.target.value }); setTimeout(fetchSkillNodes, 0); }}>
                            <option value="">All Levels</option>
                            {[0, 1, 2, 3, 4].map(l => <option key={l} value={l}>L{l} — {LEVEL_LABELS[l]}</option>)}
                        </select>
                        <select className="acm-filter-select" value={snFilters.riskMin}
                            onChange={e => { setSnFilters({ ...snFilters, riskMin: e.target.value }); setTimeout(fetchSkillNodes, 0); }}>
                            <option value="">All Risk</option>
                            <option value="25">Risk ≥ 25</option>
                            <option value="50">Risk ≥ 50</option>
                            <option value="75">Risk ≥ 75</option>
                        </select>
                    </div>

                    {/* SkillNodes Table */}
                    <div className="acm-table-container">
                        <table className="acm-table">
                            <thead>
                                <tr>
                                    <th>Skill</th>
                                    <th>User</th>
                                    <th>Domain</th>
                                    <th>Level</th>
                                    <th>XP</th>
                                    <th>Risk</th>
                                    <th>Challenges</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {skillNodes.map(node => (
                                    <tr key={node._id}>
                                        <td className="acm-cell-title">{node.skillName}</td>
                                        <td>{node.userId?.profile?.name || 'Unknown'}</td>
                                        <td><span className="acm-domain-tag">{node.domainCategory}</span></td>
                                        <td>
                                            <span style={{ color: LEVEL_COLORS[node.level || 0], fontWeight: 700 }}>
                                                L{node.level} {LEVEL_LABELS[node.level || 0]}
                                            </span>
                                        </td>
                                        <td>{node.xp || 0}</td>
                                        <td>
                                            <span style={{ color: node.riskScore > 50 ? '#f87171' : node.riskScore > 25 ? '#f59e0b' : '#94a3b8' }}>
                                                {node.riskScore || 0}
                                            </span>
                                        </td>
                                        <td>{node.challengesCompleted || 0}</td>
                                        <td>
                                            <span className={`acm-status-tag ${node.verifiedStatus === 'expert' ? 'active' : node.verifiedStatus === 'verified' ? 'active' : ''}`}>
                                                {node.verifiedStatus}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="acm-action-btns" onClick={e => e.stopPropagation()}>
                                                <button className="acm-action-btn success" title="Add 50 XP"
                                                    onClick={() => handleSnAdjust(node._id, { xpAdjustment: 50, reason: 'Admin XP boost' })}>
                                                    +XP
                                                </button>
                                                <button className="acm-action-btn warn" title="Deduct 50 XP"
                                                    onClick={() => handleSnAdjust(node._id, { xpAdjustment: -50, reason: 'Admin XP deduction' })}>
                                                    −XP
                                                </button>
                                                {node.riskScore > 0 && (
                                                    <button className="acm-action-btn danger" title="Reset risk to 0"
                                                        onClick={() => handleSnAdjust(node._id, { riskOverride: 0, reason: 'Admin risk reset' })}>
                                                        Reset Risk
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {skillNodes.length === 0 && !snLoading && (
                            <div className="acm-empty">No SkillNodes found. Use filters or search to browse.</div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Challenge Detail Panel */}
            <AnimatePresence>
                {view === 'detail' && selectedChallenge && (
                    <motion.div
                        className="acm-detail-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="acm-detail-panel"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25 }}
                        >
                            <div className="acm-detail-panel-header">
                                <h2>{selectedChallenge.title}</h2>
                                <button className="acm-close-btn" onClick={() => { setView('challenges'); setSelectedChallenge(null); }}>✕</button>
                            </div>

                            <div className="acm-detail-panel-body">
                                {/* Info */}
                                <div className="acm-detail-section">
                                    <h3>Details</h3>
                                    <div className="acm-detail-grid">
                                        <div className="acm-detail-item">
                                            <span>Creator</span>
                                            <strong>{selectedChallenge.creatorId?.profile?.name || 'System'}</strong>
                                        </div>
                                        <div className="acm-detail-item">
                                            <span>Domain</span>
                                            <strong>{selectedChallenge.domain}</strong>
                                        </div>
                                        <div className="acm-detail-item">
                                            <span>Difficulty</span>
                                            <strong>{selectedChallenge.difficulty}</strong>
                                        </div>
                                        <div className="acm-detail-item">
                                            <span>Type</span>
                                            <strong>{selectedChallenge.challengeType}</strong>
                                        </div>
                                        <div className="acm-detail-item">
                                            <span>Status</span>
                                            <span className={`acm-status-tag ${selectedChallenge.status}`}>{selectedChallenge.status}</span>
                                        </div>
                                        <div className="acm-detail-item">
                                            <span>ATP Impact</span>
                                            <strong>+{selectedChallenge.atpImpact?.maxContribution || 0}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="acm-detail-section">
                                    <h3>Statistics</h3>
                                    <div className="acm-detail-grid">
                                        <div className="acm-detail-item">
                                            <span>Total Attempts</span>
                                            <strong>{selectedChallenge.stats?.totalAttempts || 0}</strong>
                                        </div>
                                        <div className="acm-detail-item">
                                            <span>Completions</span>
                                            <strong>{selectedChallenge.stats?.completions || 0}</strong>
                                        </div>
                                        <div className="acm-detail-item">
                                            <span>Avg Score</span>
                                            <strong>{selectedChallenge.stats?.avgScore || 0}%</strong>
                                        </div>
                                        <div className="acm-detail-item">
                                            <span>Flag Rate</span>
                                            <strong style={{ color: (selectedChallenge.stats?.flagRate || 0) > 20 ? '#f87171' : 'inherit' }}>
                                                {selectedChallenge.stats?.flagRate || 0}%
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Attempts */}
                                {selectedChallenge.attempts?.length > 0 && (
                                    <div className="acm-detail-section">
                                        <h3>Recent Attempts ({selectedChallenge.attempts.length})</h3>
                                        <div className="acm-attempts-list">
                                            {selectedChallenge.attempts.slice(0, 10).map(a => (
                                                <div key={a._id} className="acm-attempt-row">
                                                    <span className="acm-attempt-user">{a.userId?.profile?.name || 'User'}</span>
                                                    <span className="acm-attempt-score">{a.finalScore || 0}%</span>
                                                    <span className="acm-attempt-risk" style={{ color: getRiskColor(a.riskLevel) }}>
                                                        {a.riskLevel}
                                                    </span>
                                                    <span className={`acm-status-tag ${a.status}`}>{a.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Admin Actions */}
                                <div className="acm-detail-section">
                                    <h3>Admin Actions</h3>
                                    <div className="acm-admin-actions-grid">
                                        {selectedChallenge.status === 'active' && (
                                            <button className="acm-action-btn warn full" onClick={() => handleAction('suspend', selectedChallenge._id, { reason: 'Suspended by admin' })}>
                                                Suspend Challenge
                                            </button>
                                        )}
                                        {selectedChallenge.status === 'suspended' && (
                                            <button className="acm-action-btn success full" onClick={() => handleAction('edit', selectedChallenge._id, { status: 'active' })}>
                                                Reactivate
                                            </button>
                                        )}
                                        <button className="acm-action-btn danger full" onClick={() => handleAction('delete', selectedChallenge._id, { reason: 'Deleted by admin' })}>
                                            Delete Challenge
                                        </button>
                                    </div>
                                </div>

                                {/* Admin Log */}
                                {selectedChallenge.adminActions?.length > 0 && (
                                    <div className="acm-detail-section">
                                        <h3>Audit Trail</h3>
                                        <div className="acm-audit-log">
                                            {selectedChallenge.adminActions.map((a, i) => (
                                                <div key={i} className="acm-audit-entry">
                                                    <span className="acm-audit-action">{a.action?.replace(/_/g, ' ')}</span>
                                                    <span className="acm-audit-reason">{a.reason || '-'}</span>
                                                    <span className="acm-audit-date">{new Date(a.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminChallengeMonitoring;
