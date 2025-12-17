import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './VerifyEmailPage.css';

const VerifyEmailPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification token.');
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await api.post('/auth/verify-email', { token });

                if (response.success) {
                    setStatus('success');
                    setMessage('Your email has been successfully verified!');

                    // Store token if needed
                    if (response.data && response.data.token) {
                        localStorage.setItem('token', response.data.token);
                        localStorage.setItem('user', JSON.stringify(response.data.user));
                        localStorage.setItem('userId', response.data.user._id);
                    }

                    // Redirect logic
                    // Redirect logic
                    setTimeout(() => {
                        // Ensure data is persisted for onboarding
                        if (response.data.user._id) localStorage.setItem('userId', response.data.user._id);
                        if (response.data.user.role) localStorage.setItem('userRole', response.data.user.role);
                        if (response.data.token) localStorage.setItem('token', response.data.token);

                        // Fallback storage
                        localStorage.setItem('user', JSON.stringify(response.data.user));

                        if (!response.data.user.isOnboardingComplete) {
                            if (response.data.user.role === 'jobseeker') {
                                navigate('/onboarding/jobseeker');
                            } else if (response.data.user.role === 'recruiter') {
                                navigate('/onboarding/recruiter');
                            } else {
                                navigate('/onboarding/role-selection');
                            }
                        } else {
                            navigate('/login');
                        }
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage(response.message || 'Verification failed');
                }
            } catch (error) {
                console.error('Verification error:', error);
                setStatus('error');
                setMessage(error.response?.data?.error || 'Failed to verify email. The link may be invalid or expired.');
            }
        };

        verifyEmail();
    }, [token, navigate]);

    return (
        <div className="verify-container">
            <div className="verify-card card-glass">
                <div className="verify-icon">
                    {status === 'verifying' && <div className="spinner"></div>}
                    {status === 'success' && (
                        <span className="icon-success">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="16 10 10.5 15 8 12.5"></polyline>
                            </svg>
                        </span>
                    )}
                    {status === 'error' && (
                        <span className="icon-error">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </span>
                    )}
                </div>

                <h2>
                    {status === 'verifying' && 'Verifying Email'}
                    {status === 'success' && 'Email Verified!'}
                    {status === 'error' && 'Verification Failed'}
                </h2>

                <p className="verify-message">{message}</p>

                {status === 'success' && (
                    <p className="redirect-text">Redirecting you to login...</p>
                )}

                {status === 'error' && (
                    <button className="btn btn-primary" onClick={() => navigate('/login')}>
                        Go to Login
                    </button>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailPage;
