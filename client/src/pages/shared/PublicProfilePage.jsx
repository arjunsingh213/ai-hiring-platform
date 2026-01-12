import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import FollowButton from '../../components/FollowButton';
import UserProfileLink from '../../components/UserProfileLink';
import './PublicProfilePage.css';
import './PublicProfileDarkFix.css';

// Icons
const Icons = {
    verified: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 12L11 14L15 10M12 3L14.5 5.5H18.5V9.5L21 12L18.5 14.5V18.5H14.5L12 21L9.5 18.5H5.5V14.5L3 12L5.5 9.5V5.5H9.5L12 3Z" fill="#6366F1" stroke="#6366F1" strokeWidth="2" />
        </svg>
    ),
    location: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.03 7.03 1 12 1S21 5.03 21 10Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    ),
    building: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21H21M5 21V7L13 3V21M19 21V11L13 7M9 9V9.01M9 13V13.01M9 17V17.01" />
        </svg>
    ),
    users: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21V19C23 17.14 21.73 15.57 20 15.13M16 3.13C17.73 3.57 19 5.14 19 7S17.73 10.43 16 10.87" />
        </svg>
    ),
    globe: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12H22M12 2C14.5 4.74 16 8.29 16 12S14.5 19.26 12 22C9.5 19.26 8 15.71 8 12S9.5 4.74 12 2Z" />
        </svg>
    ),
    briefcase: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5C16 3.9 15.1 3 14 3H10C8.9 3 8 3.9 8 5V7" />
        </svg>
    ),
    star: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
    ),
    edit: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13" />
            <path d="M18.5 2.5C18.9 2.1 19.44 1.88 20 1.88C20.56 1.88 21.1 2.1 21.5 2.5C21.9 2.9 22.12 3.44 22.12 4C22.12 4.56 21.9 5.1 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" />
        </svg>
    ),
    message: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" />
        </svg>
    ),
    calendar: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2V6M8 2V6M3 10H21" />
        </svg>
    ),
    link: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H11" />
            <path d="M15 3H21V9M10 14L21 3" />
        </svg>
    ),
    heart: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61C19.8 3.58 18.41 3 16.95 3C15.49 3 14.1 3.58 13.06 4.61L12 5.67L10.94 4.61C8.85 2.52 5.47 2.52 3.38 4.61C1.29 6.7 1.29 10.08 3.38 12.17L12 20.79L20.62 12.17C21.65 11.14 22.23 9.75 22.23 8.29C22.23 6.83 21.65 5.44 20.84 4.61Z" />
        </svg>
    ),
    comment: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5C21.02 12.85 20.67 14.18 19.99 15.35C19.18 16.78 17.96 17.93 16.49 18.66C15.01 19.39 13.35 19.68 11.7 19.5C10.49 19.36 9.33 18.95 8.3 18.31L3 20L4.69 14.7C4.05 13.67 3.64 12.51 3.5 11.3C3.32 9.65 3.61 7.99 4.34 6.51C5.07 5.04 6.22 3.82 7.65 3.01C8.82 2.33 10.15 1.98 11.5 2H12C14.28 2.12 16.44 3.09 18.03 4.68C19.62 6.27 20.59 8.43 20.71 10.71L21 11.5Z" />
        </svg>
    ),
    share: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12V20C4 20.53 4.21 21.04 4.59 21.41C4.96 21.79 5.47 22 6 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V12M16 6L12 2L8 6M12 2V15" />
        </svg>
    ),
    chart: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20V14" />
        </svg>
    )
};

const PublicProfilePage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const [mutualConnections, setMutualConnections] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const currentUserId = localStorage.getItem('userId');
    const isOwnProfile = userId === currentUserId;

    useEffect(() => {
        fetchProfile();
        fetchStats();
        fetchPosts();
        if (currentUserId && !isOwnProfile) {
            fetchMutualConnections();
        }
    }, [userId]);

    const fetchProfile = async () => {
        try {
            const response = await api.get(`/profiles/${userId}?currentUserId=${currentUserId || ''}`);
            setUser(response.user);
            setIsFollowing(response.isFollowing || false);
            if (response.user?.role === 'recruiter') {
                fetchRecruiterJobs();
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecruiterJobs = async () => {
        try {
            const response = await api.get(`/jobs/recruiter/${userId}`);
            const jobsData = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
            setJobs(jobsData);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get(`/profiles/${userId}/stats`);
            setStats(response || { followers: 0, following: 0, posts: 0 });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchPosts = async () => {
        try {
            const response = await api.get(`/profiles/${userId}/posts`);
            setPosts(Array.isArray(response.posts) ? response.posts : []);
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    };

    const fetchMutualConnections = async () => {
        try {
            const response = await api.get(`/profiles/${userId}/mutual-connections?currentUserId=${currentUserId}`);
            setMutualConnections(Array.isArray(response.mutualConnections) ? response.mutualConnections : []);
        } catch (error) {
            console.error('Error fetching mutual connections:', error);
        }
    };

    const handleMessage = () => {
        const userRole = localStorage.getItem('userRole');
        const messagePath = userRole === 'recruiter' ? '/recruiter/messages' : '/jobseeker/messages';
        navigate(messagePath, { state: { selectedUser: user } });
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

    if (loading) {
        return (
            <div className="profile-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="profile-error">
                <h2>Profile not found</h2>
                <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
            </div>
        );
    }

    const isRecruiter = user.role === 'recruiter';
    const isJobSeeker = user.role === 'jobseeker';
    const displayName = user.profile?.name || 'User';
    const companyName = user.recruiterProfile?.companyName;
    const industry = user.recruiterProfile?.companyDomain || 'Technology';
    const location = user.profile?.location;
    const activeJobs = jobs.filter(j => j.status === 'active');
    const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicants?.length || 0), 0);

    return (
        <div className="profile-page">
            {/* Header Card */}
            <motion.div
                className="profile-header-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="profile-banner"></div>

                <div className="profile-header-body">
                    <div className="profile-avatar-section">
                        <div className="profile-avatar">
                            {user.profile?.photo ? (
                                <img src={user.profile.photo} alt={displayName} />
                            ) : (
                                <span>{displayName.charAt(0)}</span>
                            )}
                        </div>
                    </div>

                    <div className="profile-info-section">
                        <div className="profile-name-block">
                            <h1>{displayName}</h1>
                            {isRecruiter && <span className="badge recruiter">{Icons.building} Recruiter</span>}
                            {isJobSeeker && user.aiTalentPassport?.talentScore > 0 && (
                                <span className="badge talent">{Icons.star} {user.aiTalentPassport.talentScore} ATP</span>
                            )}
                        </div>

                        {isRecruiter && companyName && (
                            <p className="profile-company">
                                {Icons.building} <strong>{companyName}</strong>
                                {industry && <span className="divider">•</span>}
                                {industry && <span>{industry}</span>}
                            </p>
                        )}

                        {user.profile?.headline && (
                            <p className="profile-headline">{user.profile.headline}</p>
                        )}

                        <div className="profile-meta">
                            {location && (
                                <span className="meta-tag">{Icons.location} {location}</span>
                            )}
                            {user.createdAt && (
                                <span className="meta-tag">
                                    {Icons.calendar} Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </span>
                            )}
                            {isRecruiter && user.recruiterProfile?.companyWebsite && (
                                <a href={user.recruiterProfile.companyWebsite} target="_blank" rel="noopener noreferrer" className="meta-tag link">
                                    {Icons.globe} Website
                                </a>
                            )}
                        </div>

                        {mutualConnections.length > 0 && (
                            <div className="mutual-badge">
                                <div className="mutual-avatars">
                                    {mutualConnections.slice(0, 3).map((c, i) => (
                                        <div key={i} className="mutual-avatar">
                                            {c.profile?.photo ? <img src={c.profile.photo} alt="" /> : <span>{c.profile?.name?.charAt(0)}</span>}
                                        </div>
                                    ))}
                                </div>
                                <span>{mutualConnections.length} mutual connection{mutualConnections.length > 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>

                    <div className="profile-actions-section">
                        {!isOwnProfile ? (
                            <>
                                <FollowButton userId={userId} initialIsFollowing={isFollowing} onFollowChange={setIsFollowing} />
                                <button className="btn btn-secondary" onClick={handleMessage}>
                                    {Icons.message} Message
                                </button>
                            </>
                        ) : (
                            <button className="btn btn-primary" onClick={() => navigate(isRecruiter ? '/recruiter/profile' : '/jobseeker/profile')}>
                                {Icons.edit} Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Stats Row */}
            <div className="stats-row">
                <div className="stat-box">
                    <div className="stat-icon">{Icons.chart}</div>
                    <div className="stat-content">
                        <span className="stat-number">{stats.posts}</span>
                        <span className="stat-label">Posts</span>
                    </div>
                </div>
                <div className="stat-box">
                    <div className="stat-icon">{Icons.users}</div>
                    <div className="stat-content">
                        <span className="stat-number">{stats.followers}</span>
                        <span className="stat-label">Followers</span>
                    </div>
                </div>
                <div className="stat-box">
                    <div className="stat-icon">{Icons.heart}</div>
                    <div className="stat-content">
                        <span className="stat-number">{stats.following}</span>
                        <span className="stat-label">Following</span>
                    </div>
                </div>
                {isRecruiter && (
                    <div className="stat-box highlight">
                        <div className="stat-icon">{Icons.briefcase}</div>
                        <div className="stat-content">
                            <span className="stat-number">{activeJobs.length}</span>
                            <span className="stat-label">Active Jobs</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="profile-tabs">
                {['overview', 'posts', ...(isRecruiter ? ['jobs'] : []), 'about'].map(tab => (
                    <button
                        key={tab}
                        className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="profile-content-area">
                <div className="content-main">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <>
                                    {/* About Card */}
                                    <div className="content-card">
                                        <h3>About</h3>
                                        <p className="about-text">
                                            {user.profile?.bio || `${displayName} hasn't added a bio yet.`}
                                        </p>
                                    </div>

                                    {/* Recruiter Info */}
                                    {isRecruiter && (
                                        <div className="content-card">
                                            <h3>Company Information</h3>
                                            <div className="info-grid">
                                                <div className="info-item">
                                                    <span className="info-icon">{Icons.building}</span>
                                                    <div>
                                                        <span className="info-label">Company</span>
                                                        <span className="info-value">{companyName || 'Not specified'}</span>
                                                    </div>
                                                </div>
                                                <div className="info-item">
                                                    <span className="info-icon">{Icons.chart}</span>
                                                    <div>
                                                        <span className="info-label">Industry</span>
                                                        <span className="info-value">{industry}</span>
                                                    </div>
                                                </div>
                                                {user.recruiterProfile?.position && (
                                                    <div className="info-item">
                                                        <span className="info-icon">{Icons.briefcase}</span>
                                                        <div>
                                                            <span className="info-label">Position</span>
                                                            <span className="info-value">{user.recruiterProfile.position}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="info-item">
                                                    <span className="info-icon">{Icons.users}</span>
                                                    <div>
                                                        <span className="info-label">Hiring Activity</span>
                                                        <span className="info-value">{totalApplicants} applicants across {jobs.length} jobs</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Job Seeker Skills */}
                                    {isJobSeeker && user.jobSeekerProfile?.skills?.length > 0 && (
                                        <div className="content-card">
                                            <h3>Skills</h3>
                                            <div className="skills-grid">
                                                {user.jobSeekerProfile.skills.map((skill, idx) => (
                                                    <span key={idx} className="skill-chip">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent Posts */}
                                    {posts.length > 0 && (
                                        <div className="content-card">
                                            <div className="card-header">
                                                <h3>Recent Posts</h3>
                                                <button className="link-btn" onClick={() => setActiveTab('posts')}>See All</button>
                                            </div>
                                            <div className="posts-preview">
                                                {posts.slice(0, 2).map(post => (
                                                    <div key={post._id} className="post-preview-item">
                                                        <p>{post.content?.text?.substring(0, 120)}{post.content?.text?.length > 120 ? '...' : ''}</p>
                                                        <span className="post-time">{getTimeAgo(post.createdAt)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Active Jobs Preview */}
                                    {isRecruiter && activeJobs.length > 0 && (
                                        <div className="content-card">
                                            <div className="card-header">
                                                <h3>Open Positions</h3>
                                                <button className="link-btn" onClick={() => setActiveTab('jobs')}>See All</button>
                                            </div>
                                            <div className="jobs-preview">
                                                {activeJobs.slice(0, 3).map(job => (
                                                    <div key={job._id} className="job-preview-item">
                                                        <div className="job-icon">{Icons.briefcase}</div>
                                                        <div className="job-details">
                                                            <h4>{job.title}</h4>
                                                            <p>{job.location || 'Remote'} • {job.employmentType || 'Full-time'}</p>
                                                        </div>
                                                        <span className="job-applicants">{job.applicants?.length || 0} applicants</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Posts Tab */}
                            {activeTab === 'posts' && (
                                <div className="content-card">
                                    <h3>All Posts ({posts.length})</h3>
                                    {posts.length === 0 ? (
                                        <p className="empty-text">No posts yet</p>
                                    ) : (
                                        <div className="posts-list">
                                            {posts.map(post => (
                                                <div key={post._id} className="post-full-item">
                                                    <div className="post-header">
                                                        <div className="post-author-avatar">
                                                            {user.profile?.photo ? <img src={user.profile.photo} alt="" /> : <span>{displayName.charAt(0)}</span>}
                                                        </div>
                                                        <div className="post-author-info">
                                                            <span className="author-name">{displayName}</span>
                                                            <span className="post-time">{getTimeAgo(post.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                    <p className="post-text">{post.content?.text}</p>
                                                    {post.content?.media?.length > 0 && (
                                                        <div className="post-media">
                                                            {post.content.media.map((m, i) => m.type === 'image' && <img key={i} src={m.url} alt="" />)}
                                                        </div>
                                                    )}
                                                    <div className="post-stats">
                                                        <span>{Icons.heart} {post.engagement?.likes?.length || 0}</span>
                                                        <span>{Icons.comment} {post.engagement?.comments?.length || 0}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Jobs Tab */}
                            {activeTab === 'jobs' && isRecruiter && (
                                <div className="content-card">
                                    <h3>Open Positions ({activeJobs.length})</h3>
                                    {activeJobs.length === 0 ? (
                                        <p className="empty-text">No open positions</p>
                                    ) : (
                                        <div className="jobs-list">
                                            {activeJobs.map(job => (
                                                <div key={job._id} className="job-full-item">
                                                    <div className="job-logo">{companyName?.charAt(0) || 'C'}</div>
                                                    <div className="job-content">
                                                        <h4>{job.title}</h4>
                                                        <p className="job-company-name">{companyName}</p>
                                                        <p className="job-meta">{job.location || 'Remote'} • {job.employmentType || 'Full-time'}</p>
                                                        <div className="job-footer">
                                                            <span>{job.applicants?.length || 0} applicants</span>
                                                            <span>Posted {getTimeAgo(job.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                    <button className="btn btn-sm btn-primary" onClick={() => navigate(`/jobseeker/jobs?id=${job._id}`)}>
                                                        View
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* About Tab */}
                            {activeTab === 'about' && (
                                <div className="content-card">
                                    <h3>About {displayName}</h3>
                                    <p className="about-text">{user.profile?.bio || 'No bio provided.'}</p>

                                    {isRecruiter && user.recruiterProfile && (
                                        <div className="about-section">
                                            <h4>Company Details</h4>
                                            <div className="detail-grid">
                                                <div className="detail-item">
                                                    <span className="detail-label">Company</span>
                                                    <span className="detail-value">{companyName}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Industry</span>
                                                    <span className="detail-value">{industry}</span>
                                                </div>
                                                {location && (
                                                    <div className="detail-item">
                                                        <span className="detail-label">Location</span>
                                                        <span className="detail-value">{location}</span>
                                                    </div>
                                                )}
                                                {user.recruiterProfile.companyWebsite && (
                                                    <div className="detail-item">
                                                        <span className="detail-label">Website</span>
                                                        <a href={user.recruiterProfile.companyWebsite} target="_blank" rel="noopener noreferrer" className="detail-value link">
                                                            {user.recruiterProfile.companyWebsite}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {isJobSeeker && user.jobSeekerProfile && (
                                        <>
                                            {user.jobSeekerProfile.profession && (
                                                <div className="about-section">
                                                    <h4>Profession</h4>
                                                    <p>{user.jobSeekerProfile.profession}</p>
                                                </div>
                                            )}
                                            {user.jobSeekerProfile.education?.length > 0 && (
                                                <div className="about-section">
                                                    <h4>Education</h4>
                                                    {user.jobSeekerProfile.education.map((edu, idx) => (
                                                        <div key={idx} className="edu-item">
                                                            <strong>{edu.degree}</strong>
                                                            <p>{edu.institution} {edu.year && `• ${edu.year}`}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Sidebar */}
                <aside className="content-sidebar">
                    {/* Quick Info */}
                    <div className="sidebar-card">
                        <h4>Quick Info</h4>
                        <div className="quick-info">
                            {location && (
                                <div className="qi-item">
                                    {Icons.location}
                                    <span>{location}</span>
                                </div>
                            )}
                            {isRecruiter && user.recruiterProfile?.companyWebsite && (
                                <div className="qi-item">
                                    {Icons.globe}
                                    <a href={user.recruiterProfile.companyWebsite} target="_blank" rel="noopener noreferrer">Website</a>
                                </div>
                            )}
                            <div className="qi-item">
                                {Icons.calendar}
                                <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Hiring Stats (Recruiters) */}
                    {isRecruiter && (
                        <div className="sidebar-card">
                            <h4>Hiring Activity</h4>
                            <div className="hiring-grid">
                                <div className="hiring-item">
                                    <span className="h-value">{jobs.length}</span>
                                    <span className="h-label">Total Jobs</span>
                                </div>
                                <div className="hiring-item">
                                    <span className="h-value">{activeJobs.length}</span>
                                    <span className="h-label">Active</span>
                                </div>
                                <div className="hiring-item">
                                    <span className="h-value">{totalApplicants}</span>
                                    <span className="h-label">Applicants</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Talent Score (Job Seekers) */}
                    {isJobSeeker && user.aiTalentPassport?.talentScore > 0 && (
                        <div className="sidebar-card talent-card">
                            <h4>AI Talent Score</h4>
                            <div className="talent-display">
                                <div className="talent-score">{user.aiTalentPassport.talentScore}</div>
                                <span className="talent-max">/100</span>
                            </div>
                            <p className="talent-rank">Top {Math.max(1, 100 - (user.aiTalentPassport.globalPercentile || 0))}% globally</p>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default PublicProfilePage;
