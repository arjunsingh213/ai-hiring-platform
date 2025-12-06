import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './JobPostingPage.css';

const JobPostingPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        skills: '',
        minExperience: '',
        maxExperience: '',
        education: '',
        type: 'full-time',
        location: '',
        remote: false,
        salaryMin: '',
        salaryMax: '',
        currency: 'USD'
    });
    const [loading, setLoading] = useState(false);
    const userId = localStorage.getItem('userId');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const jobData = {
                recruiterId: userId,
                title: formData.title,
                description: formData.description,
                requirements: {
                    skills: formData.skills.split(',').map(s => s.trim()),
                    minExperience: parseInt(formData.minExperience) || 0,
                    maxExperience: parseInt(formData.maxExperience) || 10,
                    education: [formData.education]
                },
                jobDetails: {
                    type: formData.type,
                    location: formData.location,
                    remote: formData.remote,
                    salary: {
                        min: parseInt(formData.salaryMin) || 0,
                        max: parseInt(formData.salaryMax) || 0,
                        currency: formData.currency,
                        period: 'yearly'
                    }
                },
                status: 'active'
            };

            await api.post('/jobs', jobData);
            alert('Job posted successfully!');
            navigate('/recruiter/home');
        } catch (error) {
            console.error('Error posting job:', error);
            alert('Failed to post job');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="job-posting-page">
            <div className="page-header">
                <h1>Post a New Job</h1>
                <p className="text-muted">Fill in the details to create a job posting</p>
            </div>

            <form onSubmit={handleSubmit} className="job-form card">
                <section className="form-section">
                    <h3>Job Details</h3>

                    <div className="form-group">
                        <label className="form-label">Job Title *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="input"
                            placeholder="e.g. Senior Software Engineer"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Job Description *</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="input"
                            rows="8"
                            placeholder="Describe the role, responsibilities, and what you're looking for..."
                            required
                        />
                        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 'var(--spacing-sm)' }}>
                            💡 Tip: Our AI will format and enhance your job description
                        </p>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Job Type *</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="full-time">Full Time</option>
                                <option value="part-time">Part Time</option>
                                <option value="contract">Contract</option>
                                <option value="internship">Internship</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Location *</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g. San Francisco, CA"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="remote"
                                checked={formData.remote}
                                onChange={handleChange}
                            />
                            <span>Remote work available</span>
                        </label>
                    </div>
                </section>

                <section className="form-section">
                    <h3>Requirements</h3>

                    <div className="form-group">
                        <label className="form-label">Required Skills *</label>
                        <input
                            type="text"
                            name="skills"
                            value={formData.skills}
                            onChange={handleChange}
                            className="input"
                            placeholder="e.g. React, Node.js, MongoDB (comma separated)"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Min Experience (years)</label>
                            <input
                                type="number"
                                name="minExperience"
                                value={formData.minExperience}
                                onChange={handleChange}
                                className="input"
                                placeholder="0"
                                min="0"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Max Experience (years)</label>
                            <input
                                type="number"
                                name="maxExperience"
                                value={formData.maxExperience}
                                onChange={handleChange}
                                className="input"
                                placeholder="10"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Education</label>
                        <input
                            type="text"
                            name="education"
                            value={formData.education}
                            onChange={handleChange}
                            className="input"
                            placeholder="e.g. Bachelor's in Computer Science"
                        />
                    </div>
                </section>

                <section className="form-section">
                    <h3>Compensation</h3>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Min Salary</label>
                            <input
                                type="number"
                                name="salaryMin"
                                value={formData.salaryMin}
                                onChange={handleChange}
                                className="input"
                                placeholder="50000"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Max Salary</label>
                            <input
                                type="number"
                                name="salaryMax"
                                value={formData.salaryMax}
                                onChange={handleChange}
                                className="input"
                                placeholder="100000"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Currency</label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="INR">INR</option>
                            </select>
                        </div>
                    </div>
                </section>

                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/recruiter/home')}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Posting...' : 'Post Job'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default JobPostingPage;
