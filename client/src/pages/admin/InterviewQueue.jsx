import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const InterviewQueue = ({ flaggedOnly = false }) => {
    const navigate = useNavigate();
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [priority, setPriority] = useState(flaggedOnly ? 'critical' : '');

    useEffect(() => {
        fetchInterviews();
    }, [page, priority, flaggedOnly]);

    const fetchInterviews = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            let url = `${API_URL}/admin/interviews/pending?page=${page}&limit=15`;

            if (priority || flaggedOnly) {
                url += `&priority=${priority || 'critical'}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                navigate('/admin/login');
                return;
            }

            const data = await response.json();
            if (data.success) {
                setInterviews(data.data.interviews);
                setTotalPages(data.data.pagination.pages);
            }
        } catch (error) {
            console.error('Failed to fetch interviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPriorityBadge = (priority) => {
        const classes = {
            normal: 'priority-badge normal',
            high: 'priority-badge high',
            critical: 'priority-badge critical'
        };
        return <span className={classes[priority] || classes.normal}>{priority}</span>;
    };

    const getRiskBadge = (riskLevel) => {
        const classes = {
            low: 'status-badge approved',
            medium: 'status-badge pending',
            high: 'status-badge rejected'
        };
        return <span className={classes[riskLevel] || classes.low}>{riskLevel}</span>;
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="admin-loading-spinner"></div>
            </div>
        );
    }

    return (
        <>
            <div className="admin-page-header">
                <div>
                    <h1>{flaggedOnly ? 'Flagged Reviews' : 'Interview Queue'}</h1>
                    <p>{flaggedOnly ? 'Interviews with critical cheating flags' : 'Interviews pending admin review'}</p>
                </div>
                <div className="admin-table-actions">
                    <select
                        className="admin-filter-btn"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                    >
                        <option value="">All Priorities</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                    <button className="admin-refresh-btn" onClick={fetchInterviews}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="admin-table-container">
                {interviews.length === 0 ? (
                    <div className="admin-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {flaggedOnly ? (
                                <>
                                    <path d="M9 12l2 2 4-4" />
                                    <circle cx="12" cy="12" r="10" />
                                </>
                            ) : (
                                <>
                                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </>
                            )}
                        </svg>
                        <h3>{flaggedOnly ? 'No Flagged Interviews' : 'No Pending Reviews'}</h3>
                        <p>
                            {flaggedOnly
                                ? 'No interviews with suspicious activity or high proctoring flags detected'
                                : 'All interviews have been reviewed'
                            }
                        </p>
                    </div>
                ) : (
                    <>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Candidate</th>
                                    <th>Type</th>
                                    <th>AI Score</th>
                                    <th>Risk Level</th>
                                    <th>Flags</th>
                                    <th>Priority</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {interviews.map((interview) => (
                                    <tr key={interview._id}>
                                        <td>
                                            <div>
                                                <strong style={{ color: '#f8fafc' }}>
                                                    {interview.userId?.profile?.name || 'Unknown'}
                                                </strong>
                                                <br />
                                                <small style={{ color: '#64748b' }}>
                                                    {interview.userId?.email}
                                                </small>
                                            </div>
                                        </td>
                                        <td style={{ textTransform: 'capitalize' }}>
                                            {interview.interviewType}
                                        </td>
                                        <td>
                                            <strong style={{ color: '#f8fafc' }}>
                                                {interview.scoring?.overallScore || interview.adminReview?.aiScore || '-'}
                                            </strong>
                                        </td>
                                        <td>
                                            {getRiskBadge(interview.proctoring?.riskLevel || 'low')}
                                        </td>
                                        <td>
                                            {interview.proctoring?.totalFlags || 0}
                                        </td>
                                        <td>
                                            {getPriorityBadge(interview.adminReview?.priorityLevel || 'normal')}
                                        </td>
                                        <td>
                                            {formatDate(interview.createdAt)}
                                        </td>
                                        <td>
                                            <button
                                                className="admin-action-btn primary"
                                                onClick={() => navigate(`/admin/interviews/${interview._id}`)}
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div className="admin-pagination">
                                <button
                                    className="admin-pagination-btn"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                                    Math.max(0, page - 3),
                                    Math.min(totalPages, page + 2)
                                ).map((p) => (
                                    <button
                                        key={p}
                                        className={`admin-pagination-btn ${p === page ? 'active' : ''}`}
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    className="admin-pagination-btn"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export default InterviewQueue;
