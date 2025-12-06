import React from 'react';
import './RecruiterAnalytics.css';

const RecruiterAnalytics = () => {
    const stats = {
        totalJobs: 5,
        totalApplicants: 23,
        interviewsCompleted: 12,
        avgInterviewScore: 75,
        topSkills: ['React', 'Node.js', 'Python', 'MongoDB', 'AWS']
    };

    return (
        <div className="analytics-page">
            <div className="page-header">
                <h1>Analytics Dashboard</h1>
                <p className="text-muted">Insights into your recruitment activities</p>
            </div>

            {/* Overview Stats */}
            <div className="stats-grid">
                <div className="stat-card card">
                    <h3>Total Jobs Posted</h3>
                    <p className="stat-number">{stats.totalJobs}</p>
                    <p className="stat-change positive">+2 this month</p>
                </div>

                <div className="stat-card card">
                    <h3>Total Applicants</h3>
                    <p className="stat-number">{stats.totalApplicants}</p>
                    <p className="stat-change positive">+8 this week</p>
                </div>

                <div className="stat-card card">
                    <h3>Interviews Completed</h3>
                    <p className="stat-number">{stats.interviewsCompleted}</p>
                    <p className="stat-change">{stats.interviewsCompleted} total</p>
                </div>

                <div className="stat-card card">
                    <h3>Avg Interview Score</h3>
                    <p className="stat-number">{stats.avgInterviewScore}%</p>
                    <p className="stat-change positive">+5% from last month</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                <div className="chart-card card">
                    <h3>Application Trends</h3>
                    <div className="chart-placeholder">
                        <svg width="100%" height="200" viewBox="0 0 400 200" fill="none">
                            <path d="M 0 180 L 50 150 L 100 160 L 150 120 L 200 100 L 250 80 L 300 60 L 350 40 L 400 20" stroke="var(--primary)" strokeWidth="3" fill="none" />
                            <path d="M 0 180 L 50 150 L 100 160 L 150 120 L 200 100 L 250 80 L 300 60 L 350 40 L 400 20 L 400 200 L 0 200 Z" fill="url(#gradient)" opacity="0.2" />
                            <defs>
                                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--primary)" />
                                    <stop offset="100%" stopColor="transparent" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <p className="text-muted text-center">Applications over time</p>
                    </div>
                </div>

                <div className="chart-card card">
                    <h3>Top Skills in Demand</h3>
                    <div className="skills-chart">
                        {stats.topSkills.map((skill, index) => (
                            <div key={skill} className="skill-bar">
                                <span className="skill-name">{skill}</span>
                                <div className="bar-container">
                                    <div className="bar-fill" style={{ width: `${100 - (index * 15)}%` }}></div>
                                </div>
                                <span className="skill-count">{Math.floor(Math.random() * 10) + 5}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="activity-section card">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                    <div className="activity-item">
                        <div className="activity-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div className="activity-content">
                            <p><strong>New application</strong> for Senior Developer position</p>
                            <p className="text-muted">2 hours ago</p>
                        </div>
                    </div>

                    <div className="activity-item">
                        <div className="activity-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" strokeWidth="2" />
                                <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                        <div className="activity-content">
                            <p><strong>Interview completed</strong> by John Doe</p>
                            <p className="text-muted">5 hours ago</p>
                        </div>
                    </div>

                    <div className="activity-item">
                        <div className="activity-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                        <div className="activity-content">
                            <p><strong>New job posted</strong> - Full Stack Developer</p>
                            <p className="text-muted">1 day ago</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecruiterAnalytics;
