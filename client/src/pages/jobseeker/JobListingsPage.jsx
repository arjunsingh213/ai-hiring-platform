import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import './JobListingsPage.css';

const JobListingsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const queryParams = new URLSearchParams(location.search);
    const initialViewMode = queryParams.get('view') || 'grid';

    const [jobs, setJobs] = useState([]);
    const [viewMode, setViewMode] = useState(initialViewMode); // 'grid' | 'list'
    const [categoryFilter, setCategoryFilter] = useState('all'); // all, applied, rejected
    const [filters, setFilters] = useState({
        type: '',
        experienceLevel: ''
    });
    const [loading, setLoading] = useState(true);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchJobs();
    }, [filters]);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.type) params.append('type', filters.type);
            if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);

            const response = await api.get(`/jobs?${params.toString()}`);
            setJobs(response.data || []);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            toast.error('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const hasApplied = (job) => {
        return job.applicants?.some(app => app.userId === userId || app.userId?._id === userId);
    };

    const handleApplyClick = (jobId, e) => {
        if (e) e.stopPropagation();
        navigate(`/jobseeker/jobs/${jobId}`);
    };

    const filteredJobs = jobs.filter(job => {
        if (categoryFilter === 'applied') return hasApplied(job);
        if (categoryFilter === 'rejected') return false;
        return true;
    });

    const formatDate = (dateString) => {
        if (!dateString) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="job-listings">
            <div className="jobs-header">
                <div className="header-left-controls">
                    <div className="category-tabs">
                        <button className={`category-tab ${categoryFilter === 'all' ? 'active' : ''}`} onClick={() => setCategoryFilter('all')}>All Jobs</button>
                        <button className={`category-tab ${categoryFilter === 'applied' ? 'active' : ''}`} onClick={() => setCategoryFilter('applied')}>Applied</button>
                        <button className={`category-tab ${categoryFilter === 'rejected' ? 'active' : ''}`} onClick={() => setCategoryFilter('rejected')}>Rejected</button>
                    </div>
                </div>

                <div className="header-right-controls">
                    <div className="filter-controls">
                        <select className="filter-select" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                            <option value="">All Types</option>
                            <option value="full-time">Full Time</option>
                            <option value="part-time">Part Time</option>
                            <option value="contract">Contract</option>
                            <option value="internship">Internship</option>
                        </select>
                        <select className="filter-select" value={filters.experienceLevel} onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}>
                            <option value="">All Levels</option>
                            <option value="Entry Level">Entry Level</option>
                            <option value="Junior">Junior</option>
                            <option value="Mid Level">Mid Level</option>
                            <option value="Senior">Senior</option>
                        </select>
                    </div>
                    
                    <div className="view-toggle">
                        <button 
                            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} 
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                        </button>
                        <button 
                            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} 
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className={`jobs-content ${viewMode}-mode`}>
                {/* Domain Interview Banner — pinned at top */}
                <div className="domain-interview-banner" onClick={() => navigate('/onboarding/jobseeker?step=interview')}>
                    <div className="dib-content">
                        <div className="dib-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        </div>
                        <div className="dib-text">
                            <h4>Stand Out — Take the Domain Interview</h4>
                            <p>Complete an AI-powered domain interview to verify your skills and get prioritized by recruiters. Candidates with verified skills are <strong>3x more likely</strong> to get hired.</p>
                        </div>
                        <div className="dib-cta">
                            <span className="dib-btn">
                                Take Interview
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12H19M19 12L12 5M19 12L12 19"/></svg>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="jobs-count-banner">
                    {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'} Available
                </div>

                <div className="jobs-container">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                        </div>
                    ) : filteredJobs.length > 0 ? (
                        filteredJobs.map((job) => (
                            <div
                                key={job._id}
                                className={`job-card ${viewMode}-card`}
                                onClick={() => handleApplyClick(job._id)}
                            >
                                {viewMode === 'grid' ? (
                                    // GRID VIEW LAYOUT
                                    <div className="grid-card-inner">
                                        <div className="grid-card-date">{formatDate(job.createdAt)}</div>
                                        <h3 className="grid-card-title">{job.title}</h3>
                                        
                                        <div className="grid-card-skills-section">
                                            <p className="section-label">Required skills</p>
                                            <div className="grid-skills-list">
                                                {job.requirements?.skills?.slice(0, 4).map((skill, index) => (
                                                    <span key={index} className="grid-skill-pill">{skill}</span>
                                                ))}
                                                {job.requirements?.skills?.length > 4 && (
                                                    <span className="grid-skill-pill">+{job.requirements.skills.length - 4}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid-card-footer">
                                            {job.jobDetails?.salary ? (
                                                <div className="grid-card-pay">
                                                    Pay: {job.jobDetails.salary.currency === 'USD' ? '$' : ''}{job.jobDetails.salary.min >= 1000 ? (job.jobDetails.salary.min / 1000) + 'k' : job.jobDetails.salary.min} - {job.jobDetails.salary.max >= 1000 ? (job.jobDetails.salary.max / 1000) + 'k' : job.jobDetails.salary.max} / {job.jobDetails.salary.period === 'hourly' ? 'hr' : job.jobDetails.salary.period === 'monthly' ? 'mo' : 'yr'}
                                                </div>
                                            ) : (
                                                <div className="grid-card-pay">Pay: Competitive</div>
                                            )}
                                            <button 
                                                className="btn btn-primary grid-apply-btn"
                                                onClick={(e) => handleApplyClick(job._id, e)}
                                            >
                                                {hasApplied(job) ? 'View Status' : 'Apply'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // LIST VIEW LAYOUT
                                    <div className="list-card-inner">
                                        <div className="job-card-main">
                                            <div className="company-avatar">
                                                {job.company?.logo ? (
                                                    <img src={job.company.logo} alt={job.company.name} />
                                                ) : (
                                                    <div className="avatar-placeholder">
                                                        {job.company?.name?.charAt(0) || 'C'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="job-info">
                                                <h4>{job.title}</h4>
                                                <p className="company-name">{job.company?.name || 'Company'}</p>
                                                <p className="job-type">• {job.jobDetails?.type}</p>
                                            </div>
                                            <div className="job-skills-preview">
                                                {job.requirements?.skills?.slice(0, 3).map((skill, index) => (
                                                    <span key={index} className="list-skill-tag">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="list-card-actions">
                                            {hasApplied(job) && (
                                                <span className="applied-pill">Applied</span>
                                            )}
                                            <button 
                                                className="btn btn-secondary list-apply-btn"
                                                onClick={(e) => handleApplyClick(job._id, e)}
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="empty-state card-glass">
                            <p>No jobs found matching your criteria</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobListingsPage;
