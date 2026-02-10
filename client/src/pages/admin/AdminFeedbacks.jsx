import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './AdminFeedbacks.css';

const AdminFeedbacks = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [filter]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const query = filter !== 'all' ? `?featureId=${filter}` : '';
            const [feedbackRes, statsRes] = await Promise.all([
                api.get(`/feedback${query}`),
                api.get('/feedback/stats')
            ]);

            setFeedbacks(feedbackRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching admin feedback:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFeatureLabel = (id) => {
        const labels = {
            'onboarding': 'Onboarding',
            'domain-interview': 'Domain Interview',
            'atp': 'Talent Passport',
            'job-post': 'Job Posting',
            'recruiter-dashboard': 'Recruiter Dashboard'
        };
        return labels[id] || id;
    };

    const getFullRatingColor = (rating) => {
        if (rating >= 8) return '#10b981'; // Success
        if (rating >= 6) return '#3b82f6'; // Info
        if (rating >= 4) return '#f59e0b'; // Warning
        return '#ef4444'; // Danger
    };

    const filteredFeedbacks = feedbacks.filter(fb =>
        fb.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.insights?.some(i => i.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="admin-feedbacks">
            <header className="admin-feedbacks-header">
                <div className="header-title">
                    <h1>User Feedbacks</h1>
                    <p>Monitor feature-specific user sentiment and insights</p>
                </div>
                <div className="header-actions">
                    <div className="search-box">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search feedback..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="feedback-stats-grid">
                {stats.length > 0 ? stats.map(stat => (
                    <div key={stat._id} className="stat-card" onClick={() => setFilter(stat._id)}>
                        <div className="stat-header">
                            <span className="stat-label">{getFeatureLabel(stat._id)}</span>
                            <span className="stat-count">{stat.count} submissions</span>
                        </div>
                        <div className="stat-body">
                            <div className="stat-rating" style={{ color: getFullRatingColor(stat.averageRating) }}>
                                {stat.averageRating.toFixed(1)}
                                <small>/10</small>
                            </div>
                            <div className="stat-progress">
                                <div
                                    className="stat-progress-fill"
                                    style={{
                                        width: `${stat.averageRating * 10}%`,
                                        background: getFullRatingColor(stat.averageRating)
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="empty-stats">No feedback data available yet</div>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="feedback-filters">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All Features
                </button>
                {['onboarding', 'domain-interview', 'atp', 'job-post', 'recruiter-dashboard'].map(fId => (
                    <button
                        key={fId}
                        className={`filter-btn ${filter === fId ? 'active' : ''}`}
                        onClick={() => setFilter(fId)}
                    >
                        {getFeatureLabel(fId)}
                    </button>
                ))}
            </div>

            {/* Feedback List */}
            <div className="feedback-list">
                {loading ? (
                    <div className="feedback-loading">Loading feedbacks...</div>
                ) : filteredFeedbacks.length > 0 ? (
                    <div className="feedback-table-container">
                        <table className="feedback-table">
                            <thead>
                                border-spacing: 0;
                                <tr>
                                    <th>User</th>
                                    <th>Feature</th>
                                    <th>Rating</th>
                                    <th>Insights</th>
                                    <th>Comment</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFeedbacks.map(fb => (
                                    <tr key={fb._id}>
                                        <td>
                                            <div className="user-info">
                                                <span className="user-email">{fb.userId?.email || 'Unknown'}</span>
                                                <span className="user-role-badge">{fb.userRole}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="feature-badge">{getFeatureLabel(fb.featureId)}</span>
                                        </td>
                                        <td>
                                            <div className="rating-pill" style={{ background: getFullRatingColor(fb.rating) + '20', color: getFullRatingColor(fb.rating) }}>
                                                {fb.rating}/10
                                            </div>
                                        </td>
                                        <td>
                                            <div className="insight-chips">
                                                {fb.insights?.map((insight, idx) => (
                                                    <span key={idx} className="insight-mini-chip">{insight}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="comment-cell">
                                            {fb.comment || <span className="no-comment">No comment provided</span>}
                                        </td>
                                        <td>
                                            <span className="date-text">
                                                {new Date(fb.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-feedbacks">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <p>No feedback found matching your filters</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFeedbacks;
