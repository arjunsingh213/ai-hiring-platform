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

                    // Store token if needed, or just let them login
                    if (response.data && response.data.token) {
                        localStorage.setItem('token', response.data.token);
                        localStorage.setItem('user', JSON.stringify(response.data.user));
                        localStorage.setItem('userId', response.data.user._id);
                    }

                    // Redirect after 3 seconds
                    setTimeout(() => {
                        navigate('/login'); // Or dashboard if auto-logged in
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
                    {status === 'success' && <span className="icon-success">✅</span>}
                    {status === 'error' && <span className="icon-error">❌</span>}
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
