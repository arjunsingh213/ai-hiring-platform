import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import './LoginPage.css';

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

            console.log('Full response:', response);
            console.log('Response data:', response.data);
            console.log('Response data.data:', response.data.data);

            // Note: axios interceptor returns response.data
            if (response.success) {
                const { user, token } = response.data;

                // Store auth data
                localStorage.setItem('token', token);
                localStorage.setItem('userId', user._id);
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('userEmail', user.email);

                // Redirect to onboarding to complete profile
                navigate(`/onboarding/${user.role}`);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
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

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card signup-card">
                    <div className="auth-header">
                        <h1>Create Account</h1>
                        <p>Join us and start your journey</p>
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
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                className="input"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

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
                                                width: `${(passwordStrength / 4) * 100}%`,
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
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="agreeToTerms"
                                    checked={formData.agreeToTerms}
                                    onChange={handleChange}
                                />
                                <span>I agree to the <Link to="/terms">Terms & Conditions</Link></span>
                            </label>
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
        </div>
    );
};

export default SignupPage;
