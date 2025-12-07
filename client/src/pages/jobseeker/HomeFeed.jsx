import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import UserProfileLink from '../../components/UserProfileLink';
import './HomeFeed.css';

const HomeFeed = () => {
    const [posts, setPosts] = useState([]);
    const [postContent, setPostContent] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchPosts();
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            if (userId) {
                const response = await api.get(`/users/${userId}`);
                const userData = response.data.data || response.data;
                setUser(userData);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    const fetchPosts = async () => {
        try {
            const response = await api.get('/posts/feed');
            setPosts(response.data || []);
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    };

    const handleMediaSelect = (type) => {
        const input = document.createElement('input');
        input.type = 'file';

        if (type === 'photo') {
            input.accept = 'image/*';
        } else if (type === 'video') {
            input.accept = 'video/*';
        } else if (type === 'document') {
            input.accept = '.pdf,.doc,.docx,.txt';
        }

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                setMediaFile(file);
                setMediaType(type);

                // Create preview for images and videos
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
                // Upload post with media
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
                // Text-only post
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
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post. Please try again.');
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

    const handleComment = async (postId) => {
        const comment = prompt('Enter your comment:');
        if (comment && comment.trim()) {
            try {
                await api.post(`/posts/${postId}/comment`, {
                    userId,
                    text: comment.trim()
                });
                fetchPosts();
            } catch (error) {
                console.error('Error commenting:', error);
            }
        }
    };

    const handleShare = async (postId) => {
        try {
            await api.post(`/posts/${postId}/share`, { userId });
            alert('Post shared successfully!');
            fetchPosts();
        } catch (error) {
            console.error('Error sharing post:', error);
        }
    };

    return (
        <div className="home-feed">
            <div className="feed-header">
                <h1>Home Feed</h1>
            </div>

            {/* Post Creator */}
            <div className="post-creator card">
                <div className="creator-header">
                    <div className="user-avatar">
                        {user?.profile?.photo ? (
                            <img src={user.profile.photo} alt="Profile" />
                        ) : (
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                            </svg>
                        )}
                    </div>
                    <textarea
                        className="post-input"
                        placeholder="Start a post..."
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        rows="3"
                    />
                </div>

                {/* Media Preview */}
                {mediaPreview && (
                    <div className="media-preview">
                        {mediaType === 'photo' && (
                            <img src={mediaPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 'var(--radius-md)' }} />
                        )}
                        {mediaType === 'video' && (
                            <video src={mediaPreview} controls style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 'var(--radius-md)' }} />
                        )}
                        {mediaType === 'document' && (
                            <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'inline', marginRight: 'var(--spacing-sm)' }}>
                                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" />
                                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                {mediaPreview}
                            </div>
                        )}
                        <button onClick={removeMedia} className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--spacing-sm)' }}>
                            Remove
                        </button>
                    </div>
                )}

                <div className="creator-actions">
                    <button className="action-btn" onClick={() => handleMediaSelect('photo')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                            <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Photo
                    </button>
                    <button className="action-btn" onClick={() => handleMediaSelect('video')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" />
                            <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Video
                    </button>
                    <button className="action-btn" onClick={() => handleMediaSelect('document')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" />
                            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Document
                    </button>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={createPost}
                        disabled={loading || (!postContent.trim() && !mediaFile)}
                    >
                        {loading ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </div>

            {/* Feed */}
            <div className="feed-content">
                {posts.length === 0 ? (
                    <div className="empty-state card">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <h3>No posts yet</h3>
                        <p>Be the first to share something!</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <div key={post._id} className="feed-card card">
                            <div className="card-header">
                                <div className="user-info">
                                    <div className="user-avatar">
                                        {post.userId?.profile?.photo ? (
                                            <img src={post.userId.profile.photo} alt="Profile" />
                                        ) : (
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                                <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                                <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <UserProfileLink 
                                            userId={post.userId?._id}
                                            name={post.userId?.profile?.name || 'Anonymous'}
                                            showAvatar={false}
                                        />
                                        <p className="text-muted">{new Date(post.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card-content">
                                <p>{post.content?.text}</p>
                                {/* Render media if present */}
                                {post.content?.media && post.content.media.length > 0 && (
                                    <div className="post-media">
                                        {post.content.media.map((media, index) => (
                                            <div key={index} className="media-item">
                                                {media.type === 'image' && (
                                                    <img
                                                        src={media.url || `http://localhost:5000/uploads/posts/${media.fileId}`}
                                                        alt={media.fileName}
                                                        style={{
                                                            width: '100%',
                                                            maxHeight: '500px',
                                                            objectFit: 'cover',
                                                            borderRadius: 'var(--radius-lg)',
                                                            marginTop: 'var(--spacing-md)'
                                                        }}
                                                    />
                                                )}
                                                {media.type === 'video' && (
                                                    <video
                                                        controls
                                                        style={{
                                                            width: '100%',
                                                            maxHeight: '500px',
                                                            borderRadius: 'var(--radius-lg)',
                                                            marginTop: 'var(--spacing-md)'
                                                        }}
                                                    >
                                                        <source src={media.url || `http://localhost:5000/uploads/posts/${media.fileId}`} />
                                                        Your browser does not support the video tag.
                                                    </video>
                                                )}
                                                {media.type === 'document' && (
                                                    <a
                                                        href={media.url || `http://localhost:5000/uploads/posts/${media.fileId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="document-link"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 'var(--spacing-sm)',
                                                            padding: 'var(--spacing-md)',
                                                            background: 'var(--glass-white)',
                                                            borderRadius: 'var(--radius-md)',
                                                            marginTop: 'var(--spacing-md)',
                                                            textDecoration: 'none'
                                                        }}
                                                    >
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" />
                                                            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" />
                                                        </svg>
                                                        <span>{media.fileName}</span>
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="card-actions">
                                <button className="action-btn" onClick={() => handleLike(post._id)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M14 9V5C14 4.46957 13.7893 3.96086 13.4142 3.58579C13.0391 3.21071 12.5304 3 12 3C11.4696 3 10.9609 3.21071 10.5858 3.58579C10.2107 3.96086 10 4.46957 10 5V9L7 12V21H18.28C18.7623 21.0055 19.2304 20.8364 19.5979 20.524C19.9654 20.2116 20.2077 19.7769 20.28 19.3L21.66 11.3C21.7035 11.0134 21.6842 10.7207 21.6033 10.4423C21.5225 10.1638 21.3821 9.90629 21.1919 9.68751C21.0016 9.46873 20.7661 9.29393 20.5016 9.17522C20.2371 9.0565 19.9499 8.99672 19.66 9H14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M7 12H4C3.46957 12 2.96086 12.2107 2.58579 12.5858C2.21071 12.9609 2 13.4696 2 14V19C2 19.5304 2.21071 20.0391 2.58579 20.4142C2.96086 20.7893 3.46957 21 4 21H7V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Like ({post.engagement?.likes?.length || 0})
                                </button>
                                <button className="action-btn" onClick={() => handleComment(post._id)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                    Comment ({post.engagement?.comments?.length || 0})
                                </button>
                                <button className="action-btn" onClick={() => handleShare(post._id)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M16 6L12 2L8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M12 2V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Share
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div >
        </div >
    );
};

export default HomeFeed;
