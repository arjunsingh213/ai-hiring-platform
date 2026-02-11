import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { JOB_DOMAINS } from '../../data/validationData';
import { EXPANDED_JOB_DOMAINS } from '../../data/expandedJobDomains';
import { ListSkeleton } from '../../components/Skeleton';
import './LeaderboardPage.css';

const Icons = {
    trophy: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9H4.5C3.67 9 3 8.33 3 7.5V4.5C3 3.67 3.67 3 4.5 3H6M18 9H19.5C20.33 9 21 8.33 21 7.5V4.5C21 3.67 20.33 3 19.5 3H18M6 3H18V10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10V3Z" />
            <path d="M12 16V21M8 21H16" />
        </svg>
    ),
    search: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
        </svg>
    ),
    sparkle: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
    )
};

const Podium = ({ topCandidates, activeDomain }) => {
    // topCandidates should be top 3 [rank1, rank2, rank3]
    const displayOrder = [topCandidates[1], topCandidates[0], topCandidates[2]];

    return (
        <div className="podium-container">
            {displayOrder.map((cand, idx) => {
                if (!cand) return <div key={idx} className="podium-spot empty" />;
                const actualRank = displayOrder.indexOf(cand) === 0 ? 2 : (displayOrder.indexOf(cand) === 1 ? 1 : 3);

                return (
                    <motion.div
                        key={cand._id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            delay: actualRank * 0.1,
                            duration: 0.7,
                            ease: [0.4, 0, 0.2, 1]
                        }}
                        className={`podium-spot rank-${actualRank}`}
                    >
                        <div className="avatar-wrapper">
                            <div className="avatar">
                                {cand.profile?.photo ? (
                                    <img src={cand.profile.photo} alt="" />
                                ) : (
                                    <span>{cand.profile?.name?.charAt(0)}</span>
                                )}
                            </div>
                            <div className="rank-badge">{actualRank}</div>
                        </div>
                        <div className="info">
                            <h3 className="name">{cand.profile?.name || 'Top Candidate'}</h3>
                            <span className="score">{cand.aiTalentPassport?.talentScore}%</span>
                            <span className="domain-label">{(activeDomain.name || activeDomain)}</span>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

const LeaderboardPage = () => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDomain, setActiveDomain] = useState({ id: 'all', name: 'All Domains' });
    const [activeTimeframe, setActiveTimeframe] = useState('all-time');
    const [user, setUser] = useState(null);
    const [domains, setDomains] = useState([{ id: 'all', name: 'All Domains' }, ...JOB_DOMAINS]);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        const loadInitialData = async () => {
            await fetchUserProfile();
            fetchLeaderboardData();
        };
        loadInitialData();
    }, [activeDomain, activeTimeframe]);

    const fetchUserProfile = async () => {
        try {
            if (userId) {
                const response = await api.get(`/users/${userId}`);
                const userData = response.data.data || response.data;
                setUser(userData);

                // Filter domains if user is a jobseeker and has selections
                if (userData.role === 'jobseeker' && userData.jobSeekerProfile?.jobDomains?.length > 0) {
                    // Normalize domains: map the user strings to objects that our tab navigator expects
                    const userSelectedDomains = userData.jobSeekerProfile.jobDomains.map(dName => {
                        // Try to find a matching object in our predefined lists to get an ID if possible
                        // But if not found, just use the name as ID (backend supports it)
                        const match = JOB_DOMAINS.find(jd => jd.name === dName || jd.id === dName) ||
                            EXPANDED_JOB_DOMAINS.find(ejd => ejd.domain === dName || ejd.id === dName);

                        return {
                            id: match?.id || dName,
                            name: match?.domain || match?.name || dName
                        };
                    });

                    if (userSelectedDomains.length > 0) {
                        const finalDomains = [{ id: 'all', name: 'All Domains' }, ...userSelectedDomains];
                        setDomains(finalDomains);

                        // Check if current active domain is in the new set
                        const isActiveInNew = finalDomains.some(d =>
                            (d.id === (activeDomain.id || activeDomain)) ||
                            (d.name === (activeDomain.name || activeDomain))
                        );

                        if (!isActiveInNew) {
                            setActiveDomain(finalDomains[0]);
                        }
                    }
                } else if (userData.role === 'recruiter') {
                    // Recruiters see a broader set of popular domains
                    const topDomains = EXPANDED_JOB_DOMAINS.slice(0, 8).map(d => ({
                        id: d.id,
                        name: d.domain
                    }));
                    setDomains([{ id: 'all', name: 'All Domains' }, ...topDomains]);
                }
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };

    const fetchLeaderboardData = async () => {
        setLoading(true);
        try {
            // Use .id if activeDomain is an object
            const domainId = activeDomain.id || activeDomain;
            const response = await api.get(`/users/top-candidates/${encodeURIComponent(domainId)}?limit=25&timeframe=${activeTimeframe}`);
            const data = response.data?.data || response.data || [];
            setCandidates(data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setCandidates([]);
        } finally {
            setLoading(false);
        }
    };

    const topThree = candidates.slice(0, 3);
    const restCandidates = candidates.slice(3);

    return (
        <div className="leaderboard-redesign">
            {/* Ambient Background Element */}
            <div className="neural-bg" />

            <div className="leaderboard-header-section">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    className="headline-group"
                >
                    <div className="trophy-badge">
                        {Icons.trophy}
                    </div>
                    <h1>Neural Talent Spotlight</h1>
                    <p>Verified ranking of top talent across neural assessment metrics.</p>
                </motion.div>
            </div>

            <div className="filter-pill-container">
                <div className="nav-pill-wrapper card-glass">
                    {domains.map(domain => (
                        <button
                            key={domain.id}
                            className={`pill-btn ${activeDomain.id === domain.id ? 'active' : ''}`}
                            onClick={() => setActiveDomain(domain)}
                        >
                            {domain.name}
                        </button>
                    ))}
                </div>

                <div className="timeframe-pill-wrapper card-glass">
                    {['all-time', 'monthly', 'weekly'].map(tf => (
                        <button
                            key={tf}
                            className={`pill-btn ${activeTimeframe === tf ? 'active' : ''}`}
                            onClick={() => setActiveTimeframe(tf)}
                        >
                            {tf === 'all-time' ? 'All Time' : tf.charAt(0).toUpperCase() + tf.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="leaderboard-loading">
                    <ListSkeleton items={8} />
                </div>
            ) : candidates.length === 0 ? (
                <div className="empty-spot card-glass">
                    <p>No candidates verified in this domain yet.</p>
                </div>
            ) : (
                <>
                    <Podium topCandidates={topThree} activeDomain={activeDomain} />

                    <div className="talent-grid-container card-glass">
                        <table className="talent-table">
                            <thead>
                                <tr>
                                    <th>RANK</th>
                                    <th>CANDIDATE</th>
                                    <th>LEVEL</th>
                                    <th>METRIC PROGRESS</th>
                                    <th className="text-right">SCORE</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">
                                    {restCandidates.map((candidate, index) => (
                                        <motion.tr
                                            key={candidate._id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            transition={{
                                                delay: index * 0.04,
                                                duration: 0.6,
                                                ease: [0.4, 0, 0.2, 1]
                                            }}
                                            className="talent-row"
                                        >
                                            <td className="rank-col">
                                                <span className="rank-number">{index + 4}</span>
                                            </td>
                                            <td className="candidate-col">
                                                <div className="profile-mini">
                                                    <div className="mini-avatar">
                                                        {candidate.profile?.photo ? (
                                                            <img src={candidate.profile.photo} alt="" />
                                                        ) : (
                                                            <span>{candidate.profile?.name?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="mini-info">
                                                        <span className="name">{candidate.profile?.name || 'Anonymous'}</span>
                                                        <span className="tagline">Verified Performance</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`atp-pill ${candidate.aiTalentPassport?.levelBand?.toLowerCase().replace(' ', '')}`}>
                                                    {candidate.aiTalentPassport?.levelBand || 'Level 1'}
                                                </span>
                                            </td>
                                            <td className="progress-col">
                                                <div className="metric-bar">
                                                    <motion.div
                                                        className="metric-fill"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${candidate.aiTalentPassport?.talentScore || 0}%` }}
                                                        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="text-right score-col">
                                                <span className="final-score">{candidate.aiTalentPassport?.talentScore || 0}%</span>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <div className="leaderboard-info-footer">
                <p>Calculated via 128+ neural parameters including technical output, behavioral consistency, and expert verification rounds.</p>
            </div>
        </div>
    );
};

export default LeaderboardPage;
