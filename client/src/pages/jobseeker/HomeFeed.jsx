import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import UserProfileLink from '../../components/UserProfileLink';
import TopCandidatesSidebar from '../../components/TopCandidatesSidebar';
import { CardSkeleton } from '../../components/Skeleton';
import FeedbackModal from '../../components/FeedbackModal';
import SparklineChart from '../../components/SparklineChart';
import './HomeFeed.css';

// SVG Icons Component
const Icons = {
    trophy: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9H4.5C3.67 9 3 8.33 3 7.5V4.5C3 3.67 3.67 3 4.5 3H6M18 9H19.5C20.33 9 21 8.33 21 7.5V4.5C21 3.67 20.33 3 19.5 3H18M6 3H18V10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10V3Z" />
            <path d="M12 16V21M8 21H16" />
        </svg>
    ),
    chart: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20V14" />
        </svg>
    ),
    check: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" />
            <path d="M22 4L12 14.01L9 11.01" />
        </svg>
    ),
    briefcase: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" />
        </svg>
    ),
    building: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21H21M5 21V7L13 3V21M19 21V11L13 7M9 9V9.01M9 13V13.01M9 17V17.01" />
        </svg>
    ),
    edit: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13" />
            <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" />
        </svg>
    ),
    star: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
    ),
    plus: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5V19M5 12H19" />
        </svg>
    ),
    upvote: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M12 4L3 15H9V20H15V15H21L12 4Z" />
        </svg>
    ),
    share: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12M16 6L12 2L8 6M12 2V15" />
        </svg>
    ),
    close: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6L18 18" />
        </svg>
    ),
    empty: (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
    ),
    arrow: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12H19M19 12L12 5M19 12L12 19" />
        </svg>
    ),
    passport: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 17C8 15.3431 9.79086 14 12 14C14.2091 14 16 15.3431 16 17" stroke="currentColor" strokeWidth="1.5" />
            <path d="M15 6H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    more: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
        </svg>
    ),
    trash: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
    ),
    pin: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    ),
    link: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
    )
};

const HomeFeed = () => {
    const toast = useToast();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('jobseeker');
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [quickStats, setQuickStats] = useState({ applications: 0, interviews: 0, profileViews: 0 });
    const [showAchievementModal, setShowAchievementModal] = useState(false);
    const [achievementForm, setAchievementForm] = useState({
        type: 'achievement',
        title: '',
        description: '',
        score: '',
        skills: []
    });
    const [skillInput, setSkillInput] = useState('');
    const [expandedATP, setExpandedATP] = useState(null); // Track which ATP post is expanded
    const [atpData, setAtpData] = useState({}); // Cache ATP data by userId
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [activePostMenu, setActivePostMenu] = useState(null); // ID of the post whose menu is open
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');



    // Define data fetching functions
    const fetchJobs = async () => {
        setJobsLoading(true);
        try {
            // Fetch latest active jobs regardless of domain for now
            const res = await api.get('/jobs?limit=5');
            setRecommendedJobs(res.data || []);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setJobsLoading(false);
        }
    };

    const fetchUser = async () => {
        try {
            if (userId) {
                const response = await api.get(`/users/${userId}`);
                const userData = response.data?.data || response.data;
                setUser(userData);
            }
            // fetchJobs(); // Called in separate effect to avoid double fetching or dependency issues
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/posts/feed?type=${activeTab}`);
            setActivities(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Error fetching activities:', error);
            setActivities([]);
        } finally {
            setLoading(false);
        }
    };



    // Fetch real stats from API
    const fetchQuickStats = async () => {
        try {
            if (!userId) return;

            // Fetch applications (jobs where user has applied)
            const applicationsRes = await api.get(`/users/${userId}/applications`);
            const applicationsData = applicationsRes.data?.data || applicationsRes.data || [];

            // Fetch interviews count
            const interviewsRes = await api.get(`/interviews/user/${userId}`);
            const interviewsData = interviewsRes.data || [];

            setQuickStats({
                applications: Array.isArray(applicationsData) ? applicationsData.length : 0,
                interviews: Array.isArray(interviewsData) ? interviewsData.filter(i => i.status === 'completed').length : 0,
                profileViews: user?.profileViews || 0
            });
        } catch (error) {
            console.error('Error fetching quick stats:', error);
        }
    };

    // Initial data fetch
    useEffect(() => {
        fetchUser();
        fetchJobs();
        fetchQuickStats();

        const handleUpdate = () => {
            fetchUser();
            fetchQuickStats();
        };
        window.addEventListener('profile-updated', handleUpdate);
        window.addEventListener('user-updated', handleUpdate);
        return () => {
            window.removeEventListener('profile-updated', handleUpdate);
            window.removeEventListener('user-updated', handleUpdate);
        };
    }, [userId]);

    // Fetch activities when tab or user changes
    useEffect(() => {
        if (user) {
            fetchActivities();
        }
    }, [activeTab, user]);

    const handleUpvote = async (postId) => {
        try {
            await api.post(`/posts/${postId}/like`, { userId });
            fetchActivities();
        } catch (error) {
            console.error('Error upvoting:', error);
        }
    };

    useEffect(() => {
        if (!userId) return;

        const handleScroll = () => {
            if (window.scrollY > 300) {
                setHasScrolled(true);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [userId]);

    const handleShare = async (postId) => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
            toast.success('Link copied to clipboard!');
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    const handleJoinChallenge = async (challengeId) => {
        try {
            await api.post(`/challenges/${challengeId}/join`, { userId });
            toast.success('Successfully joined the challenge!');
            // After joining, we might want to refresh only that card or the whole feed
            fetchActivities();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to join challenge');
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        try {
            await api.delete(`/posts/${postId}`);
            setActivities(activities.filter(a => a._id !== postId));
            toast.success('Post deleted');
            setActivePostMenu(null);
        } catch (error) {
            console.error('Error deleting post:', error);
            toast.error('Failed to delete post');
        }
    };

    const handlePinPost = async (postId) => {
        try {
            const res = await api.patch(`/posts/${postId}/pin`);
            const updatedPost = res.data?.data || res.data;
            setActivities(activities.map(a => a._id === postId ? { ...a, isPinned: updatedPost.isPinned } : a));
            toast.success(updatedPost.isPinned ? 'Post pinned to top' : 'Post unpinned');
            setActivePostMenu(null);
        } catch (error) {
            console.error('Error pinning post:', error);
            toast.error('Failed to update pin status');
        }
    };

    const handleCopyLink = async (postId) => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
            toast.success('Link copied to clipboard!');
            setActivePostMenu(null);
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (activePostMenu && !e.target.closest('.post-menu-container')) {
                setActivePostMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activePostMenu]);

    const addSkill = () => {
        if (skillInput.trim() && !achievementForm.skills.includes(skillInput.trim())) {
            setAchievementForm({
                ...achievementForm,
                skills: [...achievementForm.skills, skillInput.trim()]
            });
            setSkillInput('');
        }
    };

    const removeSkill = (skill) => {
        setAchievementForm({
            ...achievementForm,
            skills: achievementForm.skills.filter(s => s !== skill)
        });
    };

    const postAchievement = async () => {
        if (!achievementForm.title.trim()) {
            toast.error('Please enter a title');
            return;
        }

        try {
            if (achievementForm.type === 'challenge') {
                await api.post('/challenges', {
                    creatorId: userId,
                    title: achievementForm.title,
                    description: achievementForm.description,
                    domain: achievementForm.domain,
                    difficulty: 'Intermediate', // Default for now
                    requirements: achievementForm.skills
                });
                toast.success('Challenge created and posted!');
            } else {
                await api.post('/posts', {
                    userId,
                    postType: achievementForm.type,
                    content: {
                        text: achievementForm.description,
                        title: achievementForm.title,
                        score: achievementForm.score ? parseInt(achievementForm.score) : null,
                        skills: achievementForm.skills,
                        domain: achievementForm.domain
                    },
                    visibility: 'public'
                });
                toast.success('Achievement posted!');
            }

            setShowAchievementModal(false);
            setAchievementForm({
                type: 'achievement',
                title: '',
                description: '',
                score: '',
                skills: [],
                domain: 'Software Engineering'
            });
            fetchActivities();
        } catch (error) {
            console.error('Error posting:', error);
            toast.error('Failed to post');
        }
    };

    const postATP = async () => {
        try {
            await api.post('/posts', {
                userId,
                postType: 'atp',
                content: {
                    text: 'Check out my AI Talent Passport!',
                    atpReference: userId
                },
                visibility: 'public'
            });
            toast.success('ATP shared to your feed!');
            setShowAchievementModal(false);
            fetchActivities();
        } catch (error) {
            console.error('Error posting ATP:', error);
            toast.error('Failed to share ATP');
        }
    };

    const getTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(date).toLocaleDateString();
    };

    const getPostTypeInfo = (postType) => {
        switch (postType) {
            case 'achievement':
                return { icon: Icons.trophy, label: 'Achievement', className: 'type-achievement' };
            case 'atp':
                return { icon: Icons.chart, label: 'Talent Passport', className: 'type-atp' };
            case 'challenge':
                return { icon: Icons.star, label: 'Community Challenge', className: 'type-challenge' };
            case 'proof_of_work':
                return { icon: Icons.check, label: 'Proof of Work', className: 'type-proof' };
            case 'job_posting':
                return { icon: Icons.briefcase, label: 'Job Opportunity', className: 'type-job' };
            case 'company_update':
                return { icon: Icons.building, label: 'Company Update', className: 'type-company' };
            default:
                return { icon: Icons.edit, label: 'Update', className: 'type-text' };
        }
    };

    const renderActivityCard = (activity) => {
        const postType = activity.postType || 'text';
        const typeInfo = getPostTypeInfo(postType);

        const handleCardClick = (e) => {
            // Don't navigate if clicking on a button or link
            if (e.target.closest('button') || e.target.closest('a')) {
                return;
            }
            navigate(`/post/${activity._id}`);
        };

        return (
            <motion.div
                key={activity._id}
                className={`activity-card ${postType}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2 }}
                onClick={handleCardClick}
            >
                {/* Card Header */}
                <div className="activity-header">
                    <div className="activity-user">
                        <div
                            className="activity-avatar"
                            onClick={(e) => {
                                e.stopPropagation();
                                const userId = activity.userId?._id || activity.userId;
                                if (userId) navigate(`/profile/${userId}`);
                            }}
                            style={{ cursor: 'pointer' }}
                            title="View Profile"
                        >
                            {activity.userId?.profile?.photo ? (
                                <img src={activity.userId.profile.photo} alt="" />
                            ) : (
                                <div className="avatar-placeholder premium">
                                    {activity.userId?.profile?.name?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                        <div className="activity-user-info">
                            <UserProfileLink
                                userId={activity.userId?._id}
                                name={activity.userId?.profile?.name || 'Anonymous'}
                                showAvatar={false}
                            />
                            <span className={`activity-type-badge ${typeInfo.className}`}>
                                {typeInfo.icon}
                                <span>{typeInfo.label}</span>
                            </span>
                        </div>
                    </div>
                    <span className="activity-time">{getTimeAgo(activity.createdAt)}</span>

                    {/* Three-dot menu */}
                    <div className="post-menu-container">
                        <button
                            className="post-menu-trigger"
                            onClick={(e) => {
                                e.stopPropagation();
                                setActivePostMenu(activePostMenu === activity._id ? null : activity._id);
                            }}
                        >
                            {Icons.more}
                        </button>

                        {activePostMenu === activity._id && (
                            <div className="post-options-dropdown" onClick={(e) => e.stopPropagation()}>
                                {(activity.userId?._id === userId || activity.userId === userId) && (
                                    <button className="post-option delete" onClick={() => handleDeletePost(activity._id)}>
                                        {Icons.trash}
                                        <span>Delete Post</span>
                                    </button>
                                )}
                                <button className={`post-option ${activity.isPinned ? 'pinned' : ''}`} onClick={() => handlePinPost(activity._id)}>
                                    {Icons.pin}
                                    <span>{activity.isPinned ? 'Unpin Post' : 'Pin Post'}</span>
                                </button>
                                <button className="post-option" onClick={() => handleCopyLink(activity._id)}>
                                    {Icons.link}
                                    <span>Copy Link</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Card Content */}
                <div className="activity-content">
                    {activity.content?.title && (
                        <h3 className="activity-title">{activity.content.title}</h3>
                    )}
                    {activity.content?.text && (
                        <p className="activity-text">{activity.content.text}</p>
                    )}

                    {/* Score Circle for achievements */}
                    {activity.content?.score && (
                        <div className="score-display">
                            <div className="score-circle-container">
                                <svg className="score-ring" viewBox="0 0 100 100">
                                    <circle className="score-ring-bg" cx="50" cy="50" r="45" />
                                    <circle
                                        className="score-ring-progress"
                                        cx="50" cy="50" r="45"
                                        strokeDasharray={`${(activity.content.score / 100) * 283} 283`}
                                    />
                                </svg>
                                <span className="score-value">{activity.content.score}</span>
                            </div>
                            <span className="score-label">Performance Score</span>
                        </div>
                    )}

                    {/* Skills Tags */}
                    {activity.content?.skills?.length > 0 && (
                        <div className="activity-skills">
                            {activity.content.skills.map((skill, idx) => (
                                <span key={idx} className="skill-tag">{skill}</span>
                            ))}
                        </div>
                    )}

                    {/* ATP Preview (live data) */}
                    {postType === 'atp' && activity.content?.atpReference && (
                        <div className={`atp-preview ${expandedATP === activity._id ? 'expanded' : ''}`}>
                            <div className="atp-header">
                                <div className="atp-icon">
                                    {Icons.star}
                                </div>
                                <div>
                                    <h4>AI Talent Passport</h4>
                                    <p>Verified Skills & Credentials</p>
                                </div>
                            </div>

                            {/* Expanded ATP Details */}
                            <AnimatePresence>
                                {(() => {
                                    const atpKey = activity.userId?._id || activity.userId;
                                    const atpInfo = atpData[atpKey];
                                    if (expandedATP !== activity._id || !atpInfo) return null;
                                    return (
                                        <motion.div
                                            className="atp-details"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {/* Talent Score + Global Ranking */}
                                            <div className="atp-main-score">
                                                <div className="atp-score-ring">
                                                    <svg viewBox="0 0 100 100">
                                                        <circle className="atp-ring-bg" cx="50" cy="50" r="45" />
                                                        <circle
                                                            className="atp-ring-progress"
                                                            cx="50" cy="50" r="45"
                                                            strokeDasharray={`${(atpInfo.talentScore || 0) / 100 * 283} 283`}
                                                        />
                                                    </svg>
                                                    <div className="atp-score-text">
                                                        <span className="atp-score-num">{atpInfo.talentScore || 0}</span>
                                                        <span className="atp-score-max">/100</span>
                                                    </div>
                                                </div>
                                                <span className="atp-score-title">Talent Score</span>
                                            </div>

                                            <div className="atp-global-rank">
                                                <span className="rank-value">Top {Math.max(1, 100 - (atpInfo.globalPercentile || 0))}%</span>
                                                <span className="rank-label">Global Ranking</span>
                                            </div>

                                            {/* Core Competencies */}
                                            <div className="atp-competencies">
                                                <h5>Core Competencies</h5>
                                                <div className="atp-competencies-grid">
                                                    <div className="competency-item">
                                                        <span className="comp-score">{atpInfo.domainScore || 0}</span>
                                                        <span className="comp-label">Domain Expertise</span>
                                                    </div>
                                                    <div className="competency-item">
                                                        <span className="comp-score">{atpInfo.communicationScore || 0}</span>
                                                        <span className="comp-label">Communication</span>
                                                    </div>
                                                    <div className="competency-item">
                                                        <span className="comp-score">{atpInfo.problemSolvingScore || 0}</span>
                                                        <span className="comp-label">Problem Solving</span>
                                                    </div>
                                                    <div className="competency-item">
                                                        <span className="comp-score">{atpInfo.gdScore || 0}</span>
                                                        <span className="comp-label">Group Discussion</span>
                                                    </div>
                                                    <div className="competency-item">
                                                        <span className="comp-score">{atpInfo.professionalismScore || 0}</span>
                                                        <span className="comp-label">Professionalism</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reliability Metrics */}
                                            {atpInfo.reliability && (
                                                <div className="atp-reliability">
                                                    <h5>Reliability Metrics</h5>
                                                    <div className="reliability-grid">
                                                        <div className="reliability-item">
                                                            <span className="rel-value">{atpInfo.reliability?.punctuality || 0}%</span>
                                                            <span className="rel-label">Punctuality</span>
                                                        </div>
                                                        <div className="reliability-item">
                                                            <span className="rel-value">{atpInfo.reliability?.taskCompletionRate || 0}%</span>
                                                            <span className="rel-label">Task Completion</span>
                                                        </div>
                                                        <div className="reliability-item">
                                                            <span className="rel-value">{atpInfo.reliability?.responsiveness || 0}%</span>
                                                            <span className="rel-label">Responsiveness</span>
                                                        </div>
                                                        <div className="reliability-item">
                                                            <span className="rel-value">{atpInfo.reliability?.consistency || 0}%</span>
                                                            <span className="rel-label">Consistency</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })()}
                            </AnimatePresence>

                            <button
                                className="view-atp-btn"
                                onClick={async () => {
                                    if (expandedATP === activity._id) {
                                        setExpandedATP(null);
                                    } else {
                                        setExpandedATP(activity._id);
                                        const userIdKey = activity.userId?._id || activity.userId;
                                        // Use populated data first, then fetch if needed
                                        if (!atpData[userIdKey]) {
                                            // Try to use already populated data from activity.userId
                                            const passport = activity.userId?.aiTalentPassport;
                                            if (passport && passport.talentScore !== undefined) {
                                                setAtpData(prev => ({
                                                    ...prev,
                                                    [userIdKey]: {
                                                        talentScore: passport.talentScore || 0,
                                                        domainScore: passport.domainScore || 0,
                                                        communicationScore: passport.communicationScore || 0,
                                                        problemSolvingScore: passport.problemSolvingScore || 0,
                                                        gdScore: passport.gdScore || 0,
                                                        professionalismScore: passport.professionalismScore || 0,
                                                        globalPercentile: passport.globalPercentile || 0,
                                                        levelBand: passport.levelBand || 'Level 1',
                                                        reliability: passport.reliability || null
                                                    }
                                                }));
                                            } else {
                                                // Fallback: fetch from API
                                                try {
                                                    const res = await api.get(`/users/${userIdKey}`);
                                                    const userData = res.data?.data || res.data;
                                                    const fetchedPassport = userData?.aiTalentPassport;
                                                    if (fetchedPassport) {
                                                        setAtpData(prev => ({
                                                            ...prev,
                                                            [userIdKey]: {
                                                                talentScore: fetchedPassport.talentScore || 0,
                                                                domainScore: fetchedPassport.domainScore || 0,
                                                                communicationScore: fetchedPassport.communicationScore || 0,
                                                                problemSolvingScore: fetchedPassport.problemSolvingScore || 0,
                                                                gdScore: fetchedPassport.gdScore || 0,
                                                                professionalismScore: fetchedPassport.professionalismScore || 0,
                                                                globalPercentile: fetchedPassport.globalPercentile || 0,
                                                                levelBand: fetchedPassport.levelBand || 'Level 1',
                                                                reliability: fetchedPassport.reliability || null
                                                            }
                                                        }));
                                                    }
                                                } catch (err) {
                                                    console.error('Error fetching ATP:', err);
                                                }
                                            }
                                        }
                                    }
                                }}
                            >
                                {expandedATP === activity._id ? 'Hide Details' : 'View Full Passport'}
                                {Icons.arrow}
                            </button>
                        </div>
                    )}

                    {/* Job Posting Link */}
                    {postType === 'job_posting' && activity.content?.jobId && (
                        <a href={`/jobseeker/jobs?id=${activity.content.jobId}`} className="job-link-card">
                            <span>View Job Details</span>
                            {Icons.arrow}
                        </a>
                    )}

                    {/* Challenge Card Interaction */}
                    {postType === 'challenge' && activity.content?.challengeId && (
                        <div className="challenge-interaction-box">
                            <div className="challenge-meta">
                                <span className="challenge-domain-tag">{activity.content.domain}</span>
                                <span className="challenge-participants">
                                    {Icons.trophy}
                                    {activity.engagement?.likes?.length || 0} participants
                                </span>
                            </div>
                            <button
                                className="btn btn-primary join-challenge-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleJoinChallenge(activity.content.challengeId);
                                }}
                            >
                                Join Challenge
                            </button>
                        </div>
                    )}
                </div>

                {/* Card Actions */}
                <div className="activity-actions">
                    <motion.button
                        className="action-btn upvote"
                        onClick={() => handleUpvote(activity._id)}
                        whileTap={{ scale: 0.95 }}
                    >
                        {Icons.upvote}
                        <span>{activity.engagement?.likes?.length || 0}</span>
                    </motion.button>
                    <motion.button
                        className="action-btn share"
                        onClick={() => handleShare(activity._id)}
                        whileTap={{ scale: 0.95 }}
                    >
                        {Icons.share}
                    </motion.button>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="activity-feed">
            {/* Header */}
            <div className="activity-feed-header">
                <div className="header-title">
                    <h1>Community Hub</h1>
                    <p className="header-subtitle">Explore challenges, achievements, and opportunities</p>
                </div>
                <div className="header-actions">
                    <motion.button
                        className="btn btn-secondary create-challenge-btn"
                        onClick={() => {
                            setAchievementForm({ ...achievementForm, type: 'challenge' });
                            setShowAchievementModal(true);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {Icons.star}
                        Create Challenge
                    </motion.button>
                    <motion.button
                        className="btn btn-primary post-achievement-btn"
                        onClick={() => {
                            setAchievementForm({ ...achievementForm, type: 'achievement' });
                            setShowAchievementModal(true);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {Icons.plus}
                        {userRole === 'recruiter' ? 'Create Post' : 'Post Achievement'}
                    </motion.button>
                </div>
            </div>


            {/* Tabs */}
            <div className="activity-tabs">
                <button
                    className={`tab-btn ${activeTab === 'jobseeker' ? 'active' : ''}`}
                    onClick={() => setActiveTab('jobseeker')}
                >
                    Job Seeker Feed
                </button>
                <button
                    className={`tab-btn ${activeTab === 'recruiter' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recruiter')}
                >
                    Recruiter Feed
                </button>
                <div
                    className="tab-indicator"
                    style={{ transform: `translateX(${activeTab === 'recruiter' ? '100%' : '0'})` }}
                />
            </div>

            {/* Quick Stats Row */}
            <div className="quick-stats-row">
                <div className="quick-stat-card" onClick={() => navigate('/jobseeker/jobs?tab=applied')}>
                    <div className="quick-stat-icon applications">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                    </div>
                    <div className="quick-stat-content">
                        <span className="quick-stat-number">{quickStats.applications}</span>
                        <span className="quick-stat-label">Applications</span>
                    </div>
                </div>

                <div className="quick-stat-card" onClick={() => navigate('/jobseeker/interviews')}>
                    <div className="quick-stat-icon interviews">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="2" y="2" width="20" height="8" rx="2" />
                            <rect x="2" y="14" width="20" height="8" rx="2" />
                            <line x1="6" y1="6" x2="6" y2="6.01" />
                            <line x1="6" y1="18" x2="6" y2="18.01" />
                        </svg>
                    </div>
                    <div className="quick-stat-content">
                        <span className="quick-stat-number">{quickStats.interviews}</span>
                        <span className="quick-stat-label">Interviews</span>
                    </div>
                </div>

                <div className="quick-stat-card" onClick={() => navigate('/jobseeker/profile')}>
                    <div className="quick-stat-icon views">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </div>
                    <div className="quick-stat-content">
                        <span className="quick-stat-number">{quickStats.profileViews}</span>
                        <span className="quick-stat-label">Profile Views</span>
                    </div>
                </div>

                <div className="quick-stat-card highlighted" onClick={() => navigate('/jobseeker/profile?tab=talent-passport')}>
                    <div className="quick-stat-icon matches">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    </div>
                    <div className="quick-stat-content">
                        <span className="quick-stat-number">{user?.aiTalentPassport?.talentScore || 0}</span>
                        <span className="quick-stat-label">Talent Score</span>
                    </div>
                </div>
            </div>


            {/* Two Column Layout: Feed + Sidebar */}
            <div className="feed-layout">
                {/* Feed Content */}
                <div className="activity-content-area">
                    {loading ? (
                        <div className="loading-state skeleton-loading">
                            <CardSkeleton />
                            <CardSkeleton />
                            <CardSkeleton />
                        </div>
                    ) : activities.length === 0 ? (
                        <motion.div
                            className="empty-state"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="empty-icon">
                                {Icons.empty}
                            </div>
                            <h3>No Activity Yet</h3>
                            <p>
                                {activeTab === 'jobseeker'
                                    ? 'Be the first to share your achievements and showcase your skills!'
                                    : 'No recruiter posts yet. Check back later for company updates and job opportunities.'
                                }
                            </p>
                            {activeTab === 'jobseeker' && userRole !== 'recruiter' && (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowAchievementModal(true)}
                                >
                                    Post Your First Achievement
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="activities-list">
                            {activities.map(renderActivityCard)}
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <aside className="feed-sidebar">
                    <TopCandidatesSidebar jobDomains={user?.jobSeekerProfile?.jobDomains} />

                    {/* Recommended Jobs Card */}
                    <div className="sidebar-card recommended-jobs-card">
                        <div className="sidebar-card-header">
                            <div className="header-icon jobs-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                                </svg>
                            </div>
                            <h3>Latest Opportunities</h3>
                        </div>

                        <div className="recommended-jobs-list">
                            {jobsLoading ? (
                                <div className="jobs-loading-skeleton">
                                    {[1, 2, 3].map(i => <div key={i} className="job-skeleton-item" />)}
                                </div>
                            ) : recommendedJobs.length > 0 ? (
                                recommendedJobs.map((job) => (
                                    <div className="job-item-sidebar" onClick={() => navigate(`/jobseeker/jobs?id=${job._id}`)}>
                                        <div className="job-info-mini">
                                            <h4 className="job-title-mini">{job.title}</h4>
                                            <span className="job-type-mini">{job.jobDetails?.type || 'Full-time'}</span>
                                        </div>
                                        <div className="job-meta-mini">
                                            <span className="job-company-mini-secondary">
                                                {job.company?.name || job.recruiterId?.profile?.company || 'Top Company'}
                                            </span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M9 18l6-6-6-6" />
                                            </svg>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-jobs-state">
                                    <p>No new jobs posted yet.</p>
                                    <button className="btn-text-only" onClick={() => navigate('/jobseeker/jobs')}>Explore Jobs</button>
                                </div>
                            )}
                        </div>
                        {recommendedJobs.length > 0 && (
                            <button className="view-all-jobs-btn" onClick={() => navigate('/jobseeker/jobs')}>
                                View All Openings
                                {Icons.arrow}
                            </button>
                        )}
                    </div>

                    {/* Quick Profile Check Card */}
                    {user && (
                        <div className="sidebar-card quick-profile-card">
                            <div className="sidebar-card-header">
                                <div className="header-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                                <h3>Your Profile</h3>
                            </div>

                            {user?.aiTalentPassport?.talentScore ? (
                                <>
                                    <div className="profile-score-section">
                                        <div className="profile-score-ring">
                                            <svg viewBox="0 0 100 100">
                                                <circle className="profile-ring-bg" cx="50" cy="50" r="42" />
                                                <circle
                                                    className="profile-ring-progress"
                                                    cx="50" cy="50" r="42"
                                                    stroke={
                                                        user.aiTalentPassport.talentScore >= 80 ? '#10B981' :
                                                            user.aiTalentPassport.talentScore >= 60 ? '#6366F1' :
                                                                user.aiTalentPassport.talentScore >= 40 ? '#F59E0B' : '#EF4444'
                                                    }
                                                    strokeDasharray={`${(user.aiTalentPassport.talentScore / 100) * 264} 264`}
                                                />
                                            </svg>
                                            <div className="profile-score-text">
                                                <span className="profile-score-num">{user.aiTalentPassport.talentScore}</span>
                                                <span className="profile-score-label">Score</span>
                                            </div>
                                        </div>
                                        <div className="profile-details">
                                            <span className={`level-badge ${user.aiTalentPassport.talentScore >= 90 ? 'expert' :
                                                user.aiTalentPassport.talentScore >= 70 ? 'advanced' :
                                                    user.aiTalentPassport.talentScore >= 50 ? 'intermediate' : 'beginner'
                                                }`}>
                                                {user.aiTalentPassport.talentScore >= 90 ? '🏆 Expert' :
                                                    user.aiTalentPassport.talentScore >= 70 ? '⭐ Advanced' :
                                                        user.aiTalentPassport.talentScore >= 50 ? '📈 Intermediate' : '🌱 Beginner'}
                                            </span>
                                            <span className="global-rank">
                                                Global: <strong>Top {Math.max(1, 100 - (user.aiTalentPassport.globalPercentile || 0))}%</strong>
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        className="profile-cta"
                                        onClick={() => navigate(`/jobseeker/profile?tab=atp`)}
                                    >
                                        View Full Report
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </>
                            ) : (
                                <div className="no-score-state">
                                    <p>Complete an AI interview to get your talent score!</p>
                                    <button
                                        className="take-interview-btn-premium"
                                        onClick={() => navigate('/jobseeker/interviews')}
                                    >
                                        <div className="btn-content">
                                            <div className="btn-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                                                    <path d="M10 8l6 4-6 4V8z" />
                                                </svg>
                                            </div>
                                            <span>Take Interview Now</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </aside>
            </div>

            {/* Scroll and dwell time tracking for engagement-based feedback */}

            {showFeedback && (
                <FeedbackModal
                    featureId="home-feed"
                    onClose={() => setShowFeedback(false)}
                    userId={userId}
                />
            )}
            {/* Achievement Modal */}
            <AnimatePresence>
                {showAchievementModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAchievementModal(false)}
                    >
                        <motion.div
                            className="achievement-modal"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>{userRole === 'recruiter' ? 'Create Post' : 'Share Achievement'}</h2>
                                <button
                                    className="modal-close"
                                    onClick={() => setShowAchievementModal(false)}
                                >
                                    {Icons.close}
                                </button>
                            </div>

                            <div className="modal-body">
                                {/* Post Type Selection */}
                                <div className="post-type-selector">
                                    {userRole === 'recruiter' ? (
                                        <>
                                            <button
                                                className={`type-btn ${achievementForm.type === 'job_posting' ? 'active' : ''}`}
                                                onClick={() => setAchievementForm({ ...achievementForm, type: 'job_posting' })}
                                            >
                                                <span className="type-icon">{Icons.briefcase}</span>
                                                Job Posting
                                            </button>
                                            <button
                                                className={`type-btn ${achievementForm.type === 'company_update' ? 'active' : ''}`}
                                                onClick={() => setAchievementForm({ ...achievementForm, type: 'company_update' })}
                                            >
                                                <span className="type-icon">{Icons.building}</span>
                                                Company Update
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                className={`type-btn ${achievementForm.type === 'challenge' ? 'active' : ''}`}
                                                onClick={() => setAchievementForm({ ...achievementForm, type: 'challenge' })}
                                            >
                                                <span className="type-icon">{Icons.star}</span>
                                                Community Challenge
                                            </button>
                                            <button
                                                className={`type-btn ${achievementForm.type === 'achievement' ? 'active' : ''}`}
                                                onClick={() => setAchievementForm({ ...achievementForm, type: 'achievement' })}
                                            >
                                                <span className="type-icon">{Icons.trophy}</span>
                                                Achievement
                                            </button>
                                            <button
                                                className={`type-btn ${achievementForm.type === 'proof_of_work' ? 'active' : ''}`}
                                                onClick={() => setAchievementForm({ ...achievementForm, type: 'proof_of_work' })}
                                            >
                                                <span className="type-icon">{Icons.check}</span>
                                                Proof of Work
                                            </button>
                                            <button
                                                className={`type-btn ${achievementForm.type === 'atp' ? 'active' : ''}`}
                                                onClick={() => setAchievementForm({ ...achievementForm, type: 'atp' })}
                                            >
                                                <span className="type-icon">{Icons.chart}</span>
                                                Share ATP
                                            </button>
                                        </>
                                    )}
                                </div>

                                {achievementForm.type === 'atp' ? (
                                    <div className="atp-share-preview">
                                        <div className="atp-preview-card">
                                            <div className="atp-icon-large">
                                                {Icons.passport}
                                            </div>
                                            <h3>Share Your AI Talent Passport</h3>
                                            <p>Your ATP will be shared with live data - any updates to your profile will automatically reflect in this post.</p>
                                        </div>
                                        <button className="btn btn-primary full-width" onClick={postATP}>
                                            Share My ATP
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="form-group">
                                            <label>Title *</label>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="e.g., Completed Advanced React Certification"
                                                value={achievementForm.title}
                                                onChange={(e) => setAchievementForm({ ...achievementForm, title: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Domain</label>
                                            <select
                                                className="input"
                                                value={achievementForm.domain}
                                                onChange={(e) => setAchievementForm({ ...achievementForm, domain: e.target.value })}
                                            >
                                                {['Software Engineering', 'Marketing', 'Customer Support', 'Design', 'Data Science', 'HR'].map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Description</label>
                                            <textarea
                                                className="input"
                                                placeholder={achievementForm.type === 'challenge' ? "Describe the challenge and what participants need to do..." : "Tell others about your achievement..."}
                                                rows="3"
                                                value={achievementForm.description}

                                                onChange={(e) => setAchievementForm({ ...achievementForm, description: e.target.value })}
                                            />
                                        </div>

                                        {(achievementForm.type === 'achievement' || achievementForm.type === 'proof_of_work' || achievementForm.type === 'challenge') && (
                                            <>
                                                <div className="form-group">
                                                    <label>Score (optional)</label>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        placeholder="e.g., 92"
                                                        min="0"
                                                        max="100"
                                                        value={achievementForm.score}
                                                        onChange={(e) => setAchievementForm({ ...achievementForm, score: e.target.value })}
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label>Skills</label>
                                                    <div className="skill-input-row">
                                                        <input
                                                            type="text"
                                                            className="input"
                                                            placeholder="Add a skill..."
                                                            value={skillInput}
                                                            onChange={(e) => setSkillInput(e.target.value)}
                                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                                        />
                                                        <button className="btn btn-secondary" onClick={addSkill}>Add</button>
                                                    </div>
                                                    {achievementForm.skills.length > 0 && (
                                                        <div className="skills-list">
                                                            {achievementForm.skills.map((skill, idx) => (
                                                                <span key={idx} className="skill-chip">
                                                                    {skill}
                                                                    <button onClick={() => removeSkill(skill)}>×</button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        <button className="btn btn-primary full-width" onClick={postAchievement}>
                                            Post {achievementForm.type === 'achievement' ? 'Achievement' :
                                                achievementForm.type === 'challenge' ? 'Challenge' :
                                                    achievementForm.type === 'job_posting' ? 'Job' : 'Update'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HomeFeed;
