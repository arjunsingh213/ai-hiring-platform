import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import './LoginPage.css';

const LoginPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setError(''); // Clear error on input change
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', {
                email: formData.email,
                password: formData.password
            });

            console.log('Full login response:', response);
            console.log('Response.success:', response.success);
            console.log('Response.data:', response.data);

            // Axios interceptor unwraps response.data, so response IS the backend's response.data
            // Backend returns: { success: true, data: { user, token }, message }
            if (response.success && response.data) {
                const { user, token } = response.data;

                console.log('Extracted user:', user);
                console.log('Extracted token:', token);

                // Store auth data
                localStorage.setItem('token', token);
                localStorage.setItem('userId', user._id);
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('userEmail', user.email);

                console.log('Stored userId:', localStorage.getItem('userId'));

                // Redirect based on role and onboarding status
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
                console.error('Login response missing success or data:', response);
                setError('Login failed. Invalid response from server.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <h1>Welcome Back!</h1>
                        <p>Sign in to continue to your account</p>
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
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className="input"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-options">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                />
                                <span>Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="forgot-link">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>

                        <div className="auth-footer">
                            <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
                        </div>
                    </form>

                    <div className="demo-credentials">
                        <p className="demo-title">Demo Credentials:</p>
                        <p className="demo-text">Email: test@jobseeker.com</p>
                        <p className="demo-text">Password: password123</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
