import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { JOB_DOMAINS } from '../data/validationData';
import './TopCandidatesSidebar.css';

const TopCandidatesSidebar = ({ jobDomains = [] }) => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDomain, setActiveDomain] = useState(null);

    // Get domain info from JOB_DOMAINS
    const getDomainInfo = (domainId) => {
        return JOB_DOMAINS.find(d => d.id === domainId) || { id: domainId, name: domainId, icon: '📦' };
    };

    useEffect(() => {
        if (jobDomains && jobDomains.length > 0) {
            setActiveDomain(jobDomains[0]);
        }
    }, [jobDomains]);

    useEffect(() => {
        let isMounted = true;

        const fetchTopCandidates = async (domainId) => {
            try {
                setLoading(true);
                console.log('🔍 Fetching top candidates for domain:', domainId);
                const response = await api.get(`/users/top-candidates/${encodeURIComponent(domainId)}?limit=5`);
                console.log('📊 Top candidates response:', response.data);

                if (isMounted) {
                    // Handle both formats: direct array or {data: array}
                    let candidatesData = [];
                    if (Array.isArray(response.data)) {
                        candidatesData = response.data;
                    } else if (response.data?.data && Array.isArray(response.data.data)) {
                        candidatesData = response.data.data;
                    }
                    console.log('✅ Setting candidates:', candidatesData.length, candidatesData);
                    setCandidates(candidatesData);
                }
            } catch (error) {
                console.error('Error fetching top candidates:', error);
                if (isMounted) {
                    setCandidates([]);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (activeDomain) {
            fetchTopCandidates(activeDomain);
        } else {
            setLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [activeDomain]);

    const getRankBadge = (index) => {
        const ranks = ['🥇', '🥈', '🥉'];
        return ranks[index] || `#${index + 1}`;
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#10B981';
        if (score >= 60) return '#6366F1';
        if (score >= 40) return '#F59E0B';
        return '#EF4444';
    };

    const getLevelBand = (score) => {
        if (score >= 90) return 'Expert';
        if (score >= 70) return 'Advanced';
        if (score >= 50) return 'Intermediate';
        return 'Beginner';
    };

    // Debug: log candidates state changes
    useEffect(() => {
        console.log('👥 Candidates state updated:', candidates.length, candidates);
    }, [candidates]);

    if (!jobDomains || jobDomains.length === 0) {
        return null;
    }

    const activeDomainInfo = getDomainInfo(activeDomain);

    return (
        <div className="top-candidates-sidebar">
            <div className="sidebar-header">
                <h3>Top Candidates</h3>
            </div>

            {/* Domain Tabs */}
            {jobDomains.length > 1 && (
                <div className="domain-tabs">
                    {jobDomains.map(domainId => {
                        const info = getDomainInfo(domainId);
                        return (
                            <button
                                key={domainId}
                                className={`domain-tab ${activeDomain === domainId ? 'active' : ''}`}
                                onClick={() => setActiveDomain(domainId)}
                                title={info.name}
                            >
                                <span className="tab-icon">{info.icon}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Active Domain Badge */}
            <div className="active-domain-badge">
                <span className="badge-icon">{activeDomainInfo.icon}</span>
                <span className="badge-name">{activeDomainInfo.name}</span>
            </div>

            {loading ? (
                <div className="sidebar-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            ) : candidates.length === 0 ? (
                <div className="sidebar-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    <p>No candidates yet in this domain</p>
                </div>
            ) : (
                <div className="candidates-list">
                    {candidates.map((candidate, index) => (
                        <Link
                            key={candidate._id}
                            to={`/profile/${candidate._id}`}
                            className="candidate-card"
                        >
                            <span className="rank-badge">{getRankBadge(index)}</span>
                            <div className="candidate-avatar">
                                {candidate.profile?.photo ? (
                                    <img src={candidate.profile.photo} alt={candidate.profile?.name} />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {candidate.profile?.name?.charAt(0) || 'U'}
                                    </div>
                                )}
                            </div>
                            <div className="candidate-info">
                                <h4>{candidate.profile?.name || 'User'}</h4>
                                <p className="candidate-level">
                                    {getLevelBand(candidate.aiTalentPassport?.talentScore || 0)}
                                </p>
                            </div>
                            <div
                                className="candidate-score"
                                style={{ borderColor: getScoreColor(candidate.aiTalentPassport?.talentScore || 0) }}
                            >
                                <span style={{ color: getScoreColor(candidate.aiTalentPassport?.talentScore || 0) }}>
                                    {candidate.aiTalentPassport?.talentScore || 0}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <div className="sidebar-footer">
                <Link to="/jobseeker/candidates" className="view-all-link">
                    View All Candidates
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </div>
    );
};

export default TopCandidatesSidebar;
