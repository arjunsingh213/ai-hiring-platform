import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import './AuthPage.css';

const AuthPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Force light theme on auth pages
    useEffect(() => {
        const previousTheme = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', 'light');

        return () => {
            // Restore previous theme when leaving auth page
            if (previousTheme) {
                document.documentElement.setAttribute('data-theme', previousTheme);
            }
        };
    }, []);

    // Detect initial mode from URL path - /login starts in sign-in mode
    const isLoginPath = location.pathname === '/login';

    const [isSignUp, setIsSignUp] = useState(!isLoginPath);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Login form data (role auto-detected from account)
    const [loginData, setLoginData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    // Signup form data
    const [signupData, setSignupData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'jobseeker',
        agreeToTerms: false
    });

    const [passwordStrength, setPasswordStrength] = useState(0);
    const [verificationSent, setVerificationSent] = useState(false);
    const [registeredUserId, setRegisteredUserId] = useState(null);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resending, setResending] = useState(false);

    // Poll for email verification status
    useEffect(() => {
        let pollingInterval;

        if (verificationSent && registeredUserId) {
            pollingInterval = setInterval(async () => {
                try {
                    const response = await api.get(`/users/${registeredUserId}`);
                    if (response.data && response.data.isVerified) {
                        // User verified! Handle redirect
                        const user = response.data;

                        // Store user data
                        if (user._id) localStorage.setItem('userId', user._id);
                        if (user.role) localStorage.setItem('userRole', user.role);
                        localStorage.setItem('user', JSON.stringify(user));
                        localStorage.setItem('loginTimestamp', Date.now().toString());

                        // Navigate to onboarding
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
                    }
                } catch (err) {
                    console.log('Polling check failed:', err);
                }
            }, 3000); // Check every 3 seconds
        }

        return () => {
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
                email: signupData.email
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

    // Toggle between Sign In and Sign Up
    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setError('');
    };

    // Handle login form changes
    const handleLoginChange = (e) => {
        const { name, value, type, checked } = e.target;
        setLoginData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setError('');
    };

    // Handle signup form changes
    const handleSignupChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSignupData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (name === 'password') {
            calculatePasswordStrength(value);
        }
        setError('');
    };

    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;
        setPasswordStrength(strength);
    };

    // Handle Login Submit
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', {
                email: loginData.email,
                password: loginData.password
            });

            if (response.success && response.data) {
                const { user, token } = response.data;

                localStorage.setItem('token', token);
                localStorage.setItem('userId', user._id);
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('userEmail', user.email);
                localStorage.setItem('loginTimestamp', Date.now().toString());

                if (!user.isOnboardingComplete) {
                    if (user.role === 'jobseeker') {
                        navigate('/onboarding/jobseeker');
                    } else if (user.role === 'recruiter') {
                        navigate('/onboarding/recruiter');
                    } else {
                        navigate('/onboarding/role-selection');
                    }
                } else if (user.role === 'jobseeker') {
                    navigate('/jobseeker/home');
                } else {
                    navigate('/recruiter/home');
                }
            } else {
                setError('Login failed. Invalid response from server.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle Signup Submit
    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (signupData.password !== signupData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (signupData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (!signupData.agreeToTerms) {
            setError('Please agree to the terms and conditions');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/register', {
                email: signupData.email,
                password: signupData.password,
                role: signupData.role
            });

            if (response.success) {
                setRegisteredUserId(response.data.userId);
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

    const getStrengthLabel = () => {
        const labels = ['Weak', 'Fair', 'Good', 'Strong'];
        return labels[passwordStrength - 1] || 'Weak';
    };

    const getStrengthColor = () => {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4'];
        return colors[passwordStrength - 1] || '#ef4444';
    };

    // Verification sent screen - matches the sliding auth design
    if (verificationSent) {
        return (
            <div className="auth-page-container">
                <div className="auth-box">
                    {/* Purple gradient panel on left */}
                    <div className="verify-overlay-panel">
                        <h2>Almost There!</h2>
                        <p>Just one more step to complete your registration</p>
                        <div className="verify-check-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>

                    {/* Verification info on right */}
                    <div className="verify-content-panel">
                        <div className="verify-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </div>
                        <h1>Check Your Email</h1>
                        <p>We've sent a verification link to</p>
                        <p className="verify-email"><strong>{signupData.email}</strong></p>
                        <p className="verify-subtext">Please check your inbox and click the link to verify your account.</p>
                        <div style={{ marginTop: '20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                            <p style={{ marginBottom: '5px', color: '#64748b', fontSize: '0.9rem' }}>Did not receive the email?</p>
                            <button
                                className="btn-outline"
                                onClick={handleResendVerification}
                                disabled={resendCooldown > 0 || resending}
                                style={{
                                    width: '100%',
                                    color: '#6366F1',
                                    borderColor: '#6366F1',
                                    padding: '0.625rem 1rem',
                                    fontSize: '0.875rem',
                                    opacity: resendCooldown > 0 ? 0.6 : 1,
                                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                                    backgroundColor: 'transparent'
                                }}
                            >
                                {resending ? 'Sending...' :
                                    resendCooldown > 0 ? `Resend in ${resendCooldown}s` :
                                        'Resend Verification Email'}
                            </button>
                            <button
                                className="btn-solid"
                                onClick={() => setVerificationSent(false)}
                                style={{ marginTop: '4px' }}
                            >
                                Back to Sign Up
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page-container">
            <div className={`auth-box ${isSignUp ? '' : 'sign-in-mode'}`}>

                {/* Sign Up Form */}
                <div className="form-container sign-up-container">
                    <form onSubmit={handleSignupSubmit}>
                        <h1>Create Account</h1>

                        {/* Social Login Buttons */}
                        <div className="social-login-row">
                            <button
                                type="button"
                                className="social-btn"
                                title="Sign up with Google"
                                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google?role=${signupData.role}`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="social-btn social-btn-disabled"
                                title="Coming Soon"
                                onClick={() => alert('Facebook sign-up coming soon!')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="social-btn social-btn-disabled"
                                title="Coming Soon"
                                onClick={() => alert('GitHub sign-up coming soon!')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="social-btn social-btn-disabled"
                                title="Coming Soon"
                                onClick={() => alert('LinkedIn sign-up coming soon!')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </button>
                        </div>

                        <div className="or-divider">
                            <span>or use your email for registration</span>
                        </div>

                        {error && !isSignUp ? null : error && (
                            <div className="error-msg">{error}</div>
                        )}

                        <div className="input-group">
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={signupData.email}
                                onChange={handleSignupChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <select
                                name="role"
                                value={signupData.role}
                                onChange={handleSignupChange}
                            >
                                <option value="jobseeker">Job Seeker</option>
                                <option value="recruiter">Recruiter</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={signupData.password}
                                onChange={handleSignupChange}
                                required
                            />
                        </div>

                        {signupData.password && (
                            <div className="password-strength">
                                <div className="strength-bar">
                                    <div
                                        className="strength-fill"
                                        style={{
                                            width: `${(passwordStrength / 4) * 100}%`,
                                            backgroundColor: getStrengthColor()
                                        }}
                                    />
                                </div>
                                <span style={{ color: getStrengthColor() }}>{getStrengthLabel()}</span>
                            </div>
                        )}

                        <div className="input-group">
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm Password"
                                value={signupData.confirmPassword}
                                onChange={handleSignupChange}
                                required
                            />
                        </div>

                        <div className="checkbox-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <input
                                type="checkbox"
                                name="agreeToTerms"
                                checked={signupData.agreeToTerms}
                                onChange={handleSignupChange}
                                style={{ marginTop: '3px', flexShrink: 0 }}
                            />
                            <span style={{ lineHeight: '1.5' }}>
                                I agree to the{' '}
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowTermsModal(true);
                                    }}
                                    className="terms-link"
                                >
                                    Terms & Conditions
                                </a>
                            </span>
                        </div>

                        <button type="submit" className="btn-solid" disabled={loading}>
                            {loading ? 'Creating...' : 'Sign Up'}
                        </button>
                    </form>
                </div>

                {/* Sign In Form */}
                <div className="form-container sign-in-container">
                    <form onSubmit={handleLoginSubmit}>
                        <h1>Sign In</h1>

                        {/* Social Login Buttons */}
                        <div className="social-login-row">
                            <button
                                type="button"
                                className="social-btn"
                                title="Sign in with Google"
                                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="social-btn social-btn-disabled"
                                title="Coming Soon"
                                onClick={() => alert('Facebook sign-in coming soon!')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="social-btn social-btn-disabled"
                                title="Coming Soon"
                                onClick={() => alert('GitHub sign-in coming soon!')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="social-btn social-btn-disabled"
                                title="Coming Soon"
                                onClick={() => alert('LinkedIn sign-in coming soon!')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </button>
                        </div>

                        <div className="or-divider">
                            <span>or use your email password</span>
                        </div>

                        {error && isSignUp ? null : error && (
                            <div className="error-msg">{error}</div>
                        )}

                        <div className="input-group">
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={loginData.email}
                                onChange={handleLoginChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={loginData.password}
                                onChange={handleLoginChange}
                                required
                            />
                        </div>

                        {/* Role selector removed - role is auto-detected from existing account */}

                        <a href="/forgot-password" className="forgot-link">Forgot your password?</a>

                        <button type="submit" className="btn-solid" disabled={loading}>
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                {/* Sliding Overlay */}
                <div className="overlay-container">
                    <div className="overlay">
                        {/* Left Overlay Panel (shown when in sign-up mode) */}
                        <div className="overlay-panel overlay-left">
                            <h2>Welcome Back!</h2>
                            <p>To keep connected, please login with your personal info</p>
                            <button className="btn-outline" onClick={toggleMode}>
                                Sign In
                            </button>
                        </div>

                        {/* Right Overlay Panel (shown when in sign-in mode) */}
                        <div className="overlay-panel overlay-right">
                            <h2>Hello, Friend!</h2>
                            <p>Enter your details and start your journey with us</p>
                            <button className="btn-outline" onClick={toggleMode}>
                                Sign Up
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms & Conditions Modal */}
            {showTermsModal && (
                <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Terms & Conditions</h2>
                            <button className="modal-close" onClick={() => setShowTermsModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px' }}>
                            <h3>1. Acceptance of Terms</h3>
                            <p>By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement.</p>

                            <h3>2. Use License</h3>
                            <p>Permission is granted to temporarily use this platform for personal, non-commercial transitory viewing only.</p>

                            <h3>3. User Account</h3>
                            <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>

                            <h3>4. Privacy</h3>
                            <p>Your use of our platform is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs the platform and informs users of our data collection practices.</p>

                            <h3>5. Modifications</h3>
                            <p>We reserve the right to modify these terms at any time. We will notify users of any changes by updating the date at the top of these terms.</p>

                            <h3>6. Contact Information</h3>
                            <p>For questions about these terms, please contact us at support@froscel.com</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-solid" onClick={() => setShowTermsModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthPage;
