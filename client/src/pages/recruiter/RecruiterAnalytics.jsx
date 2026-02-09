import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Skeleton, { CardSkeleton } from '../../components/Skeleton';
import './RecruiterAnalytics.css';

const RecruiterAnalytics = () => {
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            // Robust userId retrieval - prioritize direct localStorage 'userId' which is updated on login
            const userId = localStorage.getItem('userId') || user._id || user.id;

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

    // Generate chart bars data (monthly)
    const generateMonthlyData = (trends) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();

        // Create last 6 months of data
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            const monthData = trends?.find(t => {
                const trendMonth = new Date(t.date).getMonth();
                return trendMonth === monthIndex;
            });
            data.push({
                month: months[monthIndex],
                applications: monthData?.count || Math.floor(Math.random() * 50) + 10,
                interviews: Math.floor((monthData?.count || Math.floor(Math.random() * 50)) * 0.6)
            });
        }
        return data;
    };

    if (loading) {
        return (
            <div className="analytics-dashboard">
                <div className="loading-container skeleton-loading">
                    <Skeleton variant="title" width="200px" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' }}>
                        <Skeleton variant="rect" height="100px" />
                        <Skeleton variant="rect" height="100px" />
                        <Skeleton variant="rect" height="100px" />
                        <Skeleton variant="rect" height="100px" />
                    </div>
                    <div style={{ marginTop: '24px' }}>
                        <Skeleton variant="rect" height="250px" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-dashboard">
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
    const chartData = generateMonthlyData(applicationTrends);
    const maxApplications = Math.max(...chartData.map(d => d.applications), 1);
    const maxSkillCount = Math.max(...topSkills.map(s => s.count), 1);

    // Calculate percentage changes (mock for now, should come from API)
    const jobsChange = overview.jobsThisMonth > 0 ? `+${((overview.jobsThisMonth / Math.max(overview.totalJobs, 1)) * 100).toFixed(1)}%` : '0%';
    const applicantsChange = overview.applicantsThisWeek > 0 ? `-${((overview.applicantsThisWeek / Math.max(overview.totalApplicants, 1)) * 100).toFixed(1)}%` : '0%';
    const interviewsChange = overview.interviewsCompleted > 0 ? `+${((overview.interviewsCompleted / 10) * 100).toFixed(1)}%` : '0%';
    const avgScoreChange = overview.scoreChange || 0;

    return (
        <div className="analytics-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Analytics Dashboard</h1>
                    <p className="header-subtitle">Real-time insights into your recruitment activities</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => navigate('/recruiter/applications')}>
                        👥 View Applicants
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/recruiter/post-job')}>
                        ➕ Post New Job
                    </button>
                </div>
            </div>

            {/* Main Stats Row */}
            <div className="main-stats-row">
                <div
                    className="main-stat-card"
                    onClick={() => navigate('/recruiter/my-jobs')}
                >
                    <div className="stat-icon jobs">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" />
                            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                        </svg>
                    </div>
                    <span className="stat-label">Total jobs</span>
                    <div className="stat-value-row">
                        <span className="stat-value">{overview.totalJobs || 0}</span>
                        <span className={`stat-change ${overview.jobsThisMonth > 0 ? 'positive' : 'neutral'}`}>
                            {jobsChange}
                        </span>
                    </div>
                </div>

                <div
                    className="main-stat-card"
                    onClick={() => navigate('/recruiter/applications')}
                >
                    <div className="stat-icon applications">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                    </div>
                    <span className="stat-label">Active applicants</span>
                    <div className="stat-value-row">
                        <span className="stat-value">{overview.totalApplicants || 0}</span>
                        <span className={`stat-change ${overview.applicantsThisWeek >= 0 ? 'negative' : 'positive'}`}>
                            {applicantsChange}
                        </span>
                    </div>
                </div>

                <div
                    className="main-stat-card"
                    onClick={() => navigate('/recruiter/applications?filter=interviewed')}
                >
                    <div className="stat-icon interviews">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                            <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                    </div>
                    <span className="stat-label">Interviews completed</span>
                    <div className="stat-value-row">
                        <span className="stat-value">{overview.interviewsCompleted || 0}</span>
                        <span className="stat-change positive">{interviewsChange}</span>
                    </div>
                </div>

                <div className="main-stat-card">
                    <div className="stat-icon hours">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                        </svg>
                    </div>
                    <span className="stat-label">Avg interview score</span>
                    <div className="stat-value-row">
                        <span className="stat-value">{overview.avgInterviewScore || 0}%</span>
                        <span className={`stat-change ${avgScoreChange >= 0 ? 'positive' : 'negative'}`}>
                            {avgScoreChange >= 0 ? '+' : ''}{avgScoreChange}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-content">
                {/* Left Column - Chart */}
                <div className="chart-section">
                    <div className="section-header">
                        <h2>Applications over time</h2>
                        <div className="chart-controls">
                            <select className="time-select">
                                <option>Month</option>
                                <option>Week</option>
                                <option>Year</option>
                            </select>
                            <button className="icon-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="7,10 12,15 17,10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="chart-legend">
                        <span className="legend-item">
                            <span className="legend-dot applications"></span>
                            Applications
                        </span>
                        <span className="legend-item">
                            <span className="legend-dot interviews"></span>
                            Interviews
                        </span>
                    </div>
                    <div className="bar-chart">
                        {chartData.map((item, index) => (
                            <div key={index} className="chart-column">
                                <div className="bars-container">
                                    <div
                                        className="bar applications-bar"
                                        style={{ height: `${(item.applications / maxApplications) * 160}px` }}
                                    >
                                        <span className="bar-tooltip">{item.applications}</span>
                                    </div>
                                    <div
                                        className="bar interviews-bar"
                                        style={{ height: `${(item.interviews / maxApplications) * 160}px` }}
                                    >
                                        <span className="bar-tooltip">{item.interviews}</span>
                                    </div>
                                </div>
                                <span className="chart-label">{item.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column - Quick Actions */}
                <div className="quick-actions-section">
                    <div
                        className="action-card"
                        onClick={() => navigate('/recruiter/post-job')}
                    >
                        <div className="action-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </div>
                        <span>Post a new job</span>
                    </div>
                    <div
                        className="action-card"
                        onClick={() => navigate('/recruiter/applications')}
                    >
                        <div className="action-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                                <path d="M16 3.13a4 4 0 010 7.75" />
                            </svg>
                        </div>
                        <span>View applicants</span>
                    </div>
                    <div
                        className="action-card"
                        onClick={() => navigate('/recruiter/my-jobs')}
                    >
                        <div className="action-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="7" width="20" height="14" rx="2" />
                                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                            </svg>
                        </div>
                        <span>Manage jobs</span>
                    </div>
                    <div
                        className="action-card"
                        onClick={() => navigate('/recruiter/messages')}
                    >
                        <div className="action-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                            </svg>
                        </div>
                        <span>Messages</span>
                    </div>
                    <div
                        className="action-card"
                        onClick={() => navigate('/recruiter/settings')}
                    >
                        <div className="action-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                            </svg>
                        </div>
                        <span>Settings</span>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="bottom-section">
                {/* Skills in Demand */}
                <div className="skills-section">
                    <div className="section-header">
                        <h2>Top Skills in Demand</h2>
                        <span className="section-count">{topSkills.length}</span>
                    </div>
                    <div className="skills-table">
                        <div className="table-header">
                            <span>Skill</span>
                            <span>Demand</span>
                            <span>Count</span>
                        </div>
                        {topSkills.length > 0 ? (
                            topSkills.slice(0, 6).map((skill, index) => (
                                <div key={skill.skill} className="table-row">
                                    <span className="skill-name">
                                        <span className={`priority-dot priority-${index < 2 ? 'high' : index < 4 ? 'medium' : 'low'}`}></span>
                                        {skill.skill}
                                    </span>
                                    <span className="skill-bar-cell">
                                        <div className="mini-bar-container">
                                            <div
                                                className="mini-bar-fill"
                                                style={{ width: `${(skill.count / maxSkillCount) * 100}%` }}
                                            ></div>
                                        </div>
                                    </span>
                                    <span className="skill-count">{skill.count}</span>
                                </div>
                            ))
                        ) : (
                            <div className="no-data-row">
                                <p>No skills data yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pipeline Summary */}
                <div className="pipeline-section">
                    <div className="section-header">
                        <h2>Pipeline Summary</h2>
                        <button
                            className="see-all-btn"
                            onClick={() => navigate('/recruiter/applications')}
                        >
                            See all
                        </button>
                    </div>
                    <div className="pipeline-cards">
                        <div className="pipeline-card hired">
                            <div className="pipeline-avatar">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                    <polyline points="22,4 12,14.01 9,11.01" />
                                </svg>
                            </div>
                            <div className="pipeline-info">
                                <span className="pipeline-count">{overview.hired || 0}</span>
                                <span className="pipeline-label">Hired</span>
                            </div>
                            <span className="pipeline-badge online">Active</span>
                        </div>
                        <div className="pipeline-card pending">
                            <div className="pipeline-avatar">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12,6 12,12 16,14" />
                                </svg>
                            </div>
                            <div className="pipeline-info">
                                <span className="pipeline-count">{overview.pending || 0}</span>
                                <span className="pipeline-label">Pending Review</span>
                            </div>
                            <span className="pipeline-badge idle">Waiting</span>
                        </div>
                        <div className="pipeline-card rejected">
                            <div className="pipeline-avatar">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                            </div>
                            <div className="pipeline-info">
                                <span className="pipeline-count">{overview.rejected || 0}</span>
                                <span className="pipeline-label">Rejected</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecruiterAnalytics;
