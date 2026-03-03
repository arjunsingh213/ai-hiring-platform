import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * JobShareRedirect — Public route handler for /jobs/:jobId
 * 
 * - If user is logged in as a job seeker → redirects to /jobseeker/jobs?id=:jobId
 * - If user is logged in as a recruiter → redirects to /recruiter/my-jobs?id=:jobId
 * - If user is NOT logged in → redirects to /login?redirect=/jobs/:jobId
 */
const JobShareRedirect = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('userRole');

        if (!token) {
            // Not logged in — send to login with redirect back
            navigate(`/login?redirect=/jobs/${jobId}`, { replace: true });
        } else if (role === 'recruiter') {
            // Recruiter — send to recruiter's job view
            navigate(`/recruiter/my-jobs?id=${jobId}`, { replace: true });
        } else {
            // Job seeker (or any other role) — send to job seeker job listings
            navigate(`/jobseeker/jobs?id=${jobId}`, { replace: true });
        }
    }, [jobId, navigate]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'var(--bg-primary, #0a0f1e)',
            color: 'var(--text-primary, #fff)',
            fontFamily: 'Inter, sans-serif'
        }}>
            <p>Redirecting to job...</p>
        </div>
    );
};

export default JobShareRedirect;
