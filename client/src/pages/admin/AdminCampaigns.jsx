import React, { useState, useEffect } from 'react';
import './AdminCampaigns.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminCampaigns = () => {
    const [stats, setStats] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterType, setFilterType] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, [page, filterType]);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('adminToken');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [statsRes, logsRes] = await Promise.all([
                fetch(`${API_URL}/admin/campaign-stats`, { headers }),
                fetch(`${API_URL}/admin/campaign-logs?page=${page}&limit=20${filterType ? `&emailType=${filterType}` : ''}`, { headers })
            ]);

            const statsData = await statsRes.json();
            const logsData = await logsRes.json();

            if (statsData.success) {
                setStats(statsData.data);
            }
            if (logsData.success) {
                setLogs(logsData.data.logs);
                setTotalPages(logsData.data.pagination.pages);
            }
        } catch (err) {
            console.error('Failed to fetch campaign data:', err);
            setError('Failed to load campaign data');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });
    };

    const formatType = (type) => {
        if (!type) return '';
        return type.replace(/_/g, ' ');
    };

    const getTotalEmails = () => {
        return stats.reduce((sum, item) => sum + item.count, 0);
    };

    const getStatCount = (type) => {
        const stat = stats.find(s => s._id === type);
        return stat ? stat.count : 0;
    };

    return (
        <div className="admin-campaigns-container">
            <div className="campaigns-header">
                <h2>Engagement Campaigns</h2>
                <p>Track automated emails sent to re-engage users.</p>
            </div>

            {error && <div className="admin-error-message">{error}</div>}

            <div className="campaign-stats-grid">
                <div className="campaign-stat-card total">
                    <h3>{getTotalEmails()}</h3>
                    <p>Total Sent</p>
                </div>
                <div className="campaign-stat-card welcome">
                    <h3>{getStatCount('welcome')}</h3>
                    <p>Welcome</p>
                </div>
                <div className="campaign-stat-card half_baked_interview">
                    <h3>{getStatCount('half_baked_interview')}</h3>
                    <p>Half-baked Interviews</p>
                </div>
                <div className="campaign-stat-card incomplete_profile">
                    <h3>{getStatCount('incomplete_profile')}</h3>
                    <p>Incomplete Profiles</p>
                </div>
                <div className="campaign-stat-card inactive_user">
                    <h3>{getStatCount('inactive_user')}</h3>
                    <p>Inactive Users</p>
                </div>
            </div>

            <div className="campaigns-controls">
                <select 
                    className="campaign-filter-select"
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                >
                    <option value="">All Email Types</option>
                    <option value="welcome">Welcome</option>
                    <option value="half_baked_interview">Half-baked Interview</option>
                    <option value="incomplete_profile">Incomplete Profile</option>
                    <option value="inactive_user">Inactive User</option>
                    <option value="interview_reminder">Interview Reminder</option>
                </select>
                <button className="admin-refresh-btn" onClick={fetchDashboardData}>
                    Refresh
                </button>
            </div>

            <div className="campaign-logs-table-container">
                <table className="campaign-logs-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email Type</th>
                            <th>Subject</th>
                            <th>Sent At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && logs.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No campaign logs found.</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log._id}>
                                    <td>
                                        <div><strong>{log.userId?.profile?.name || 'Unknown'}</strong></div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{log.userId?.email || 'N/A'}</div>
                                    </td>
                                    <td>
                                        <span className={`campaign-type-badge ${log.emailType}`}>
                                            {formatType(log.emailType)}
                                        </span>
                                    </td>
                                    <td>{log.subject}</td>
                                    <td>{formatDate(log.sentAt)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="campaigns-pagination">
                    <button 
                        disabled={page === 1} 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button 
                        disabled={page === totalPages} 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminCampaigns;
