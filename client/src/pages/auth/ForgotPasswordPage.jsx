import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import './AuthPage.css';
import './ForgotPasswordPage.css'; // Additional OTP-specific styles

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Step: 1 = Email, 2 = OTP, 3 = New Password
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    // Step 1: Send OTP
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            showToast('If an account exists, an OTP has been sent to your email', 'success');
            setStep(2);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');

        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter the complete 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/verify-otp', {
                email,
                otp: otpString
            });
            setResetToken(response.data.resetToken);
            showToast('OTP verified successfully!', 'success');
            setStep(3);
        } catch (error) {
            setError(error.response?.data?.error || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                email,
                resetToken,
                newPassword
            });
            showToast('Password reset successfully!', 'success');
            setTimeout(() => navigate('/login'), 1500);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    // OTP input handler
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d+$/.test(pastedData)) {
            const newOtp = [...otp];
            pastedData.split('').forEach((char, i) => {
                if (i < 6) newOtp[i] = char;
            });
            setOtp(newOtp);
        }
    };

    return (
        <div className="auth-page">
            <div className="bg-orb"></div>
            <div className="auth-container">
                <div className="auth-card">
                    {/* Step 1: Enter Email */}
                    {step === 1 && (
                        <>
                            <div className="auth-header">
                                <h1>Forgot Password?</h1>
                                <p>Enter your email and we'll send you a reset code</p>
                            </div>

                            <form onSubmit={handleSendOTP} className="auth-form">
                                {error && (
                                    <div className="error-message">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                            <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        {error}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="email">Email Address</label>
                                    <input
                                        type="email"
                                        id="email"
                                        className="input"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        autoFocus
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                    {loading && <span className="spinner" />}
                                    Send Reset Code
                                </button>
                            </form>
                        </>
                    )}

                    {/* Step 2: Enter OTP */}
                    {step === 2 && (
                        <>
                            <div className="auth-header">
                                <h1>Enter OTP</h1>
                                <p>We've sent a 6-digit code to <strong>{email}</strong></p>
                            </div>

                            <form onSubmit={handleVerifyOTP} className="auth-form">
                                {error && (
                                    <div className="error-message">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                            <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        {error}
                                    </div>
                                )}

                                <div className="otp-container" onPaste={handleOtpPaste}>
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                            className="otp-input"
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>

                                <p className="resend-text">
                                    Didn't receive the code?{' '}
                                    <button type="button" className="forgot-link" onClick={handleSendOTP} disabled={loading}>
                                        Resend OTP
                                    </button>
                                </p>

                                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                    {loading && <span className="spinner" />}
                                    Verify OTP
                                </button>

                                <button type="button" className="btn btn-secondary btn-full" onClick={() => setStep(1)}>
                                    ← Back to Email
                                </button>
                            </form>
                        </>
                    )}

                    {/* Step 3: New Password */}
                    {step === 3 && (
                        <>
                            <div className="auth-header">
                                <h1>Set New Password</h1>
                                <p>Create a strong password for your account</p>
                            </div>

                            <form onSubmit={handleResetPassword} className="auth-form">
                                {error && (
                                    <div className="error-message">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                            <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        {error}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="newPassword">New Password</label>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        className="input"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        autoFocus
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="confirmPassword">Confirm Password</label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        className="input"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                    />
                                </div>

                                <div className="password-requirements">
                                    <span className={newPassword.length >= 6 ? 'valid' : ''}>✓ At least 6 characters</span>
                                    <span className={newPassword === confirmPassword && confirmPassword ? 'valid' : ''}>✓ Passwords match</span>
                                </div>

                                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                    {loading && <span className="spinner" />}
                                    Reset Password
                                </button>
                            </form>
                        </>
                    )}

                    {/* Back to Login */}
                    <div className="auth-footer">
                        <p>
                            Remember your password? <Link to="/login">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
