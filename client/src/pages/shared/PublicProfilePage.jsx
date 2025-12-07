import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import FollowButton from '../../components/FollowButton';
import UserProfileLink from '../../components/UserProfileLink';
import './PublicProfilePage.css';

const PublicProfilePage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const [mutualConnections, setMutualConnections] = useState([]);
    const [activeTab, setActiveTab] = useState('posts');
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
            // API interceptor already extracts response.data, so response IS the data
            setUser(response.user);
            setIsFollowing(response.isFollowing || false);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get(`/profiles/${userId}/stats`);
            setStats(response || { followers: 0, following: 0, posts: 0 });
        } catch (error) {
            console.error('Error fetching stats:', error);
            setStats({ followers: 0, following: 0, posts: 0 });
        }
    };

    const fetchPosts = async () => {
        try {
            const response = await api.get(`/profiles/${userId}/posts`);
            setPosts(Array.isArray(response.posts) ? response.posts : []);
        } catch (error) {
            console.error('Error fetching posts:', error);
            setPosts([]);
        }
    };

    const fetchMutualConnections = async () => {
        try {
            const response = await api.get(`/profiles/${userId}/mutual-connections?currentUserId=${currentUserId}`);
            setMutualConnections(Array.isArray(response.mutualConnections) ? response.mutualConnections : []);
        } catch (error) {
            console.error('Error fetching mutual connections:', error);
            setMutualConnections([]);
        }
    };

    const handleMessage = () => {
        const userRole = localStorage.getItem('userRole');
        const messagePath = userRole === 'recruiter' ? '/recruiter/messages' : '/jobseeker/messages';
        navigate(messagePath, { state: { selectedUser: user } });
    };

    if (loading) {
        return (
            <div className="public-profile-loading">
                <div className="spinner-large"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="public-profile-error">
                <h2>Profile not found</h2>
                <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
            </div>
        );
    }

    const isJobSeeker = user.role === 'jobseeker';

    return (
        <div className="public-profile-page">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="profile-cover"></div>
                <div className="profile-header-content">
                    <div className="profile-avatar-large">
                        {user.profile?.photo ? (
                            <img src={user.profile.photo} alt={user.profile.name} />
                        ) : (
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                            </svg>
                        )}
                    </div>

                    <div className="profile-info">
                        <h1>{user.profile?.name}</h1>
                        {user.profile?.headline && (
                            <p className="profile-headline">{user.profile.headline}</p>
                        )}
                        {user.profile?.location && (
                            <p className="profile-location">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" strokeWidth="2" />
                                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                {user.profile.location}
                            </p>
                        )}
                        {mutualConnections.length > 0 && (
                            <p className="mutual-connections">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" />
                                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                                    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" />
                                    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                {mutualConnections.length} mutual connection{mutualConnections.length > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    <div className="profile-actions">
                        {!isOwnProfile && (
                            <>
                                <FollowButton
                                    userId={userId}
                                    initialIsFollowing={isFollowing}
                                    onFollowChange={setIsFollowing}
                                />
                                <button className="btn btn-secondary" onClick={handleMessage}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                    Message
                                </button>
                            </>
                        )}
                        {isOwnProfile && (
                            <button className="btn btn-primary" onClick={() => navigate('/jobseeker/profile')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" />
                                    <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="profile-stats">
                <div className="stat-item">
                    <span className="stat-value">{stats.posts}</span>
                    <span className="stat-label">Posts</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{stats.followers}</span>
                    <span className="stat-label">Followers</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{stats.following}</span>
                    <span className="stat-label">Following</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="profile-tabs">
                <button
                    className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('posts')}
                >
                    Posts
                </button>
                <button
                    className={`tab ${activeTab === 'about' ? 'active' : ''}`}
                    onClick={() => setActiveTab('about')}
                >
                    About
                </button>
            </div>

            {/* Tab Content */}
            <div className="profile-content">
                {activeTab === 'posts' && (
                    <div className="posts-tab">
                        {posts.length === 0 ? (
                            <div className="empty-state">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                <p>No posts yet</p>
                            </div>
                        ) : (
                            <div className="posts-grid">
                                {posts.map(post => (
                                    <div key={post._id} className="post-card card">
                                        <p>{post.content?.text}</p>
                                        {post.content?.media && post.content.media.length > 0 && (
                                            <div className="post-media">
                                                {post.content.media.map((media, idx) => (
                                                    media.type === 'image' && (
                                                        <img key={idx} src={media.url} alt="Post media" />
                                                    )
                                                ))}
                                            </div>
                                        )}
                                        <div className="post-meta">
                                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>{post.engagement?.likes?.length || 0} likes</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="about-tab">
                        <div className="about-section card">
                            <h3>About</h3>
                            {user.profile?.bio ? (
                                <p>{user.profile.bio}</p>
                            ) : (
                                <p className="text-muted">No bio added yet</p>
                            )}
                        </div>

                        {isJobSeeker && (
                            <>
                                {user.jobSeekerProfile?.profession && (
                                    <div className="about-section card">
                                        <h3>Profession</h3>
                                        <p>{user.jobSeekerProfile.profession}</p>
                                    </div>
                                )}

                                {user.jobSeekerProfile?.education && user.jobSeekerProfile.education.length > 0 && (
                                    <div className="about-section card">
                                        <h3>Education</h3>
                                        {user.jobSeekerProfile.education.map((edu, idx) => (
                                            <div key={idx} className="education-item">
                                                <h4>{edu.degree}</h4>
                                                <p>{edu.institution}</p>
                                                {edu.year && <span className="text-muted">{edu.year}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {user.jobSeekerProfile?.portfolioLinks && (
                                    <div className="about-section card">
                                        <h3>Links</h3>
                                        <div className="portfolio-links">
                                            {user.jobSeekerProfile.portfolioLinks.linkedin && (
                                                <a href={user.jobSeekerProfile.portfolioLinks.linkedin} target="_blank" rel="noopener noreferrer">
                                                    LinkedIn
                                                </a>
                                            )}
                                            {user.jobSeekerProfile.portfolioLinks.github && (
                                                <a href={user.jobSeekerProfile.portfolioLinks.github} target="_blank" rel="noopener noreferrer">
                                                    GitHub
                                                </a>
                                            )}
                                            {user.jobSeekerProfile.portfolioLinks.portfolio && (
                                                <a href={user.jobSeekerProfile.portfolioLinks.portfolio} target="_blank" rel="noopener noreferrer">
                                                    Portfolio
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {!isJobSeeker && user.recruiterProfile && (
                            <>
                                <div className="about-section card">
                                    <h3>Company</h3>
                                    <p><strong>{user.recruiterProfile.companyName}</strong></p>
                                    {user.recruiterProfile.position && (
                                        <p className="text-muted">{user.recruiterProfile.position}</p>
                                    )}
                                    {user.recruiterProfile.companyWebsite && (
                                        <a href={user.recruiterProfile.companyWebsite} target="_blank" rel="noopener noreferrer">
                                            Visit Website
                                        </a>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicProfilePage;
