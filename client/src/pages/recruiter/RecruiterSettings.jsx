import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import '../jobseeker/SettingsPage.css';
import ContactForm from '../../components/ContactForm';

const RecruiterSettings = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const userId = localStorage.getItem('userId');
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState({
        profile: {
            name: '',
            headline: '',
            bio: '',
            location: '',
            photo: ''
        },
        recruiterProfile: {
            companyName: '',
            position: '',
            industry: '',
            companyWebsite: '',
            location: ''
        }
    });

    useEffect(() => {
        if (userId) {
            fetchUserData();
        }
    }, [userId]);

    const fetchUserData = async () => {
        try {
            setFetching(true);
            const response = await api.get(`/users/${userId}`);
            const user = response.data?.data || response.data;
            if (user) {
                setFormData({
                    profile: {
                        name: user.profile?.name || '',
                        headline: user.profile?.headline || '',
                        bio: user.profile?.bio || '',
                        location: user.profile?.location || '',
                        photo: user.profile?.photo || ''
                    },
                    recruiterProfile: {
                        companyName: user.recruiterProfile?.companyName || '',
                        position: user.recruiterProfile?.position || '',
                        industry: user.recruiterProfile?.industry || '',
                        companyWebsite: user.recruiterProfile?.companyWebsite || '',
                        location: user.recruiterProfile?.location || user.profile?.location || ''
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            toast.error('Failed to load profile data');
        } finally {
            setFetching(false);
        }
    };

    const handleInputChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await api.put(`/users/${userId}`, formData);
            if (response.success || response.data?.success) {
                window.dispatchEvent(new CustomEvent('profile-updated'));
                toast.success('Profile updated successfully');
                // Refresh local storage if needed or just rely on state
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTimestamp');
        window.location.href = '/';
    };

    if (fetching) {
        return (
            <div className="settings-page">
                <div className="settings-header">
                    <h1>Settings</h1>
                    <p className="text-muted">Loading your settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>Settings</h1>
                <p className="text-muted">Manage your recruiter profile and account</p>
            </div>

            <div className="settings-container">
                <div className="settings-sidebar card">
                    <button
                        className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        Profile
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'company' ? 'active' : ''}`}
                        onClick={() => setActiveTab('company')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" />
                            <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" />
                        </svg>
                        Company
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notifications')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" />
                        </svg>
                        Notifications
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'support' ? 'active' : ''}`}
                        onClick={() => setActiveTab('support')}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" />
                        </svg>
                        Support
                    </button>
                </div>

                <div className="settings-content card">
                    {activeTab === 'profile' && (
                        <div className="settings-section">
                            <h2>Profile Information</h2>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.profile.name}
                                    onChange={(e) => handleInputChange('profile', 'name', e.target.value)}
                                    placeholder="Your Name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Headline</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.profile.headline}
                                    onChange={(e) => handleInputChange('profile', 'headline', e.target.value)}
                                    placeholder="e.g. Senior Technical Recruiter at TechFlow"
                                />
                            </div>
                            <div className="form-group">
                                <label>Bio</label>
                                <textarea
                                    className="input"
                                    rows="4"
                                    value={formData.profile.bio}
                                    onChange={(e) => handleInputChange('profile', 'bio', e.target.value)}
                                    placeholder="Tell others about yourself..."
                                />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.profile.location}
                                    onChange={(e) => handleInputChange('profile', 'location', e.target.value)}
                                    placeholder="e.g. San Francisco, CA"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'company' && (
                        <div className="settings-section">
                            <h2>Company Information</h2>
                            <div className="form-group">
                                <label>Company Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.recruiterProfile.companyName}
                                    onChange={(e) => handleInputChange('recruiterProfile', 'companyName', e.target.value)}
                                    placeholder="Company Name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Your Position</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.recruiterProfile.position}
                                    onChange={(e) => handleInputChange('recruiterProfile', 'position', e.target.value)}
                                    placeholder="e.g. Hiring Manager"
                                />
                            </div>
                            <div className="form-group">
                                <label>Industry</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.recruiterProfile.industry}
                                    onChange={(e) => handleInputChange('recruiterProfile', 'industry', e.target.value)}
                                    placeholder="e.g. Technology"
                                />
                            </div>
                            <div className="form-group">
                                <label>Company Website</label>
                                <input
                                    type="url"
                                    className="input"
                                    value={formData.recruiterProfile.companyWebsite}
                                    onChange={(e) => handleInputChange('recruiterProfile', 'companyWebsite', e.target.value)}
                                    placeholder="https://example.com"
                                />
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
                        {(activeTab === 'profile' || activeTab === 'company') && (
                            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}
                        <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecruiterSettings;

