import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../jobseeker/JobListingsPage.css';

const CandidatesPage = () => {
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [filters, setFilters] = useState({
        experienceLevel: '',
        interviewCompleted: ''
    });

    useEffect(() => {
        fetchCandidates();
    }, [filters]);

    const fetchCandidates = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
            if (filters.interviewCompleted) params.append('interviewCompleted', filters.interviewCompleted);

            const response = await api.get(`/users/role/jobseekers?${params.toString()}`);
            setCandidates(response.data || []);
            if (response.data?.length > 0 && !selectedCandidate) {
                setSelectedCandidate(response.data[0]);
            }
        } catch (error) {
            console.error('Error fetching candidates:', error);
        }
    };

    return (
        <div className="job-listings">
            <div className="jobs-sidebar">
                <div className="filters-section">
                    <h3>Filters</h3>
                    <div className="filter-group">
                        <label>Experience Level</label>
                        <select
                            className="input"
                            value={filters.experienceLevel}
                            onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
                        >
                            <option value="">All Levels</option>
                            <option value="fresher">Fresher</option>
                            <option value="experienced">Experienced</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Interview Status</label>
                        <select
                            className="input"
                            value={filters.interviewCompleted}
                            onChange={(e) => setFilters({ ...filters, interviewCompleted: e.target.value })}
                        >
                            <option value="">All</option>
                            <option value="true">Completed</option>
                            <option value="false">Not Completed</option>
                        </select>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setFilters({ experienceLevel: '', interviewCompleted: '' })}>
                        Clear Filters
                    </button>
                </div>

                <div className="jobs-list">
                    <h3>Candidates ({candidates.length})</h3>
                    {candidates.map((candidate) => (
                        <div
                            key={candidate._id}
                            className={`job-item ${selectedCandidate?._id === candidate._id ? 'active' : ''}`}
                            onClick={() => setSelectedCandidate(candidate)}
                        >
                            <h4>{candidate.profile?.name}</h4>
                            <p className="company-name">{candidate.jobSeekerProfile?.profession}</p>
                            <p className="job-meta">
                                {candidate.jobSeekerProfile?.college} • {candidate.jobSeekerProfile?.experienceLevel}
                            </p>
                            {candidate.interviewStatus?.completed && (
                                <span className="badge badge-success" style={{ marginTop: 'var(--spacing-sm)' }}>
                                    Interview Score: {candidate.interviewStatus.overallScore}
                                </span>
                            )}
                        </div>
                    ))}
                    {candidates.length === 0 && (
                        <div className="empty-state">
                            <p>No candidates found</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="job-details">
                {selectedCandidate ? (
                    <>
                        <div className="job-header">
                            <div className="company-logo">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                    <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                    <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                                </svg>
                            </div>
                            <div className="job-title-section">
                                <h1>{selectedCandidate.profile?.name}</h1>
                                <p className="company-info">
                                    {selectedCandidate.jobSeekerProfile?.profession} • {selectedCandidate.jobSeekerProfile?.college}
                                </p>
                                <div className="job-badges">
                                    <span className="badge">{selectedCandidate.jobSeekerProfile?.experienceLevel}</span>
                                    <span className="badge">{selectedCandidate.jobSeekerProfile?.domain}</span>
                                    {selectedCandidate.interviewStatus?.cracked && (
                                        <span className="badge badge-success">Interview Cracked</span>
                                    )}
                                </div>
                            </div>
                            <div className="job-actions">
                                <button className="btn btn-primary">
                                    Contact Candidate
                                </button>
                                <button className="btn btn-secondary">
                                    Save Profile
                                </button>
                            </div>
                        </div>

                        <div className="job-tabs">
                            <button className="tab-btn active">Profile</button>
                            <button className="tab-btn">Interview Results</button>
                            <button className="tab-btn">Resume</button>
                        </div>

                        <div className="job-content card">
                            <section>
                                <h3>About</h3>
                                <p>
                                    {selectedCandidate.jobSeekerProfile?.experienceLevel === 'experienced' ? 'Experienced' : 'Fresher'} professional
                                    in {selectedCandidate.jobSeekerProfile?.domain}. Looking for opportunities as {selectedCandidate.jobSeekerProfile?.desiredRole}.
                                </p>
                            </section>

                            {selectedCandidate.interviewStatus?.completed && (
                                <section>
                                    <h3>Interview Performance</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
                                        <div>
                                            <p className="text-muted" style={{ margin: '0 0 var(--spacing-xs) 0' }}>Overall Score</p>
                                            <h2 style={{ margin: 0, color: 'var(--primary-light)' }}>{selectedCandidate.interviewStatus.overallScore}/100</h2>
                                        </div>
                                        <div>
                                            <p className="text-muted" style={{ margin: '0 0 var(--spacing-xs) 0' }}>Technical</p>
                                            <h2 style={{ margin: 0, color: 'var(--accent)' }}>{selectedCandidate.interviewStatus.technicalScore}/100</h2>
                                        </div>
                                        <div>
                                            <p className="text-muted" style={{ margin: '0 0 var(--spacing-xs) 0' }}>HR</p>
                                            <h2 style={{ margin: 0, color: 'var(--secondary)' }}>{selectedCandidate.interviewStatus.hrScore}/100</h2>
                                        </div>
                                    </div>
                                    {selectedCandidate.interviewStatus.strengths?.length > 0 && (
                                        <>
                                            <h4>Strengths</h4>
                                            <ul>
                                                {selectedCandidate.interviewStatus.strengths.map((strength, index) => (
                                                    <li key={index}>{strength}</li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </section>
                            )}

                            <section>
                                <h3>Contact Information</h3>
                                <p><strong>Mobile:</strong> {selectedCandidate.profile?.mobile || 'Not provided'}</p>
                                <p><strong>Desired Role:</strong> {selectedCandidate.jobSeekerProfile?.desiredRole}</p>
                            </section>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                            <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" />
                            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <h3>Select a candidate to view details</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CandidatesPage;
