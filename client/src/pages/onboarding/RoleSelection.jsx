import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './RoleSelection.css';

const RoleSelection = () => {
    const navigate = useNavigate();

    const selectRole = (role) => {
        navigate(`/signup?role=${role}`);
    };

    return (
        <div className="role-selection">
            <div className="role-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
            </div>

            <div className="role-container">
                <div className="role-header animate-fade-in">
                    <h1>Choose Your Path</h1>
                    <p>Select your role to get started with AI Interview Platform</p>
                </div>

                <div className="role-cards">
                    <div className="role-card card-glass animate-fade-in" onClick={() => selectRole('jobseeker')}>
                        <div className="role-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                        <h2>Job Seeker</h2>
                        <p>Find your dream job with AI-powered interviews and personalized recommendations</p>
                        <ul className="role-features">
                            <li>AI Interview Practice</li>
                            <li>Resume Analysis</li>
                            <li>Job Matching</li>
                            <li>Profile Verification</li>
                        </ul>
                        <button className="btn btn-primary">
                            Continue as Job Seeker
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>

                    <div className="role-card card-glass animate-fade-in" style={{ animationDelay: '0.2s' }} onClick={() => selectRole('recruiter')}>
                        <div className="role-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
                                <path d="M8 14H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M12 14H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M16 14H16.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M8 18H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M12 18H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <h2>Recruiter</h2>
                        <p>Find top talent with AI-assisted candidate search and interview management</p>
                        <ul className="role-features">
                            <li>Candidate Search</li>
                            <li>Interview Analytics</li>
                            <li>Applicant Tracking</li>
                            <li>Company Verification</li>
                        </ul>
                        <button className="btn btn-primary">
                            Continue as Recruiter
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="role-footer">
                    <p className="text-muted">
                        Already have an account? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
