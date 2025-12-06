import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../jobseeker/HomeFeed.css';

const RecruiterHome = () => {
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState({
        activeJobs: 0,
        totalApplicants: 0,
        interviewsScheduled: 0
    });

    useEffect(() => {
        fetchPosts();
        fetchStats();
    }, []);

    const fetchPosts = async () => {
        try {
            const response = await api.get('/posts/feed');
            setPosts(response.data || []);
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    };

    const fetchStats = async () => {
        // Mock stats for now
        setStats({
            activeJobs: 5,
            totalApplicants: 23,
            interviewsScheduled: 8
        });
    };

    return (
        <div className="home-feed">
            <div className="feed-header">
                <h1>Recruiter Dashboard</h1>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-2xl)' }}>
                <div className="stat-card card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <p className="text-muted" style={{ margin: '0 0 var(--spacing-sm) 0' }}>Active Jobs</p>
                            <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--primary-light)' }}>{stats.activeJobs}</h2>
                        </div>
                        <div style={{ width: '50px', height: '50px', background: 'var(--gradient-primary)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="stat-card card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <p className="text-muted" style={{ margin: '0 0 var(--spacing-sm) 0' }}>Total Applicants</p>
                            <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--accent)' }}>{stats.totalApplicants}</h2>
                        </div>
                        <div style={{ width: '50px', height: '50px', background: 'var(--gradient-secondary)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" />
                                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="stat-card card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <p className="text-muted" style={{ margin: '0 0 var(--spacing-sm) 0' }}>Interviews Scheduled</p>
                            <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--secondary)' }}>{stats.interviewsScheduled}</h2>
                        </div>
                        <div style={{ width: '50px', height: '50px', background: 'var(--gradient-accent)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" />
                                <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="feed-content">
                <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Recent Activity</h2>
                {posts.length === 0 ? (
                    <div className="empty-state card">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <h3>No recent activity</h3>
                        <p>Activity from job seekers will appear here</p>
                    </div>
                ) : (
                    posts.slice(0, 5).map((post) => (
                        <div key={post._id} className="feed-card card">
                            <div className="card-header">
                                <div className="user-info">
                                    <div className="user-avatar">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                            <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                            <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4>{post.userId?.profile?.name || 'Job Seeker'}</h4>
                                        <p className="text-muted">{new Date(post.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card-content">
                                <p>{post.content?.text}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RecruiterHome;
