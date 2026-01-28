import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import './SettingsPage.css';
import ContactForm from '../../components/ContactForm';

const SettingsPage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const userId = localStorage.getItem('userId');
    const [activeTab, setActiveTab] = useState('account');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showFinalConfirm, setShowFinalConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingSettings, setFetchingSettings] = useState(true);

    // Modal states
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [showSessionsModal, setShowSessionsModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);

    // Form states
    const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [twoFAData, setTwoFAData] = useState({ qrCode: '', secret: '', verificationCode: '' });
    const [disable2FAPassword, setDisable2FAPassword] = useState('');
    const [sessions, setSessions] = useState([]);
    const [loginHistory, setLoginHistory] = useState([]);

    const [settings, setSettings] = useState({
        email: '',
        notifications: {
            email: true,
            push: true,
            jobAlerts: true,
            messageAlerts: true
        },
        privacy: {
            profileVisibility: 'public',
            showEmail: false,
            showPhone: false
        },
        security: {
            twoFactorEnabled: false
        },
        language: 'en'
    });

    // Fetch settings on mount
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setFetchingSettings(true);
            const response = await api.get(`/settings/${userId}`);
            if (response.data?.success) {
                setSettings(prev => ({
                    ...prev,
                    ...response.data.data
                }));
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            // Use defaults if fetch fails
        } finally {
            setFetchingSettings(false);
        }
    };

    const handleToggle = (category, setting) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [setting]: !prev[category][setting]
            }
        }));
    };

    const handleSelect = (category, setting, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [setting]: value
            }
        }));
    };

    const handleLanguageChange = (value) => {
        setSettings(prev => ({
            ...prev,
            language: value
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put(`/settings/${userId}`, {
                notifications: settings.notifications,
                privacy: settings.privacy,
                language: settings.language
            });
            toast.success('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('token');
        navigate('/');
    };

    // ==================== EMAIL CHANGE ====================
    const handleChangeEmail = async () => {
        if (!emailForm.newEmail || !emailForm.password) {
            toast.error('Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            const response = await api.put(`/settings/${userId}/email`, emailForm);
            if (response.data?.success) {
                toast.success('Email updated successfully!');
                setSettings(prev => ({ ...prev, email: emailForm.newEmail }));
                setShowEmailModal(false);
                setEmailForm({ newEmail: '', password: '' });
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update email');
        } finally {
            setLoading(false);
        }
    };

    // ==================== PASSWORD CHANGE ====================
    const handleChangePassword = async () => {
        if (!passwordForm.currentPassword || !passwordForm.newPassword) {
            toast.error('Please fill in all fields');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const response = await api.put(`/settings/${userId}/password`, {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            if (response.data?.success) {
                toast.success('Password changed successfully!');
                setShowPasswordModal(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    // ==================== DELETE ACCOUNT ====================
    const handleDeleteAccount = () => {
        setShowDeleteConfirm(true);
    };

    const handleFirstConfirm = () => {
        setShowDeleteConfirm(false);
        setShowFinalConfirm(true);
    };

    const handleFinalConfirm = async () => {
        setLoading(true);
        try {
            const response = await api.delete(`/settings/${userId}`);
            if (response.data?.success) {
                toast.success('Account deleted successfully');
                localStorage.clear();
                navigate('/');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete account');
        } finally {
            setLoading(false);
            setShowFinalConfirm(false);
        }
    };

    // ==================== 2FA ====================
    const handleEnable2FA = async () => {
        setLoading(true);
        try {
            const response = await api.post(`/settings/${userId}/2fa/enable`);
            if (response.data?.success) {
                setTwoFAData({
                    qrCode: response.data.data.qrCode,
                    secret: response.data.data.secret,
                    verificationCode: ''
                });
                setShow2FAModal(true);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to enable 2FA');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async () => {
        if (!twoFAData.verificationCode || twoFAData.verificationCode.length !== 6) {
            toast.error('Please enter a valid 6-digit code');
            return;
        }
        setLoading(true);
        try {
            const response = await api.post(`/settings/${userId}/2fa/verify`, {
                token: twoFAData.verificationCode
            });
            if (response.data?.success) {
                toast.success('2FA enabled successfully!');
                setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, twoFactorEnabled: true }
                }));
                setShow2FAModal(false);
                setTwoFAData({ qrCode: '', secret: '', verificationCode: '' });
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!disable2FAPassword) {
            toast.error('Please enter your password');
            return;
        }
        setLoading(true);
        try {
            const response = await api.post(`/settings/${userId}/2fa/disable`, {
                password: disable2FAPassword
            });
            if (response.data?.success) {
                toast.success('2FA disabled successfully');
                setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, twoFactorEnabled: false }
                }));
                setShowDisable2FAModal(false);
                setDisable2FAPassword('');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to disable 2FA');
        } finally {
            setLoading(false);
        }
    };

    // ==================== SESSIONS ====================
    const handleViewSessions = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/settings/${userId}/sessions`);
            if (response.data?.success) {
                setSessions(response.data.data || []);
                setShowSessionsModal(true);
            }
        } catch (error) {
            toast.error('Failed to fetch sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoutAllSessions = async () => {
        setLoading(true);
        try {
            const response = await api.delete(`/settings/${userId}/sessions`);
            if (response.data?.success) {
                toast.success('All sessions logged out');
                setSessions([]);
            }
        } catch (error) {
            toast.error('Failed to logout sessions');
        } finally {
            setLoading(false);
        }
    };

    // ==================== LOGIN HISTORY ====================
    const handleViewHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/settings/${userId}/login-history`);
            if (response.data?.success) {
                setLoginHistory(response.data.data || []);
                setShowHistoryModal(true);
            }
        } catch (error) {
            toast.error('Failed to fetch login history');
        } finally {
            setLoading(false);
        }
    };

    if (fetchingSettings) {
        return (
            <div className="settings-page">
                <div className="settings-header">
                    <h1>Settings</h1>
                    <p className="text-muted">Loading your preferences...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>Settings</h1>
                <p className="text-muted">Manage your account preferences</p>
            </div>

            <div className="settings-container">
                <div className="settings-sidebar card">
                    <button
                        className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
                        onClick={() => setActiveTab('account')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" />
                            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Account
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notifications')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" />
                            <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Notifications
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`}
                        onClick={() => setActiveTab('privacy')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Privacy
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Security
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'support' ? 'active' : ''}`}
                        onClick={() => setActiveTab('support')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Support
                    </button>
                </div>

                <div className="settings-content card">
                    {activeTab === 'account' && (
                        <div className="settings-section">
                            <h2>Account Settings</h2>
                            <div className="setting-item">
                                <div>
                                    <h4>Email Address</h4>
                                    <p className="text-muted">{settings.email || 'Update your email address'}</p>
                                </div>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowEmailModal(true)}>
                                    Change Email
                                </button>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Password</h4>
                                    <p className="text-muted">Change your password</p>
                                </div>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowPasswordModal(true)}>
                                    Change Password
                                </button>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Language</h4>
                                    <p className="text-muted">Select your preferred language</p>
                                </div>
                                <select
                                    className="input"
                                    style={{ width: '200px' }}
                                    value={settings.language}
                                    onChange={(e) => handleLanguageChange(e.target.value)}
                                >
                                    <option value="en">English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                    <option value="hi">Hindi</option>
                                </select>
                            </div>
                            <div className="setting-item danger-zone">
                                <div>
                                    <h4>Delete Account</h4>
                                    <p className="text-muted">Permanently delete your account and all data</p>
                                </div>
                                <button className="btn btn-danger btn-sm" onClick={handleDeleteAccount}>
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="settings-section">
                            <h2>Notification Preferences</h2>
                            <div className="setting-item">
                                <div>
                                    <h4>Email Notifications</h4>
                                    <p className="text-muted">Receive notifications via email</p>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.email}
                                        onChange={() => handleToggle('notifications', 'email')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Push Notifications</h4>
                                    <p className="text-muted">Receive push notifications in browser</p>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.push}
                                        onChange={() => handleToggle('notifications', 'push')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Job Alerts</h4>
                                    <p className="text-muted">Get notified about new job postings</p>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.jobAlerts}
                                        onChange={() => handleToggle('notifications', 'jobAlerts')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Message Alerts</h4>
                                    <p className="text-muted">Get notified about new messages</p>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.messageAlerts}
                                        onChange={() => handleToggle('notifications', 'messageAlerts')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="settings-section">
                            <h2>Privacy Settings</h2>
                            <div className="setting-item">
                                <div>
                                    <h4>Profile Visibility</h4>
                                    <p className="text-muted">Control who can see your profile</p>
                                </div>
                                <select
                                    className="input"
                                    style={{ width: '200px' }}
                                    value={settings.privacy.profileVisibility}
                                    onChange={(e) => handleSelect('privacy', 'profileVisibility', e.target.value)}
                                >
                                    <option value="public">Public</option>
                                    <option value="recruiters">Recruiters Only</option>
                                    <option value="private">Private</option>
                                </select>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Show Email</h4>
                                    <p className="text-muted">Display email on your profile</p>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.privacy.showEmail}
                                        onChange={() => handleToggle('privacy', 'showEmail')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Show Phone Number</h4>
                                    <p className="text-muted">Display phone number on your profile</p>
                                </div>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.privacy.showPhone}
                                        onChange={() => handleToggle('privacy', 'showPhone')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="settings-section">
                            <h2>Security Settings</h2>
                            <div className="setting-item">
                                <div>
                                    <h4>Two-Factor Authentication</h4>
                                    <p className="text-muted">
                                        {settings.security.twoFactorEnabled
                                            ? '2FA is enabled on your account'
                                            : 'Add an extra layer of security'}
                                    </p>
                                </div>
                                {settings.security.twoFactorEnabled ? (
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => setShowDisable2FAModal(true)}
                                    >
                                        Disable 2FA
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={handleEnable2FA}
                                        disabled={loading}
                                    >
                                        {loading ? 'Setting up...' : 'Enable 2FA'}
                                    </button>
                                )}
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Active Sessions</h4>
                                    <p className="text-muted">Manage your active sessions</p>
                                </div>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleViewSessions}
                                    disabled={loading}
                                >
                                    View Sessions
                                </button>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Login History</h4>
                                    <p className="text-muted">View your recent login activity</p>
                                </div>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleViewHistory}
                                    disabled={loading}
                                >
                                    View History
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div className="settings-section">
                            <h2>Contact Support</h2>
                            <p className="text-muted" style={{ marginBottom: '20px' }}>Need help? Send us a message.</p>
                            <ContactForm />
                        </div>
                    )}

                    <div className="settings-actions">
                        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button className="btn btn-danger" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Email Change Modal */}
            {showEmailModal && (
                <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
                    <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Change Email Address</h3>
                        <div className="form-group">
                            <label>New Email</label>
                            <input
                                type="email"
                                className="input"
                                value={emailForm.newEmail}
                                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                                placeholder="Enter new email"
                            />
                        </div>
                        <div className="form-group">
                            <label>Current Password</label>
                            <input
                                type="password"
                                className="input"
                                value={emailForm.password}
                                onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                                placeholder="Enter your password"
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleChangeEmail} disabled={loading}>
                                {loading ? 'Updating...' : 'Update Email'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Change Password</h3>
                        <div className="form-group">
                            <label>Current Password</label>
                            <input
                                type="password"
                                className="input"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                placeholder="Enter current password"
                            />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                className="input"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                placeholder="Enter new password (min 6 chars)"
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                className="input"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                placeholder="Confirm new password"
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleChangePassword} disabled={loading}>
                                {loading ? 'Changing...' : 'Change Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2FA Setup Modal */}
            {show2FAModal && (
                <div className="modal-overlay" onClick={() => setShow2FAModal(false)}>
                    <div className="modal-content settings-modal twofa-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Setup Two-Factor Authentication</h3>
                        <p className="text-muted">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                        <div className="qr-code-container">
                            {twoFAData.qrCode && <img src={twoFAData.qrCode} alt="2FA QR Code" />}
                        </div>
                        <p className="secret-key">
                            <strong>Manual entry key:</strong> {twoFAData.secret}
                        </p>
                        <div className="form-group">
                            <label>Enter 6-digit verification code</label>
                            <input
                                type="text"
                                className="input verification-code-input"
                                value={twoFAData.verificationCode}
                                onChange={(e) => setTwoFAData({ ...twoFAData, verificationCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                placeholder="000000"
                                maxLength={6}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShow2FAModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleVerify2FA} disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify & Enable'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disable 2FA Modal */}
            {showDisable2FAModal && (
                <div className="modal-overlay" onClick={() => setShowDisable2FAModal(false)}>
                    <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Disable Two-Factor Authentication</h3>
                        <p className="text-muted">Enter your password to disable 2FA</p>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                className="input"
                                value={disable2FAPassword}
                                onChange={(e) => setDisable2FAPassword(e.target.value)}
                                placeholder="Enter your password"
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowDisable2FAModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDisable2FA} disabled={loading}>
                                {loading ? 'Disabling...' : 'Disable 2FA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sessions Modal */}
            {showSessionsModal && (
                <div className="modal-overlay" onClick={() => setShowSessionsModal(false)}>
                    <div className="modal-content settings-modal sessions-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Active Sessions</h3>
                        {sessions.length === 0 ? (
                            <p className="text-muted">No active sessions recorded</p>
                        ) : (
                            <div className="sessions-list">
                                {sessions.map((session, index) => (
                                    <div key={index} className="session-item">
                                        <div className="session-info">
                                            <strong>{session.deviceInfo || 'Unknown Device'}</strong>
                                            <span className="text-muted">{session.ip}</span>
                                            <span className="text-muted">
                                                Last active: {new Date(session.lastActive).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowSessionsModal(false)}>Close</button>
                            {sessions.length > 0 && (
                                <button className="btn btn-danger" onClick={handleLogoutAllSessions} disabled={loading}>
                                    Logout All Sessions
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Login History Modal */}
            {showHistoryModal && (
                <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="modal-content settings-modal history-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Login History</h3>
                        {loginHistory.length === 0 ? (
                            <p className="text-muted">No login history recorded</p>
                        ) : (
                            <div className="history-list">
                                {loginHistory.map((entry, index) => (
                                    <div key={index} className={`history-item ${entry.success ? 'success' : 'failed'}`}>
                                        <div className="history-info">
                                            <span className={`status-badge ${entry.success ? 'success' : 'failed'}`}>
                                                {entry.success ? '✓ Success' : '✗ Failed'}
                                            </span>
                                            <span className="text-muted">{entry.device || 'Unknown Device'}</span>
                                            <span className="text-muted">{entry.ip || 'Unknown IP'}</span>
                                            <span className="text-muted">
                                                {new Date(entry.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Account?"
                message="Are you sure you want to delete your account? This action cannot be undone."
                confirmText="Yes, Continue"
                cancelText="Cancel"
                variant="warning"
                onConfirm={handleFirstConfirm}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            <ConfirmDialog
                isOpen={showFinalConfirm}
                title="Final Confirmation"
                message="This will permanently delete all your data including your profile, applications, and messages. Are you absolutely sure?"
                confirmText="Delete Forever"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleFinalConfirm}
                onCancel={() => setShowFinalConfirm(false)}
            />
        </div>
    );
};

export default SettingsPage;
