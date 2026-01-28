import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../jobseeker/SettingsPage.css';
import ContactForm from '../../components/ContactForm';

const RecruiterSettings = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('account');

    const handleLogout = () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        navigate('/');
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>Settings</h1>
                <p className="text-muted">Manage your recruiter account</p>
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
                        className={`settings-tab ${activeTab === 'company' ? 'active' : ''}`}
                        onClick={() => setActiveTab('company')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Company
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notifications')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Notifications
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
                        </div>
                    )}

                    {activeTab === 'company' && (
                        <div className="settings-section">
                            <h2>Company Information</h2>
                            <div className="setting-item">
                                <div>
                                    <h4>Company Name</h4>
                                    <p className="text-muted">Your company name</p>
                                </div>
                                <button className="btn btn-secondary btn-sm">Edit</button>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Company Website</h4>
                                    <p className="text-muted">Your company website URL</p>
                                </div>
                                <button className="btn btn-secondary btn-sm">Edit</button>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Verification Status</h4>
                                    <p className="text-muted">Company verification status</p>
                                </div>
                                <span className="badge">Pending</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="settings-section">
                            <h2>Notification Preferences</h2>
                            <div className="setting-item">
                                <div>
                                    <h4>New Applications</h4>
                                    <p className="text-muted">Get notified about new job applications</p>
                                </div>
                                <label className="toggle">
                                    <input type="checkbox" defaultChecked />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div>
                                    <h4>Interview Completions</h4>
                                    <p className="text-muted">Get notified when candidates complete interviews</p>
                                </div>
                                <label className="toggle">
                                    <input type="checkbox" defaultChecked />
                                    <span className="toggle-slider"></span>
                                </label>
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
                        <button className="btn btn-primary">Save Changes</button>
                        <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecruiterSettings;
