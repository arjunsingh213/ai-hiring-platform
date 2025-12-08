import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../jobseeker/JobListingsPage.css';

const CandidatesPage = () => {
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        experienceLevel: '',
        interviewCompleted: ''
    });

    useEffect(() => {
        fetchCandidates();
    }, [filters]);

    const fetchCandidates = async () => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user._id || user.id || localStorage.getItem('userId');

            if (!userId) {
                console.error('No user ID found');
                setLoading(false);
                return;
            }

            const params = new URLSearchParams();
            if (filters.interviewCompleted) params.append('interviewCompleted', filters.interviewCompleted);

            // Fetch from all-applicants endpoint
            console.log('Fetching candidates for recruiter:', userId);
            const response = await api.get(`/jobs/recruiter/${userId}/all-applicants?${params.toString()}`);

            // Handle response
            const applicants = Array.isArray(response) ? response :
                Array.isArray(response?.data) ? response.data : [];

            console.log('Candidates response:', applicants);

            // Transform the data to a simpler format for display
            const candidatesList = applicants.map((item, index) => {
                const userData = item.applicant?.userId || item.applicant || {};
                const profile = userData.profile || {};
                const uniqueId = userData._id || item.applicant?.userId?._id || `candidate-${index}`;
                return {
                    _id: uniqueId,
                    uniqueKey: `${uniqueId}-${item.jobId}-${index}`, // Unique key for React
                    userId: userData._id || item.applicant?.userId?._id, // Actual user ID for messaging
                    name: profile.name || userData.name || 'Unknown',
                    photo: profile.photo || userData.photo,
                    email: userData.email,
                    profession: profile.profession || userData.jobSeekerProfile?.profession || 'Professional',
                    experienceLevel: userData.jobSeekerProfile?.experienceLevel || 'Not specified',
                    college: userData.jobSeekerProfile?.college || '',
                    domain: userData.jobSeekerProfile?.domain || '',
                    desiredRole: userData.jobSeekerProfile?.desiredRole || '',
                    mobile: profile.mobile,
                    jobTitle: item.jobTitle,
                    jobId: item.jobId,
                    status: item.applicant?.status || 'applied',
                    appliedAt: item.applicant?.appliedAt,
                    interview: item.interview
                };
            });

            setCandidates(candidatesList);
            if (candidatesList.length > 0 && !selectedCandidate) {
                setSelectedCandidate(candidatesList[0]);
            }
        } catch (error) {
            console.error('Error fetching candidates:', error);
        } finally {
            setLoading(false);
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
                    {loading ? (
                        <div className="empty-state">
                            <p>Loading candidates...</p>
                        </div>
                    ) : (
                        <>
                            {candidates.map((candidate) => (
                                <div
                                    key={candidate.uniqueKey}
                                    className={`job-item ${selectedCandidate?.uniqueKey === candidate.uniqueKey ? 'active' : ''}`}
                                    onClick={() => setSelectedCandidate(candidate)}
                                >
                                    <h4>{candidate.name}</h4>
                                    <p className="company-name">{candidate.profession}</p>
                                    <p className="job-meta">
                                        {candidate.jobTitle} • {candidate.experienceLevel}
                                    </p>
                                    {candidate.interview?.status === 'completed' && (
                                        <span className="badge badge-success" style={{ marginTop: 'var(--spacing-sm)' }}>
                                            Score: {candidate.interview.overallScore}%
                                        </span>
                                    )}
                                </div>
                            ))}
                            {candidates.length === 0 && (
                                <div className="empty-state">
                                    <p>No candidates have applied to your jobs yet</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="job-details">
                {selectedCandidate ? (
                    <>
                        <div className="job-header">
                            <div className="company-logo">
                                {selectedCandidate.photo ? (
                                    <img src={selectedCandidate.photo} alt={selectedCandidate.name} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                        <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                        <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                                    </svg>
                                )}
                            </div>
                            <div className="job-title-section">
                                <h1>{selectedCandidate.name}</h1>
                                <p className="company-info">
                                    {selectedCandidate.profession} • Applied to: {selectedCandidate.jobTitle}
                                </p>
                                <div className="job-badges">
                                    <span className="badge">{selectedCandidate.experienceLevel}</span>
                                    <span className="badge">{selectedCandidate.domain || 'Not specified'}</span>
                                    {selectedCandidate.interview?.passed && (
                                        <span className="badge badge-success">Interview Passed</span>
                                    )}
                                </div>
                            </div>
                            <div className="job-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => navigate('/recruiter/messages', {
                                        state: {
                                            selectedUser: {
                                                _id: selectedCandidate.userId || selectedCandidate._id,
                                                name: selectedCandidate.name,
                                                photo: selectedCandidate.photo,
                                                email: selectedCandidate.email
                                            }
                                        }
                                    })}
                                >
                                    Contact Candidate
                                </button>
                                <button className="btn btn-secondary" onClick={() => navigate('/recruiter/applications')}>
                                    View in Applications
                                </button>
                            </div>
                        </div>

                        <div className="job-content card">
                            <section>
                                <h3>About</h3>
                                <p>
                                    {selectedCandidate.experienceLevel === 'experienced' ? 'Experienced' : 'Fresher'} professional
                                    {selectedCandidate.domain && ` in ${selectedCandidate.domain}`}.
                                    {selectedCandidate.desiredRole && ` Looking for opportunities as ${selectedCandidate.desiredRole}.`}
                                </p>
                            </section>

                            {selectedCandidate.interview?.status === 'completed' && (
                                <section>
                                    <h3>Interview Performance</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
                                        <div>
                                            <p className="text-muted" style={{ margin: '0 0 var(--spacing-xs) 0' }}>Overall Score</p>
                                            <h2 style={{ margin: 0, color: 'var(--primary-light)' }}>{selectedCandidate.interview.overallScore || 0}%</h2>
                                        </div>
                                        <div>
                                            <p className="text-muted" style={{ margin: '0 0 var(--spacing-xs) 0' }}>Technical</p>
                                            <h2 style={{ margin: 0, color: 'var(--accent)' }}>{selectedCandidate.interview.technicalScore || 0}%</h2>
                                        </div>
                                        <div>
                                            <p className="text-muted" style={{ margin: '0 0 var(--spacing-xs) 0' }}>Communication</p>
                                            <h2 style={{ margin: 0, color: 'var(--secondary)' }}>{selectedCandidate.interview.communicationScore || 0}%</h2>
                                        </div>
                                    </div>
                                    {selectedCandidate.interview.strengths?.length > 0 && (
                                        <>
                                            <h4>Strengths</h4>
                                            <ul>
                                                {selectedCandidate.interview.strengths.map((strength, index) => (
                                                    <li key={index}>{strength}</li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </section>
                            )}

                            {(!selectedCandidate.interview || selectedCandidate.interview.status !== 'completed') && (
                                <section>
                                    <h3>Interview Status</h3>
                                    <p className="text-muted">⏳ This candidate has not yet completed their AI interview.</p>
                                </section>
                            )}

                            <section>
                                <h3>Contact Information</h3>
                                <p><strong>Email:</strong> {selectedCandidate.email || 'Not provided'}</p>
                                <p><strong>Mobile:</strong> {selectedCandidate.mobile || 'Not provided'}</p>
                                <p><strong>Desired Role:</strong> {selectedCandidate.desiredRole || 'Not specified'}</p>
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

