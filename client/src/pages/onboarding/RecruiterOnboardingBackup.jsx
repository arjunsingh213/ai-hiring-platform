import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import '../onboarding/Onboarding.css';

const RecruiterOnboarding = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        companyName: '',
        position: '',
        companySize: '',
        industry: '',
        website: '',
        linkedin: '',
        verificationDoc: null
    });
    const [loading, setLoading] = useState(false);
    const [verificationFile, setVerificationFile] = useState(null);
    const totalSteps = 3;

    // Company search state
    const [companySuggestions, setCompanySuggestions] = useState([]);
    const [companySearching, setCompanySearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [companyValidated, setCompanyValidated] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);

    // Work Email Verification State
    const [workEmail, setWorkEmail] = useState('');
    const [workEmailOtp, setWorkEmailOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [workEmailVerified, setWorkEmailVerified] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);

    // Debounce company search
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // Force light theme on onboarding page
    useEffect(() => {
        const previousTheme = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', 'light');

        return () => {
            if (previousTheme) {
                document.documentElement.setAttribute('data-theme', previousTheme);
            }
        };
    }, []);

    const searchCompanies = async (query) => {
        if (!query || query.length < 2) {
            setCompanySuggestions([]);
            return;
        }

        setCompanySearching(true);
        try {
            const response = await api.get(`/companies/search?q=${encodeURIComponent(query)}`);
            console.log('Company search response:', response.data);

            // Access nested data structure: response.data.data.companies
            const companies = response.data?.data?.companies || response.data?.companies || [];

            if (companies.length > 0) {
                setCompanySuggestions(companies);
                setShowSuggestions(true);
            } else {
                setCompanySuggestions([]);
            }
        } catch (error) {
            console.error('Company search error:', error);
            setCompanySuggestions([]);
        } finally {
            setCompanySearching(false);
        }
    };

    const debouncedSearch = useCallback(debounce(searchCompanies, 300), []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // If company name changes, search and reset validation
        if (name === 'companyName') {
            setCompanyValidated(false);
            setSelectedCompany(null);
            debouncedSearch(value);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size exceeds 5MB limit');
                return;
            }
            setVerificationFile(file);
            setFormData(prev => ({ ...prev, verificationDoc: file.name }));
        }
    };

    const selectCompany = (company) => {
        setFormData(prev => ({ ...prev, companyName: company.name }));
        setSelectedCompany(company);
        setCompanyValidated(true);
        setShowSuggestions(false);
        setCompanySuggestions([]);

        // Reset verify state if company changes
        setWorkEmailVerified(false);
        setOtpSent(false);
        setWorkEmailOtp('');
    };

    // OTP Timer
    useEffect(() => {
        let interval;
        if (otpTimer > 0) {
            interval = setInterval(() => {
                setOtpTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [otpTimer]);

    const handleSendOtp = async () => {
        if (!workEmail) return toast.error('Please enter your work email');

        // Strict Validation for Verified Companies
        if (selectedCompany && selectedCompany.domain) {
            const emailDomain = workEmail.split('@')[1];
            if (!emailDomain) return toast.error('Invalid email address');

            // Normalize domains
            const normalizedEmailDomain = emailDomain.toLowerCase();
            const normalizedCompanyDomain = selectedCompany.domain.toLowerCase();

            // Check if email domain ends with company domain (e.g., eng.amazon.com matches amazon.com)
            const isMatch = normalizedEmailDomain === normalizedCompanyDomain || normalizedEmailDomain.endsWith(`.${normalizedCompanyDomain}`);

            if (!isMatch) {
                return toast.error(`Please use an official @${selectedCompany.domain} email address.`);
            }
        }

        // Block generic public domains for work email
        const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
        const emailDomain = workEmail.split('@')[1]?.toLowerCase();
        if (emailDomain && publicDomains.includes(emailDomain)) {
            // Block public domains for "Work Email" strictly
            return toast.error('Please use your work email address, not a personal one.');
        }

        setLoading(true);
        try {
            let userId = localStorage.getItem('userId');
            if (!userId) {
                const userObj = JSON.parse(localStorage.getItem('user'));
                userId = userObj?._id;
            }

            await api.post('/auth/send-work-email-otp', {
                userId,
                workEmail,
                companyName: formData.companyName
            });

            setOtpSent(true);
            setOtpTimer(60); // 60s cooldown
            toast.success('OTP sent to your work email');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!workEmailOtp) return toast.error('Please enter the OTP');

        setLoading(true);
        try {
            let userId = localStorage.getItem('userId');
            if (!userId) {
                const userObj = JSON.parse(localStorage.getItem('user'));
                userId = userObj?._id;
            }

            await api.post('/auth/verify-work-email-otp', {
                userId,
                otp: workEmailOtp
            });

            setWorkEmailVerified(true);
            setOtpSent(false);
            toast.success('Work email verified successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === 2 && !workEmailVerified) {
            toast.error('Please verify your work email before proceeding.');
            return;
        }
        if (step < totalSteps) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        // Validate required fields
        if (!formData.name || !formData.mobile || !formData.position || !formData.companyName || !formData.companySize || !formData.industry) {
            toast.error('Please fill in all required fields');
            return;
        }

        // Warn if company not validated
        if (!companyValidated && !selectedCompany) {
            const proceed = window.confirm('Company name could not be verified. Do you want to proceed anyway?');
            if (!proceed) return;
        }

        setLoading(true);
        try {
            let userId = localStorage.getItem('userId');

            if (!userId) {
                try {
                    const userObj = JSON.parse(localStorage.getItem('user'));
                    if (userObj && userObj._id) {
                        userId = userObj._id;
                        localStorage.setItem('userId', userId);
                    }
                } catch (e) {
                    console.log('Failed to parse user object from localStorage');
                }
            }

            if (!userId) {
                throw new Error('User ID not found. Please try logging in again.');
            }

            // Upload verification doc first if exists
            if (verificationFile) {
                const docFormData = new FormData();
                docFormData.append('document', verificationFile);
                docFormData.append('userId', userId);

                try {
                    await api.post('/users/upload-verification-doc', docFormData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    console.log('Verification document uploaded');
                } catch (docError) {
                    console.error('Doc upload failed:', docError);
                    throw new Error('Failed to upload verification document: ' + (docError.response?.data?.error || docError.message));
                }
            }

            const userData = {
                profile: {
                    name: formData.name.trim(),
                    mobile: formData.mobile.trim()
                },
                recruiterProfile: {
                    position: formData.position,
                    companyName: formData.companyName.trim(),
                    companyDomain: formData.industry.trim(),
                    companyWebsite: formData.website || '',
                    companyJurisdiction: selectedCompany?.jurisdiction || '',
                    companyJurisdiction: selectedCompany?.jurisdiction || '',
                    companyVerified: companyValidated,
                    workEmail: workEmail,
                    workEmailVerified: workEmailVerified,
                    verified: false // Always false initially
                },
                isOnboardingComplete: true
            };

            await api.put(`/users/${userId}`, userData);
            localStorage.setItem('userRole', 'recruiter');
            navigate('/recruiter/home');
        } catch (error) {
            console.error('Onboarding error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to complete onboarding';
            toast.error(`Error: ${errorMessage}. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.company-search-container')) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

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

                        <div className="form-group company-search-container">
                            <label className="form-label">
                                Company Name *
                                {companyValidated && (
                                    <span className="verified-badge">✓ Verified</span>
                                )}
                            </label>
                            <div className="company-input-wrapper">
                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    onFocus={() => formData.companyName.length >= 2 && setShowSuggestions(true)}
                                    className={`input ${companyValidated ? 'input-validated' : ''}`}
                                    placeholder="Start typing company name..."
                                    required
                                    autoComplete="off"
                                />
                                {companySearching && (
                                    <span className="input-spinner">⏳</span>
                                )}
                            </div>

                            {/* Company Suggestions Dropdown */}
                            {showSuggestions && companySuggestions.length > 0 && (
                                <div className="company-suggestions">
                                    <div className="suggestions-header">
                                        <span>Select from verified companies:</span>
                                    </div>
                                    {companySuggestions.map((company, index) => (
                                        <div
                                            key={index}
                                            className="suggestion-item"
                                            onClick={() => selectCompany(company)}
                                        >
                                            <div className="suggestion-content">
                                                {company.logo && (
                                                    <img
                                                        src={company.logo}
                                                        alt={company.name}
                                                        className="company-logo"
                                                        onError={(e) => e.target.style.display = 'none'}
                                                    />
                                                )}
                                                <div className="suggestion-info">
                                                    <div className="suggestion-name">{company.name}</div>
                                                    {company.domain && (
                                                        <div className="suggestion-meta">🌐 {company.domain}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!companyValidated && formData.companyName.length >= 2 && !companySearching && companySuggestions.length === 0 && (
                                <p className="validation-warning">
                                    ⚠️ Company not found in registry. Please ensure the name is correct.
                                </p>
                            )}
                        </div>

                        {/* Work Email Verification Section */}
                        <div className="form-group animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            <label className="form-label">Work Email *</label>
                            <div className="work-email-container">
                                <div className="input-group">
                                    <input
                                        type="email"
                                        value={workEmail}
                                        onChange={(e) => {
                                            if (!workEmailVerified) setWorkEmail(e.target.value);
                                        }}
                                        className={`input ${workEmailVerified ? 'input-validated' : ''}`}
                                        placeholder="you@company.com"
                                        disabled={workEmailVerified || otpSent}
                                    />
                                    {workEmailVerified && <span className="verified-check">✓</span>}
                                    {!workEmailVerified && !otpSent && (
                                        <button
                                            className="btn-verify"
                                            onClick={handleSendOtp}
                                            disabled={!workEmail || loading}
                                        >
                                            {loading ? 'Sending...' : 'Verify'}
                                        </button>
                                    )}
                                </div>

                                {otpSent && !workEmailVerified && (
                                    <div className="otp-verification-box animate-fade-in">
                                        <p className="otp-instruction">Enter the 6-digit code sent to {workEmail}</p>
                                        <div className="otp-input-group">
                                            <input
                                                type="text"
                                                value={workEmailOtp}
                                                onChange={(e) => setWorkEmailOtp(e.target.value)}
                                                placeholder="Enter OTP"
                                                maxLength={6}
                                                className="input otp-input"
                                            />
                                            <button
                                                className="btn-confirm"
                                                onClick={handleVerifyOtp}
                                                disabled={!workEmailOtp || loading}
                                            >
                                                {loading ? 'Verifying...' : 'Confirm'}
                                            </button>
                                        </div>
                                        <div className="otp-resend">
                                            {otpTimer > 0 ? (
                                                <span>Resend in {otpTimer}s</span>
                                            ) : (
                                                <button onClick={handleSendOtp} className="btn-link">Resend Code</button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
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

            case 3:
                return (
                    <div className="form-step animate-fade-in">
                        <h2>Identity Verification</h2>
                        <p className="step-description">One final step to secure your account.</p>

                        <div className="verify-container-styled">
                            <div className="verify-info-card">
                                <div className="verify-badge-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                    </svg>
                                </div>
                                <div className="verify-info-content">
                                    <h3>Verification Required</h3>
                                    <p>To ensure a trusted environment for job seekers, we require proof of your recruiter status.</p>
                                </div>
                            </div>

                            <div className="verify-docs-group">
                                <label className="verify-label">Accepted Documents</label>
                                <div className="verify-docs-grid">
                                    <div className="verify-doc-pill">
                                        <span className="doc-icon">📇</span> Business Card
                                    </div>
                                    <div className="verify-doc-pill">
                                        <span className="doc-icon">🆔</span> Employee ID
                                    </div>
                                    <div className="verify-doc-pill">
                                        <span className="doc-icon">📄</span> Auth Letter
                                    </div>
                                </div>
                            </div>

                            <div className="verify-upload-section">
                                <label className="verify-label">Upload Document <span className="required-star">*</span></label>
                                <div className="verify-upload-wrapper">
                                    <input
                                        type="file"
                                        id="verification-upload"
                                        onChange={handleFileChange}
                                        className="hidden-input"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                    />
                                    <label htmlFor="verification-upload" className={`verify-dropzone ${verificationFile ? 'has-file' : ''}`}>
                                        {verificationFile ? (
                                            <div className="verify-file-success">
                                                <div className="verify-file-icon">
                                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                        <polyline points="14 2 14 8 20 8"></polyline>
                                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                                        <polyline points="10 9 9 9 8 9"></polyline>
                                                    </svg>
                                                </div>
                                                <div className="verify-file-info">
                                                    <span className="file-name-strong">{verificationFile.name}</span>
                                                    <span className="file-size-sub">{(verificationFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                                </div>
                                                <button type="button" className="verify-change-btn">Change</button>
                                            </div>
                                        ) : (
                                            <div className="verify-upload-content">
                                                <div className="verify-upload-circle">
                                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                        <polyline points="17 8 12 3 7 8"></polyline>
                                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                                    </svg>
                                                </div>
                                                <span className="verify-cta">Click to upload document</span>
                                                <span className="verify-formats">Supports JPG, PNG, PDF (Max 5MB)</span>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
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
                        <div className="progress-fill" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
                    </div>
                    <p className="step-indicator">Step {step} of {totalSteps}</p>
                </div>

                <div className="onboarding-content card-glass">
                    {renderStep()}

                    <div className="form-actions">
                        {step > 1 && (
                            <button onClick={prevStep} className="btn btn-secondary">
                                Previous
                            </button>
                        )}
                        {step < totalSteps ? (
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
