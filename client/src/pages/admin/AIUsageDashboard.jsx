import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './AIUsageDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AIUsageDashboard = () => {
    const [stats, setStats] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        model: '',
        purpose: '',
        status: '',
        userId: ''
    });

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const headers = { 'Authorization': `Bearer ${token}` };

            const queryParams = new URLSearchParams({
                limit: 20,
                ...filters
            }).toString();

            const [statsRes, activityRes] = await Promise.all([
                fetch(`${API_URL}/admin/ai/stats`, { headers }),
                fetch(`${API_URL}/admin/ai/activity?${queryParams}`, { headers })
            ]);

            const statsData = await statsRes.json();
            const activityData = await activityRes.json();

            if (statsData.success) setStats(statsData.data);
            if (activityData.success) setActivity(activityData.data.logs);

        } catch (err) {
            console.error('Error fetching AI usage data:', err);
            setError('Connection failed');
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Periodically refresh for "real-time" feel
        const interval = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(interval);
    }, [fetchData, filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const formatTokens = (num) => {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading && !stats) {
        return (
            <div className="ai-usage-loading">
                <div className="admin-loading-spinner"></div>
            </div>
        );
    }

    const purposeData = stats?.byPurpose?.map(p => ({
        name: p._id.replace(/_/g, ' '),
        value: p.count
    })) || [];

    const modelData = stats?.byModel?.map(m => ({
        name: m._id.split('/').pop(),
        tokens: m.tokens,
        requests: m.requests
    })) || [];

    return (
        <div className="ai-usage-container">
            <div className="admin-page-header">
                <div>
                    <h1>AI Token Usage & Monitoring</h1>
                    <p>Real-time tracking of AI models, token consumption, and service health</p>
                </div>
                <button className="admin-refresh-btn" onClick={() => fetchData()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Stats Overview */}
            <div className="ai-stats-grid">
                <div className="ai-stat-card">
                    <div className="ai-stat-icon total">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <div className="ai-stat-content">
                        <h3>{stats?.overview?.totalRequests || 0}</h3>
                        <p>Total Requests</p>
                    </div>
                </div>

                <div className="ai-stat-card">
                    <div className="ai-stat-icon tokens">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                    </div>
                    <div className="ai-stat-content">
                        <h3>{formatTokens(stats?.overview?.totalTokens)}</h3>
                        <p>Total Tokens</p>
                    </div>
                </div>

                <div className="ai-stat-card">
                    <div className="ai-stat-icon input">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                    </div>
                    <div className="ai-stat-content">
                        <h3>{formatTokens(stats?.overview?.inputTokens)}</h3>
                        <p>Input Tokens</p>
                    </div>
                </div>

                <div className="ai-stat-card">
                    <div className="ai-stat-icon output">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 13l5 5m0 0l5-5m-5 5V6" />
                        </svg>
                    </div>
                    <div className="ai-stat-content">
                        <h3>{formatTokens(stats?.overview?.outputTokens)}</h3>
                        <p>Output Tokens</p>
                    </div>
                </div>

                <div className="ai-stat-card rate-card">
                    <div className="ai-stat-content">
                        <div className="rate-item">
                            <span className="label">RPM</span>
                            <span className="value">{stats?.overview?.rpm || 0}</span>
                        </div>
                        <div className="rate-divider"></div>
                        <div className="rate-item">
                            <span className="label">TPM</span>
                            <span className="value">{formatTokens(stats?.overview?.tpm)}</span>
                        </div>
                        <div className="rate-divider"></div>
                        <div className="rate-item">
                            <span className="label">RPD</span>
                            <span className="value">{stats?.overview?.rpd || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="ai-charts-grid">
                <div className="ai-chart-card">
                    <h3>Token Usage by Model</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={modelData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={120} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                    formatter={(value) => formatTokens(value)}
                                />
                                <Bar dataKey="tokens" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="ai-chart-card">
                    <h3>Requests by Purpose</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={purposeData}
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {purposeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* User Usage Section */}
            <div className="ai-activity-section ai-user-usage-section" style={{ marginBottom: '24px' }}>
                <div className="ai-section-header">
                    <div>
                        <h3 style={{ margin: 0 }}>Usage by User</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                            Top users by cumulative token consumption
                        </p>
                    </div>
                </div>
                <div className="ai-table-wrapper">
                    <table className="ai-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Total Tokens</th>
                                <th>Requests</th>
                                <th>Efficiency (T/R)</th>
                                <th>Last Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.byUser?.map((user) => (
                                <tr key={user.userId}>
                                    <td>
                                        <div className="ai-user-info">
                                            <span className="name">{user.name || 'Unknown'}</span>
                                            <span className="email">{user.email || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: '600' }}>{user.totalTokens.toLocaleString()}</td>
                                    <td>{user.requests}</td>
                                    <td>{user.requests > 0 ? Math.round(user.totalTokens / user.requests) : 0}</td>
                                    <td>{formatTimeAgo(user.lastUsed)}</td>
                                </tr>
                            ))}
                            {(!stats?.byUser || stats.byUser.length === 0) && (
                                <tr>
                                    <td colSpan="5" className="ai-empty-state">No user usage data found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="ai-activity-section">
                <div className="ai-section-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3>Recent AI Activity</h3>
                        <div className="ai-tag">Live Feed</div>
                    </div>

                    <div className="ai-filters">
                        <select name="model" value={filters.model} onChange={handleFilterChange}>
                            <option value="">All Models</option>
                            {stats?.byModel?.map(m => (
                                <option key={m._id} value={m._id}>{m._id.split('/').pop()}</option>
                            ))}
                        </select>
                        <select name="purpose" value={filters.purpose} onChange={handleFilterChange}>
                            <option value="">All Purposes</option>
                            {stats?.byPurpose?.map(p => (
                                <option key={p._id} value={p._id}>{p._id.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                        <select name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">All Status</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>
                <div className="ai-table-wrapper">
                    <table className="ai-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Model</th>
                                <th>Purpose</th>
                                <th>Tokens</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activity.map((log) => (
                                <tr key={log._id}>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}>{formatTimeAgo(log.timestamp)}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                            {new Date(log.timestamp).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="ai-user-info">
                                            <span className="name">{log.userId?.profile?.name || 'System'}</span>
                                            <span className="email">{log.userId?.email || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td><span className="ai-tag">{log.model.split('/').pop()}</span></td>
                                    <td><span className="ai-tag">{log.purpose.replace(/_/g, ' ')}</span></td>
                                    <td style={{ fontWeight: '600' }}>{log.totalTokens.toLocaleString()}</td>
                                    <td>
                                        <span className={`ai-badge ${log.status}`}>
                                            {log.status === 'success' ? 'SUCCESS' : 'FAILED'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {activity.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="ai-empty-state">
                                        <div style={{ textAlign: 'center' }}>No AI activity has been recorded yet.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AIUsageDashboard;
