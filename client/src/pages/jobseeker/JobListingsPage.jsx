import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './JobListingsPage.css';

const JobListingsPage = () => {
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [filters, setFilters] = useState({
        type: '',
        experienceLevel: ''
    });
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchJobs();
    }, [filters]);

    const fetchJobs = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.type) params.append('type', filters.type);
            if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);

            const response = await api.get(`/jobs?${params.toString()}`);
            setJobs(response.data || []);
            if (response.data?.length > 0 && !selectedJob) {
                setSelectedJob(response.data[0]);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
    };

    const applyToJob = async (jobId) => {
        try {
            await api.post(`/jobs/${jobId}/apply`, { userId });
            alert('Application submitted successfully!');
            fetchJobs();
        } catch (error) {
            console.error('Error applying to job:', error);
            alert(error.response?.data?.error || 'Failed to apply');
        }
    };

    return (
        <div className="job-listings">
            <div className="jobs-sidebar">
                <div className="filters-section">
                    <h3>Filters</h3>
                    <div className="filter-group">
                        <label>Job Type</label>
                        <select
                            className="input"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        >
                            <option value="">All Types</option>
                            <option value="full-time">Full Time</option>
                            <option value="part-time">Part Time</option>
                            <option value="contract">Contract</option>
                            <option value="internship">Internship</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Experience Level</label>
                        <select
                            className="input"
                            value={filters.experienceLevel}
                            onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
                        >
                            <option value="">All Levels</option>
                            <option value="entry">Entry Level</option>
                            <option value="mid">Mid Level</option>
                            <option value="senior">Senior Level</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setFilters({ type: '', experienceLevel: '' })}>
                        Clear Filters
                    </button>
                </div>

                <div className="jobs-list">
                    <h3>Jobs ({jobs.length})</h3>
                    {jobs.map((job) => (
                        <div
                            key={job._id}
                            className={`job-item ${selectedJob?._id === job._id ? 'active' : ''}`}
                            onClick={() => setSelectedJob(job)}
                        >
                            <h4>{job.title}</h4>
                            <p className="company-name">{job.company?.name}</p>
                            <p className="job-meta">
                                {job.company?.location} • {job.jobDetails?.type}
                            </p>
                        </div>
                    ))}
                    {jobs.length === 0 && (
                        <div className="empty-state">
                            <p>No jobs found</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="job-details">
                {selectedJob ? (
                    <>
                        <div className="job-header">
                            <div className="company-logo">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                                    <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                    <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            </div>
                            <div className="job-title-section">
                                <h1>{selectedJob.title}</h1>
                                <p className="company-info">
                                    {selectedJob.company?.name} • {selectedJob.company?.location}
                                </p>
                                <div className="job-badges">
                                    <span className="badge">{selectedJob.jobDetails?.type}</span>
                                    <span className="badge badge-primary">{selectedJob.requirements?.experienceLevel}</span>
                                    {selectedJob.jobDetails?.remote && <span className="badge badge-success">Remote</span>}
                                </div>
                            </div>
                            <div className="job-actions">
                                <button className="btn btn-primary" onClick={() => applyToJob(selectedJob._id)}>
                                    Apply Now
                                </button>
                                <button className="btn btn-secondary">
                                    Save
                                </button>
                            </div>
                        </div>

                        <div className="job-tabs">
                            <button className="tab-btn active">Job Description</button>
                            <button className="tab-btn">Company Profile</button>
                        </div>

                        <div className="job-content card">
                            <section>
                                <h3>About the Role</h3>
                                <p>{selectedJob.description}</p>
                            </section>

                            <section>
                                <h3>Required Skills</h3>
                                <div className="skills-list">
                                    {selectedJob.requirements?.skills?.map((skill, index) => (
                                        <span key={index} className="skill-tag">{skill}</span>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3>Requirements</h3>
                                <ul>
                                    <li>Experience: {selectedJob.requirements?.minExperience || 0}-{selectedJob.requirements?.maxExperience || 5} years</li>
                                    <li>Education: {selectedJob.requirements?.education?.join(', ') || 'Not specified'}</li>
                                </ul>
                            </section>

                            {selectedJob.jobDetails?.salary && (
                                <section>
                                    <h3>Compensation</h3>
                                    <p>
                                        {selectedJob.jobDetails.salary.currency} {selectedJob.jobDetails.salary.min?.toLocaleString()} - {selectedJob.jobDetails.salary.max?.toLocaleString()} / {selectedJob.jobDetails.salary.period}
                                    </p>
                                </section>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <h3>Select a job to view details</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobListingsPage;
