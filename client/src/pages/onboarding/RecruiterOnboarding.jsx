import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../onboarding/Onboarding.css';

const RecruiterOnboarding = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        companyName: '',
        position: '',
        companySize: '',
        industry: '',
        website: '',
        linkedin: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = () => {
        if (step < 2) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        // Validate required fields
        if (!formData.name || !formData.mobile || !formData.position || !formData.companyName || !formData.companySize || !formData.industry) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const userData = {
                role: 'recruiter',
                profile: {
                    name: formData.name.trim(),
                    mobile: formData.mobile.trim()
                },
                recruiterProfile: {
                    position: formData.position,
                    companyName: formData.companyName.trim(),
                    companyDomain: formData.industry.trim(),
                    companyWebsite: formData.website || '',
                    verified: false
                }
            };

            console.log('Submitting recruiter data:', userData);

            const response = await api.post('/users', userData);
            const userId = response.data.data?._id || response.data._id;

            localStorage.setItem('userId', userId);
            localStorage.setItem('userRole', 'recruiter');

            navigate('/recruiter/home');
        } catch (error) {
            console.error('Onboarding error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to complete onboarding';
            alert(`Error: ${errorMessage}\n\nPlease try again.`);
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="form-step animate-fade-in">
                        <h2>Personal Information</h2>
                        <p className="step-description">Tell us about yourself</p>

                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input"
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mobile Number *</label>
                            <input
                                type="tel"
                                name="mobile"
                                value={formData.mobile}
                                onChange={handleChange}
                                className="input"
                                placeholder="+1 234 567 8900"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Position/Title *</label>
                            <select
                                name="position"
                                value={formData.position}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="">Select your position</option>
                                <option value="hr">HR</option>
                                <option value="hiring_manager">Hiring Manager</option>
                                <option value="recruiter">Recruiter</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">LinkedIn Profile</label>
                            <input
                                type="url"
                                name="linkedin"
                                value={formData.linkedin}
                                onChange={handleChange}
                                className="input"
                                placeholder="https://linkedin.com/in/johndoe"
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="form-step animate-fade-in">
                        <h2>Company Information</h2>
                        <p className="step-description">Tell us about your company</p>

                        <div className="form-group">
                            <label className="form-label">Company Name *</label>
                            <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                className="input"
                                placeholder="Tech Corp"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Company Size *</label>
                            <select
                                name="companySize"
                                value={formData.companySize}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="">Select size</option>
                                <option value="1-10">1-10 employees</option>
                                <option value="11-50">11-50 employees</option>
                                <option value="51-200">51-200 employees</option>
                                <option value="201-500">201-500 employees</option>
                                <option value="501+">501+ employees</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Industry *</label>
                            <input
                                type="text"
                                name="industry"
                                value={formData.industry}
                                onChange={handleChange}
                                className="input"
                                placeholder="Technology"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Company Website</label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                className="input"
                                placeholder="https://company.com"
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="onboarding">
            <div className="onboarding-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
            </div>

            <div className="onboarding-container">
                <div className="onboarding-header">
                    <h1>Recruiter Onboarding</h1>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(step / 2) * 100}%` }}></div>
                    </div>
                    <p className="step-indicator">Step {step} of 2</p>
                </div>

                <div className="onboarding-content card-glass">
                    {renderStep()}

                    <div className="form-actions">
                        {step > 1 && (
                            <button onClick={prevStep} className="btn btn-secondary">
                                Previous
                            </button>
                        )}
                        {step < 2 ? (
                            <button onClick={nextStep} className="btn btn-primary">
                                Next
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        ) : (
                            <button onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
                                {loading ? <span className="loading"></span> : 'Complete Onboarding'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecruiterOnboarding;
