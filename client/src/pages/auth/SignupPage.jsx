import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../services/api';
import TermsModal from '../../components/TermsModal';
import './AuthPage.css';

const SignupPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const roleFromUrl = searchParams.get('role') || 'jobseeker';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: roleFromUrl,
        agreeToTerms: false
    });

    // Update role if URL param changes
    useEffect(() => {
        setFormData(prev => ({ ...prev, role: roleFromUrl }));
    }, [roleFromUrl]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [verificationSent, setVerificationSent] = useState(false);
    const [registeredUserId, setRegisteredUserId] = useState(null);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resending, setResending] = useState(false);

    // Socket connection for real-time verification status
    useEffect(() => {
        let socket;

        if (verificationSent && registeredUserId) {
            // Connect to socket server
            const SOCKET_URL = import.meta.env.VITE_API_URL
                ? import.meta.env.VITE_API_URL.replace('/api', '')
                : 'http://localhost:5000';

            socket = io(SOCKET_URL);

            socket.on('connect', () => {
                console.log('Connected to socket for verification check');
                socket.emit('join', registeredUserId);
            });

            socket.on('email_verified', (data) => {
                handleVerificationSuccess(data.user);
            });
        }

        // Add Polling Mechanism as Fallback
        let pollingInterval;
        if (verificationSent && registeredUserId) {
            pollingInterval = setInterval(async () => {
                try {
                    const response = await api.get(`/ users / ${registeredUserId} `);
                    if (response.data && response.data.isVerified) {
                        handleVerificationSuccess(response.data);
                    }
                } catch (err) {
                    console.log('Polling check failed:', err);
                }
            }, 3000); // Check every 3 seconds
        }

        return () => {
            if (socket) socket.disconnect();
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [verificationSent, registeredUserId, navigate]);

    // Cooldown timer effect for resend button
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleResendVerification = async () => {
        if (resendCooldown > 0 || resending) return;

        setResending(true);
        try {
            const response = await api.post('/auth/resend-verification', {
                email: formData.email
            });

            if (response.success) {
                setResendCooldown(30); // 30 second cooldown
            }
        } catch (err) {
            console.error('Resend verification error:', err);
        } finally {
            setResending(false);
        }
    };

    const handleVerificationSuccess = (user) => {
        // Persist user data consistently
        const finalUserId = user._id || registeredUserId;
        if (finalUserId) localStorage.setItem('userId', finalUserId);
        if (user.role) localStorage.setItem('userRole', user.role);
        if (user.email) localStorage.setItem('userEmail', user.email);

        // Always store full user object and update timestamp
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('loginTimestamp', Date.now().toString());

        console.log('SignupPage - handleVerificationSuccess:', { finalUserId, role: user.role });

        if (!user.isOnboardingComplete) {
            if (user.role === 'jobseeker') {
                navigate('/onboarding/jobseeker');
            } else if (user.role === 'recruiter') {
                navigate('/onboarding/recruiter');
            } else {
                navigate('/onboarding/role-selection');
            }
        } else {
            navigate('/login');
        }
    };

    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;
        return strength;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));

        if (name === 'password') {
            setPasswordStrength(calculatePasswordStrength(value));
        }

        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (!formData.agreeToTerms) {
            setError('Please agree to the terms and conditions');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/register', {
                email: formData.email,
                password: formData.password,
                role: formData.role,
                profile: {
                    name: formData.name
                }
            });

            if (response.success) {
                // Show verification message and start listening for socket events
                setRegisteredUserId(response.data.userId); // Capture userId
                setVerificationSent(true);
            } else {
                setError(response.error || 'Registration failed. Please try again.');
            }
        } catch (err) {
            console.error('Signup error:', err);
            setError(err.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (verificationSent) {
        return (
            <div className="auth-page">
                <div className="bg-orb"></div>
                <div className="auth-container">
                    <div className="auth-card signup-card verify-sent-card">
                        <div className="verify-icon">✉️</div>
                        <h1>Check Your Email</h1>
                        <p className="verify-text">
                            We've sent a verification link to <strong>{formData.email}</strong>.
                        </p>
                        <p className="verify-subtext">
                            Please check your inbox and click the link to verify your account before logging in.
                        </p>
                        <p className="verify-subtext" style={{ fontSize: '0.9rem', color: '#6366f1', marginTop: '10px' }}>
                            <span className="spinner" style={{ display: 'inline-block', marginRight: '8px' }}></span>
                            Waiting for verification...
                        </p>
                        <div className="form-options" style={{ marginTop: '20px' }}>
                            <p style={{ marginBottom: '10px' }}>
                                Did not receive the email?
                            </p>
                            <button
                                className="btn btn-secondary btn-full"
                                onClick={handleResendVerification}
                                disabled={resendCooldown > 0 || resending}
                                style={{
                                    opacity: resendCooldown > 0 ? 0.6 : 1,
                                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {resending ? 'Sending...' :
                                    resendCooldown > 0 ? `Resend in ${resendCooldown}s` :
                                        'Resend Verification Email'}
                            </button>
                        </div>
                        <Link to="/login" className="btn btn-primary btn-full" style={{ marginTop: '12px' }}>
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const getStrengthLabel = () => {
        const labels = ['Weak', 'Fair', 'Good', 'Strong'];
        return labels[passwordStrength - 1] || 'Weak';
    };

    const getStrengthColor = () => {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4'];
        return colors[passwordStrength - 1] || '#ef4444';
    };

    return (
        <div className="auth-page">
            <div className="bg-orb"></div>
            <div className="auth-container">
                <div className="auth-card signup-card">
                    <div className="auth-header">
                        <h1>Sign Up</h1>
                        <p>Create your account to get started</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {error && (
                            <div className="error-message">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="input"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="role">I am a</label>
                            <select
                                id="role"
                                name="role"
                                className="input"
                                value={formData.role}
                                onChange={handleChange}
                                required
                            >
                                <option value="jobseeker">Job Seeker</option>
                                <option value="recruiter">Recruiter</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className="input"
                                placeholder="Create a password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            {formData.password && (
                                <div className="password-strength">
                                    <div className="strength-bar">
                                        <div
                                            className="strength-fill"
                                            style={{
                                                width: `${(passwordStrength / 4) * 100}% `,
                                                backgroundColor: getStrengthColor()
                                            }}
                                        ></div>
                                    </div>
                                    <span className="strength-label" style={{ color: getStrengthColor() }}>
                                        {getStrengthLabel()}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                className="input"
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-options">
                            <div className="checkbox-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <input
                                    type="checkbox"
                                    name="agreeToTerms"
                                    checked={formData.agreeToTerms}
                                    onChange={handleChange}
                                    style={{ marginTop: '3px', flexShrink: 0 }}
                                />
                                <span style={{ lineHeight: '1.5' }}>
                                    I agree to the{' '}
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            console.log('Terms link clicked!');
                                            setShowTermsModal(true);
                                        }}
                                        className="terms-link"
                                    >
                                        Terms & Conditions
                                    </a>
                                </span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>

                        <div className="auth-footer">
                            <p>Already have an account? <Link to="/login">Sign in</Link></p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Terms & Conditions Modal */}
            <TermsModal
                isOpen={showTermsModal}
                onClose={() => setShowTermsModal(false)}
            />
        </div>
    );
};

export default SignupPage;
