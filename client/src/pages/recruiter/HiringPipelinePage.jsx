import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import ProgressBar from '../../components/ProgressBar';
import StatusBadge from '../../components/StatusBadge';
import { CardSkeleton } from '../../components/Skeleton';
import './HiringPipelinePage.css';

const HiringPipelinePage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [hiringProcesses, setHiringProcesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        stage: '',
        search: ''
    });

    useEffect(() => {
        fetchHiringProcesses();
    }, [filters.stage]);

    const fetchHiringProcesses = async () => {
        try {
            setLoading(true);
            const userId = localStorage.getItem('userId');
            const params = new URLSearchParams();
            if (filters.stage) params.append('stage', filters.stage);

            const response = await api.get(`/hiring/recruiter/${userId}?${params.toString()}`);
            setHiringProcesses(response.data || []);
        } catch (error) {
            console.error('Error fetching hiring processes:', error);
            toast.error('Failed to load hiring pipeline');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredProcesses = () => {
        if (!filters.search) return hiringProcesses;

        return hiringProcesses.filter(hp => {
            const name = hp.applicantId?.profile?.name || '';
            const position = hp.offer?.position || '';
            return name.toLowerCase().includes(filters.search.toLowerCase()) ||
                position.toLowerCase().includes(filters.search.toLowerCase());
        });
    };

    const getStats = () => {
        return {
            total: hiringProcesses.length,
            pendingDocs: hiringProcesses.filter(hp => hp.currentStage === 'documents_pending').length,
            startingSoon: hiringProcesses.filter(hp => {
                const daysUntilStart = Math.ceil((new Date(hp.offer?.startDate) - new Date()) / (1000 * 60 * 60 * 24));
                return daysUntilStart <= 7 && daysUntilStart > 0;
            }).length
        };
    };

    const formatDate = (date) => {
        if (!date) return 'Not set';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getDaysUntil = (date) => {
        if (!date) return null;
        const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
        if (days < 0) return 'Started';
        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        return `${days} days`;
    };

    const stats = getStats();
    const filteredProcesses = getFilteredProcesses();

    if (loading) {
        return (
            <div className="hiring-pipeline">
                <div className="page-header"><h1>Hiring Pipeline</h1></div>
                <div className="loading-state skeleton-loading">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </div>
        );
    }

    return (
        <div className="hiring-pipeline">
            <div className="page-header">
                <div>
                    <h1>Hiring Pipeline</h1>
                    <p className="page-subtitle">Manage all active hiring processes</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/recruiter/applications')}
                >
                    View Applications
                </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card card-glass">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Active Hires</div>
                    </div>
                </div>
                <div className="stat-card card-glass">
                    <div className="stat-icon">📄</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.pendingDocs}</div>
                        <div className="stat-label">Pending Documents</div>
                    </div>
                </div>
                <div className="stat-card card-glass">
                    <div className="stat-icon">🚀</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.startingSoon}</div>
                        <div className="stat-label">Starting This Week</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar card">
                <div className="search-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name or position..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="search-input"
                    />
                </div>
                <select
                    value={filters.stage}
                    onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                    className="filter-select"
                >
                    <option value="">All Stages</option>
                    <option value="offer_extended">Offer Extended</option>
                    <option value="offer_accepted">Offer Accepted</option>
                    <option value="documents_pending">Documents Pending</option>
                    <option value="documents_complete">Documents Complete</option>
                    <option value="onboarding_complete">Onboarding Complete</option>
                </select>
            </div>

            {/* Hiring Processes List */}
            <div className="hiring-list">
                {filteredProcesses.length === 0 ? (
                    <div className="empty-state card">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                            <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" />
                            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                            <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <h3>No hiring processes found</h3>
                        <p>Hire candidates from the applications page to start the onboarding process</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/recruiter/applications')}
                        >
                            View Applications
                        </button>
                    </div>
                ) : (
                    filteredProcesses.map((hp) => (
                        <div
                            key={hp._id}
                            className="hiring-card card"
                            onClick={() => navigate(`/recruiter/onboarding/${hp._id}`)}
                        >
                            <div className="hiring-card-header">
                                <div className="candidate-info">
                                    {hp.applicantId?.profile?.photo ? (
                                        <img
                                            src={hp.applicantId.profile.photo}
                                            alt={hp.applicantId.profile.name}
                                            className="candidate-avatar"
                                        />
                                    ) : (
                                        <div className="candidate-avatar-placeholder">
                                            {hp.applicantId?.profile?.name?.charAt(0) || '?'}
                                        </div>
                                    )}
                                    <div>
                                        <h3>{hp.applicantId?.profile?.name || 'Unknown'}</h3>
                                        <p className="position-title">{hp.offer?.position}</p>
                                    </div>
                                </div>
                                <StatusBadge status={hp.currentStage} />
                            </div>

                            <div className="hiring-card-details">
                                <div className="detail-item">
                                    <span className="detail-label">Start Date</span>
                                    <span className="detail-value">
                                        {formatDate(hp.offer?.startDate)}
                                        {getDaysUntil(hp.offer?.startDate) && (
                                            <span className="days-until"> ({getDaysUntil(hp.offer?.startDate)})</span>
                                        )}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Location</span>
                                    <span className="detail-value">{hp.offer?.location || 'Not specified'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Documents</span>
                                    <span className="detail-value">
                                        {hp.progress?.documentsCompleted || 0}/{hp.progress?.documentsTotal || 9}
                                    </span>
                                </div>
                            </div>

                            <ProgressBar
                                progress={hp.progress?.overallProgress || 0}
                                color="primary"
                                showPercentage={true}
                                height="md"
                            />

                            <div className="hiring-card-actions">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/recruiter/onboarding/${hp._id}`);
                                    }}
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HiringPipelinePage;
