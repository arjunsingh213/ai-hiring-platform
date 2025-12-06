import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './SettingsPage.css';

const SettingsPage = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId');
    const [activeTab, setActiveTab] = useState('account');
    const [settings, setSettings] = useState({
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
        }
    });
    const [loading, setLoading] = useState(false);

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

    const handleSave = async () => {
        setLoading(true);
        try {
            // Save settings to backend
            await api.put(`/users/${userId}/settings`, settings);
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        navigate('/');
    };

    const handleDeleteAccount = () => {
        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            if (window.confirm('This will permanently delete all your data. Are you absolutely sure?')) {
                // Delete account logic
                alert('Account deletion feature will be implemented');
            }
        }
    };

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
                </div>

                <div className="settings-content card">
                    {activeTab === 'account' && (
                        <div className="settings-section">
                            <h2>Account Settings</h2>
                            <div className="setting-item">
                                <div>
                                    <h4>Email Address</h4>
                                    <p className="text-muted">Update your email address</p>
                                </div>
                                <button className="btn btn-secondary btn-sm">Change Email</button>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Password</h4>
                                    <p className="text-muted">Change your password</p>
                                </div>
                                <button className="btn btn-secondary btn-sm">Change Password</button>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Language</h4>
                                    <p className="text-muted">Select your preferred language</p>
                                </div>
                                <select className="input" style={{ width: '200px' }}>
                                    <option>English</option>
                                    <option>Spanish</option>
                                    <option>French</option>
                                    <option>German</option>
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
                                    <p className="text-muted">Add an extra layer of security</p>
                                </div>
                                <button className="btn btn-primary btn-sm">Enable 2FA</button>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Active Sessions</h4>
                                    <p className="text-muted">Manage your active sessions</p>
                                </div>
                                <button className="btn btn-secondary btn-sm">View Sessions</button>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Login History</h4>
                                    <p className="text-muted">View your recent login activity</p>
                                </div>
                                <button className="btn btn-secondary btn-sm">View History</button>
                            </div>
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
        </div>
    );
};

export default SettingsPage;
