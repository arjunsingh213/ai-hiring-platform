import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './JobBanner.css';

const JobBanner = () => {
    const [topJob, setTopJob] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if banner is dismissed in local storage
        const isDismissed = localStorage.getItem('jobBannerDismissed') === 'true';
        if (isDismissed) {
            return;
        }

        const fetchTopJob = async () => {
            try {
                // Fetch latest job
                const res = await api.get('/jobs?limit=1');
                const jobs = res.data || [];
                if (jobs.length > 0) {
                    setTopJob(jobs[0]);
                    setIsVisible(true);
                }
            } catch (error) {
                console.error('Failed to fetch top job for banner:', error);
            }
        };

        fetchTopJob();
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('jobBannerDismissed', 'true');
    };

    const handleApply = () => {
        if (topJob) {
            navigate(`/jobseeker/jobs/${topJob._id}`);
        }
    };

    if (!isVisible || !topJob) {
        return null;
    }

    return (
        <div className="job-banner-container">
            <div className="job-banner-content">
                <span className="job-banner-highlight">New earning opportunity!</span>
                <span className="job-banner-text">
                    - Apply for the <strong>{topJob.title}</strong> role at {topJob.company?.name || 'our partner company'} –
                </span>
                <button className="job-banner-link" onClick={handleApply}>
                    Apply Now
                </button>
            </div>
            <button className="job-banner-close" onClick={handleDismiss} aria-label="Dismiss banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    );
};

export default JobBanner;
