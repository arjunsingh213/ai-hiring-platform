import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import UserProfileLink from '../../components/UserProfileLink';
import CommentInput from '../../components/CommentInput';
import { CardSkeleton } from '../../components/Skeleton';
import '../jobseeker/HomeFeed.css';

// SVG Icons
const Icons = {
    briefcase: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" />
        </svg>
    ),
    users: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" />
            <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" />
        </svg>
    ),
    calendar: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2V6M8 2V6M3 10H21" />
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
    comment: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" />
        </svg>
    ),
    share: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12M16 6L12 2L8 6M12 2V15" />
        </svg>
    ),
    photo: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <path d="M21 15L16 10L5 21" />
        </svg>
    ),
    video: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7L16 12L23 17V7Z" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
    ),
    document: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
            <path d="M14 2V8H20" />
        </svg>
    ),
    empty: (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" />
        </svg>
    ),
    arrow: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
    ),
    star: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
    ),
    chart: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20V14" />
        </svg>
    )
};

const RecruiterHome = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [posts, setPosts] = useState([]);
    const [postContent, setPostContent] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [postsLoading, setPostsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [commentingPostId, setCommentingPostId] = useState(null);
    const [expandedATP, setExpandedATP] = useState(null);
    const [atpData, setAtpData] = useState({});
    const [stats, setStats] = useState({
        activeJobs: 0,
        totalApplicants: 0,
        interviewsScheduled: 0
    });

    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = storedUser._id || storedUser.id || localStorage.getItem('userId');

    useEffect(() => {
        fetchPosts();
        fetchStats();
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            if (userId) {
                const response = await api.get(`/users/${userId}`);
                setUser(response.data?.data || response.data);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    const fetchPosts = async () => {
        setPostsLoading(true);
        try {
            const response = await api.get('/posts/feed');
            setPosts(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Error fetching posts:', error);
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            if (!userId) return;
            const jobsResponse = await api.get(`/jobs/recruiter/${userId}`);
            const jobs = Array.isArray(jobsResponse?.data) ? jobsResponse.data :
                Array.isArray(jobsResponse) ? jobsResponse : [];

            let totalApplicants = 0;
            jobs.forEach(job => {
                totalApplicants += (job.applicants?.length || 0);
            });

            setStats({
                activeJobs: jobs.filter(j => j.status === 'active').length || jobs.length,
                totalApplicants,
                interviewsScheduled: 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleMediaSelect = (type) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (type === 'photo') input.accept = 'image/*';
        else if (type === 'video') input.accept = 'video/*';
        else if (type === 'document') input.accept = '.pdf,.doc,.docx,.txt';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                setMediaFile(file);
                setMediaType(type);
                if (type === 'photo' || type === 'video') {
                    const reader = new FileReader();
                    reader.onload = (e) => setMediaPreview(e.target.result);
                    reader.readAsDataURL(file);
                } else {
                    setMediaPreview(file.name);
                }
            }
        };
        input.click();
    };

    const removeMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setMediaType(null);
    };

    const createPost = async () => {
        if (!postContent.trim() && !mediaFile) return;
        setLoading(true);
        try {
            if (mediaFile) {
                const formData = new FormData();
                formData.append('userId', userId);
                formData.append('text', postContent);
                formData.append('media', mediaFile);
                formData.append('postType', 'media');
                formData.append('visibility', 'public');
                await api.post('/posts/with-media', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/posts', {
                    userId,
                    content: { text: postContent },
                    postType: 'text',
                    visibility: 'public'
                });
            }
            setPostContent('');
            removeMedia();
            fetchPosts();
            toast.success('Post created!');
        } catch (error) {
            console.error('Error creating post:', error);
            toast.error('Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (postId) => {
        try {
            await api.post(`/posts/${postId}/like`, { userId });
            fetchPosts();
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleShare = async (postId) => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
            toast.success('Link copied to clipboard!');
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    const handleCommentSubmit = async (postId, comment) => {
        try {
            await api.post(`/posts/${postId}/comment`, { userId, text: comment });
            setCommentingPostId(null);
            fetchPosts();
            toast.success('Comment posted!');
        } catch (error) {
            console.error('Error commenting:', error);
            toast.error('Failed to post comment');
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
            case 'atp':
                return { icon: Icons.chart, label: 'Talent Passport', className: 'type-atp' };
            case 'job_posting':
                return { icon: Icons.briefcase, label: 'Job Opportunity', className: 'type-job' };
            default:
                return { icon: Icons.briefcase, label: 'Update', className: 'type-text' };
        }
    };

    const renderPostCard = (post) => {
        const postType = post.postType || 'text';
        const typeInfo = getPostTypeInfo(postType);

        return (
            <motion.div
                key={post._id}
                className={`activity-card ${postType}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2 }}
            >
                <div className="activity-header">
                    <div className="activity-user">
                        <div className="activity-avatar">
                            {post.userId?.profile?.photo ? (
                                <img src={post.userId.profile.photo} alt="" />
                            ) : (
                                <div className="avatar-placeholder">
                                    {post.userId?.profile?.name?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                        <div className="activity-user-info">
                            <UserProfileLink
                                userId={post.userId?._id}
                                name={post.userId?.profile?.name || 'Anonymous'}
                                showAvatar={false}
                            />
                            <span className={`activity-type-badge ${typeInfo.className}`}>
                                {typeInfo.icon}
                                <span>{typeInfo.label}</span>
                            </span>
                        </div>
                    </div>
                    <span className="activity-time">{getTimeAgo(post.createdAt)}</span>
                </div>

                <div className="activity-content">
                    {post.content?.text && (
                        <p className="activity-text">{post.content.text}</p>
                    )}
                    {post.content?.media?.length > 0 && (
                        <div className="post-media">
                            {post.content.media.map((media, idx) => (
                                <div key={idx} className="media-item">
                                    {media.type === 'image' && (
                                        <img
                                            src={media.url || `http://localhost:5000/uploads/posts/${media.fileId}`}
                                            alt=""
                                            className="post-image"
                                        />
                                    )}
                                    {media.type === 'video' && (
                                        <video controls className="post-video">
                                            <source src={media.url || `http://localhost:5000/uploads/posts/${media.fileId}`} />
                                        </video>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ATP Preview Card */}
                    {postType === 'atp' && post.content?.atpReference && (
                        <div className={`atp-preview ${expandedATP === post._id ? 'expanded' : ''}`}>
                            <div className="atp-header">
                                <div className="atp-icon">
                                    {Icons.star}
                                </div>
                                <div>
                                    <h4>AI Talent Passport</h4>
                                    <p>Verified Skills & Credentials</p>
                                </div>
                            </div>

                            <AnimatePresence>
                                {(() => {
                                    const atpKey = post.userId?._id || post.userId;
                                    const atpInfo = atpData[atpKey];
                                    if (expandedATP !== post._id || !atpInfo) return null;
                                    return (
                                        <motion.div
                                            className="atp-details"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
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
                                        </motion.div>
                                    );
                                })()}
                            </AnimatePresence>

                            <button
                                className="view-atp-btn"
                                onClick={async () => {
                                    if (expandedATP === post._id) {
                                        setExpandedATP(null);
                                    } else {
                                        setExpandedATP(post._id);
                                        const userIdKey = post.userId?._id || post.userId;
                                        if (!atpData[userIdKey]) {
                                            const passport = post.userId?.aiTalentPassport;
                                            if (passport && passport.talentScore !== undefined) {
                                                setAtpData(prev => ({
                                                    ...prev,
                                                    [userIdKey]: {
                                                        talentScore: passport.talentScore || 0,
                                                        globalPercentile: passport.globalPercentile || 0
                                                    }
                                                }));
                                            } else {
                                                try {
                                                    const res = await api.get(`/users/${userIdKey}`);
                                                    const userData = res.data?.data || res.data;
                                                    const fetchedPassport = userData?.aiTalentPassport;
                                                    if (fetchedPassport) {
                                                        setAtpData(prev => ({
                                                            ...prev,
                                                            [userIdKey]: {
                                                                talentScore: fetchedPassport.talentScore || 0,
                                                                globalPercentile: fetchedPassport.globalPercentile || 0
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
                                {expandedATP === post._id ? 'Hide Details' : 'View Full Passport'}
                                {Icons.arrow}
                            </button>
                        </div>
                    )}
                </div>

                <div className="activity-actions">
                    <motion.button
                        className="action-btn upvote"
                        onClick={() => handleLike(post._id)}
                        whileTap={{ scale: 0.95 }}
                    >
                        {Icons.upvote}
                        <span>{post.engagement?.likes?.length || 0}</span>
                    </motion.button>
                    <motion.button
                        className="action-btn"
                        onClick={() => setCommentingPostId(commentingPostId === post._id ? null : post._id)}
                        whileTap={{ scale: 0.95 }}
                    >
                        {Icons.comment}
                        <span>{post.engagement?.comments?.length || 0}</span>
                    </motion.button>
                    <motion.button
                        className="action-btn share"
                        onClick={() => handleShare(post._id)}
                        whileTap={{ scale: 0.95 }}
                    >
                        {Icons.share}
                    </motion.button>
                </div>

                <CommentInput
                    postId={post._id}
                    isOpen={commentingPostId === post._id}
                    onSubmit={(comment) => handleCommentSubmit(post._id, comment)}
                    onCancel={() => setCommentingPostId(null)}
                />
            </motion.div>
        );
    };

    return (
        <div className="activity-feed">
            {/* Header */}
            <div className="activity-feed-header">
                <h1>Your Activity</h1>
                <motion.button
                    className="btn btn-primary post-achievement-btn"
                    onClick={() => navigate('/recruiter/post-job')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {Icons.plus}
                    Post a Job
                </motion.button>
            </div>

            {/* Two Column Layout */}
            <div className="feed-layout">
                {/* Main Feed */}
                <div className="activity-content-area">
                    {/* Post Creator Card */}
                    <div className="post-creator-card">
                        <div className="creator-top">
                            <div className="creator-avatar">
                                {user?.profile?.photo ? (
                                    <img src={user.profile.photo} alt="" />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {user?.profile?.name?.charAt(0) || 'R'}
                                    </div>
                                )}
                            </div>
                            <textarea
                                className="creator-input"
                                placeholder="Share an update, job opportunity, or industry insight..."
                                value={postContent}
                                onChange={(e) => setPostContent(e.target.value)}
                                rows="3"
                            />
                        </div>

                        {mediaPreview && (
                            <div className="creator-media-preview">
                                {mediaType === 'photo' && <img src={mediaPreview} alt="Preview" />}
                                {mediaType === 'video' && <video src={mediaPreview} controls />}
                                {mediaType === 'document' && (
                                    <div className="document-preview">{Icons.document} {mediaPreview}</div>
                                )}
                                <button className="remove-media-btn" onClick={removeMedia}>Remove</button>
                            </div>
                        )}

                        <div className="creator-actions">
                            <div className="action-buttons">
                                <button className="creator-action" onClick={() => handleMediaSelect('photo')}>
                                    {Icons.photo} Photo
                                </button>
                                <button className="creator-action" onClick={() => handleMediaSelect('video')}>
                                    {Icons.video} Video
                                </button>
                                <button className="creator-action" onClick={() => handleMediaSelect('document')}>
                                    {Icons.document} Document
                                </button>
                                <button className="creator-action" onClick={() => navigate('/recruiter/post-job')}>
                                    {Icons.briefcase} Job Post
                                </button>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={createPost}
                                disabled={loading || (!postContent.trim() && !mediaFile)}
                            >
                                {loading ? 'Posting...' : 'Post'}
                            </button>
                        </div>
                    </div>

                    {/* Posts Feed */}
                    {postsLoading ? (
                        <div className="loading-state skeleton-loading">
                            <CardSkeleton />
                            <CardSkeleton />
                            <CardSkeleton />
                        </div>
                    ) : posts.length === 0 ? (
                        <motion.div
                            className="empty-state"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="empty-icon">{Icons.empty}</div>
                            <h3>No Posts Yet</h3>
                            <p>Be the first to share updates and job opportunities!</p>
                            <button className="btn btn-primary" onClick={() => navigate('/recruiter/post-job')}>
                                Post Your First Job
                            </button>
                        </motion.div>
                    ) : (
                        <div className="activities-list">
                            {posts.map(renderPostCard)}
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <aside className="feed-sidebar">
                    {/* Quick Stats Card */}
                    <div className="sidebar-card">
                        <div className="sidebar-card-header">
                            <div className="header-icon">{Icons.briefcase}</div>
                            <h3>Quick Stats</h3>
                        </div>
                        <div className="stats-grid">
                            <div
                                className="stat-item clickable"
                                onClick={() => navigate('/recruiter/my-jobs')}
                            >
                                <span className="stat-number primary">{stats.activeJobs}</span>
                                <span className="stat-label">Active Jobs</span>
                            </div>
                            <div
                                className="stat-item clickable"
                                onClick={() => navigate('/recruiter/talent-pipeline')}
                            >
                                <span className="stat-number accent">{stats.totalApplicants}</span>
                                <span className="stat-label">Applicants</span>
                            </div>
                            <div
                                className="stat-item clickable"
                                onClick={() => navigate('/recruiter/talent-pipeline')}
                            >
                                <span className="stat-number success">{stats.interviewsScheduled}</span>
                                <span className="stat-label">Interviews</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="sidebar-card">
                        <div className="sidebar-card-header">
                            <div className="header-icon">{Icons.plus}</div>
                            <h3>Quick Actions</h3>
                        </div>
                        <div className="quick-actions-list">
                            <button
                                className="quick-action-btn"
                                onClick={() => navigate('/recruiter/post-job')}
                            >
                                {Icons.briefcase}
                                <span>Post New Job</span>
                                {Icons.arrow}
                            </button>
                            <button
                                className="quick-action-btn"
                                onClick={() => navigate('/recruiter/talent-pipeline')}
                            >
                                {Icons.users}
                                <span>View Pipeline</span>
                                {Icons.arrow}
                            </button>
                            <button
                                className="quick-action-btn"
                                onClick={() => navigate('/recruiter/my-jobs')}
                            >
                                {Icons.calendar}
                                <span>Manage Jobs</span>
                                {Icons.arrow}
                            </button>
                        </div>
                    </div>

                    {/* Company Profile */}
                    {user && (
                        <div className="sidebar-card">
                            <div className="sidebar-card-header">
                                <div className="header-icon">{Icons.users}</div>
                                <h3>Your Profile</h3>
                            </div>
                            <div className="company-info">
                                <p className="company-name">{user.recruiterProfile?.companyName || 'Company'}</p>
                                <p className="company-domain">{user.recruiterProfile?.companyDomain}</p>
                            </div>
                            <a href={`/profile/${userId}`} className="profile-cta">
                                View Profile
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </a>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default RecruiterHome;
