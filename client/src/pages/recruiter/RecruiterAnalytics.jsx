import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './RecruiterAnalytics.css';

const RecruiterAnalytics = () => {
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user._id || user.id || localStorage.getItem('userId');

            if (!userId) {
                setError('User not found');
                return;
            }

            const response = await api.get(`/jobs/recruiter/${userId}/analytics`);
            const data = response.data || response;
            setAnalytics(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setError('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Recently';
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'interview_completed':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="var(--success)" strokeWidth="2" />
                        <path d="M22 4L12 14.01L9 11.01" stroke="var(--success)" strokeWidth="2" />
                    </svg>
                );
            case 'new_application':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="var(--primary)" strokeWidth="2" />
                        <path d="M14 2V8H20" stroke="var(--primary)" strokeWidth="2" />
                    </svg>
                );
            case 'job_posted':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="7" width="20" height="14" rx="2" stroke="var(--warning)" strokeWidth="2" />
                        <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="var(--warning)" strokeWidth="2" />
                    </svg>
                );
            default:
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                );
        }
    };

    // Generate SVG path for application trends chart
    const generateTrendPath = (trends) => {
        if (!trends || trends.length === 0) return '';

        const maxCount = Math.max(...trends.map(t => t.count), 1);
        const width = 400;
        const height = 180;
        const padding = 10;

        const points = trends.map((point, index) => {
            const x = padding + (index / (trends.length - 1)) * (width - 2 * padding);
            const y = height - padding - (point.count / maxCount) * (height - 2 * padding);
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    };

    const generateAreaPath = (trends) => {
        if (!trends || trends.length === 0) return '';

        const linePath = generateTrendPath(trends);
        if (!linePath) return '';

        const points = linePath.replace('M ', '').split(' L ');
        const firstPoint = points[0].split(',');
        const lastPoint = points[points.length - 1].split(',');

        return `${linePath} L ${lastPoint[0]},180 L ${firstPoint[0]},180 Z`;
    };

    if (loading) {
        return (
            <div className="analytics-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-page">
                <div className="error-container">
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={fetchAnalytics}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const overview = analytics?.overview || {};
    const topSkills = analytics?.topSkills || [];
    const applicationTrends = analytics?.applicationTrends || [];
    const recentActivity = analytics?.recentActivity || [];
    const maxSkillCount = Math.max(...topSkills.map(s => s.count), 1);

    return (
        <div className="analytics-page">
            <div className="page-header">
                <div className="header-content">
                    <h1>Analytics Dashboard</h1>
                    <p className="text-muted">Real-time insights into your recruitment activities</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/recruiter/applications')}
                    >
                        👥 View Applicants
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/recruiter/post-job')}
                    >
                        ➕ Post New Job
                    </button>
                </div>
            </div>

            {/* Overview Stats - Clickable */}
            <div className="stats-grid">
                <div
                    className="stat-card card clickable"
                    onClick={() => navigate('/recruiter/my-jobs')}
                    title="Click to view your jobs"
                >
                    <h3>Total Jobs Posted</h3>
                    <p className="stat-number">{overview.totalJobs || 0}</p>
                    <p className={`stat-change ${overview.jobsThisMonth > 0 ? 'positive' : ''}`}>
                        {overview.jobsThisMonth > 0 ? `+${overview.jobsThisMonth} this month` : 'No new jobs this month'}
                    </p>
                </div>

                <div
                    className="stat-card card clickable"
                    onClick={() => navigate('/recruiter/applications')}
                    title="Click to view all applicants"
                >
                    <h3>Total Applicants</h3>
                    <p className="stat-number">{overview.totalApplicants || 0}</p>
                    <p className={`stat-change ${overview.applicantsThisWeek > 0 ? 'positive' : ''}`}>
                        {overview.applicantsThisWeek > 0 ? `+${overview.applicantsThisWeek} this week` : 'No new applicants this week'}
                    </p>
                </div>

                <div
                    className="stat-card card clickable"
                    onClick={() => navigate('/recruiter/applications?filter=interviewed')}
                    title="Click to view interviews"
                >
                    <h3>Interviews Completed</h3>
                    <p className="stat-number">{overview.interviewsCompleted || 0}</p>
                    <p className="stat-change">
                        {overview.hired || 0} hired • {overview.pending || 0} pending
                    </p>
                </div>

                <div className="stat-card card">
                    <h3>Avg Interview Score</h3>
                    <p className="stat-number">{overview.avgInterviewScore || 0}%</p>
                    <p className={`stat-change ${overview.scoreChange >= 0 ? 'positive' : 'negative'}`}>
                        {overview.scoreChange !== 0 ?
                            `${overview.scoreChange > 0 ? '+' : ''}${overview.scoreChange}% from last month` :
                            'No change from last month'}
                    </p>
                </div>
            </div>

            {/* Status Breakdown - Mini Stats */}
            <div className="mini-stats-row">
                <div className="mini-stat success">
                    <span className="mini-stat-icon">✓</span>
                    <span className="mini-stat-value">{overview.hired || 0}</span>
                    <span className="mini-stat-label">Hired</span>
                </div>
                <div className="mini-stat danger">
                    <span className="mini-stat-icon">✗</span>
                    <span className="mini-stat-value">{overview.rejected || 0}</span>
                    <span className="mini-stat-label">Rejected</span>
                </div>
                <div className="mini-stat info">
                    <span className="mini-stat-icon">⏳</span>
                    <span className="mini-stat-value">{overview.pending || 0}</span>
                    <span className="mini-stat-label">Pending</span>
                </div>
                <div className="mini-stat primary">
                    <span className="mini-stat-icon">📈</span>
                    <span className="mini-stat-value">{overview.conversionRate || 0}%</span>
                    <span className="mini-stat-label">Conversion Rate</span>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                <div className="chart-card card">
                    <h3>Application Trends (Last 30 Days)</h3>
                    <div className="chart-placeholder">
                        {applicationTrends.length > 0 && applicationTrends.some(t => t.count > 0) ? (
                            <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                                <defs>
                                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d={generateAreaPath(applicationTrends)} fill="url(#trendGradient)" />
                                <path d={generateTrendPath(applicationTrends)} stroke="var(--primary)" strokeWidth="3" fill="none" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <div className="no-data">
                                <p>No application data yet</p>
                                <p className="text-muted">Post jobs to start receiving applications</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="chart-card card">
                    <h3>Top Skills in Demand</h3>
                    <div className="skills-chart">
                        {topSkills.length > 0 ? (
                            topSkills.map((item) => (
                                <div key={item.skill} className="skill-bar">
                                    <span className="skill-name">{item.skill}</span>
                                    <div className="bar-container">
                                        <div
                                            className="bar-fill"
                                            style={{ width: `${(item.count / maxSkillCount) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="skill-count">{item.count}</span>
                                </div>
                            ))
                        ) : (
                            <div className="no-data">
                                <p>No skills data yet</p>
                                <p className="text-muted">Add skills to job requirements</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="activity-section card">
                <div className="section-header">
                    <h3>Recent Activity</h3>
                    <button
                        className="btn btn-text"
                        onClick={() => navigate('/recruiter/applications')}
                    >
                        View All →
                    </button>
                </div>
                <div className="activity-list">
                    {recentActivity.length > 0 ? (
                        recentActivity.map((activity, index) => (
                            <div
                                key={index}
                                className="activity-item clickable"
                                onClick={() => navigate('/recruiter/applications')}
                                title="Click to view in Talent Pipeline"
                            >
                                <div className="activity-icon">
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="activity-content">
                                    <p>
                                        <strong>{activity.title}</strong>
                                        {activity.score && <span className="activity-score"> (Score: {activity.score}%)</span>}
                                    </p>
                                    <p className="activity-description">{activity.description}</p>
                                    <p className="text-muted">{formatTimeAgo(activity.timestamp)}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-activity">
                            <p>No recent activity</p>
                            <p className="text-muted">Post jobs and review applications to see activity here</p>
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: 'var(--spacing-md)' }}
                                onClick={() => navigate('/recruiter/post-job')}
                            >
                                Post Your First Job
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecruiterAnalytics;
