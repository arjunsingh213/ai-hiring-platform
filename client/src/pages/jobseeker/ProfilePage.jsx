import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './ProfilePage.css';

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        profession: '',
        college: '',
        domain: '',
        desiredRole: '',
        linkedin: '',
        github: '',
        portfolio: ''
    });
    const [loading, setLoading] = useState(false);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const response = await api.get(`/users/${userId}`);
            const userData = response.data.data || response.data;
            setUser(userData);

            if (userData) {
                setFormData({
                    name: userData.profile?.name || '',
                    mobile: userData.profile?.mobile || '',
                    profession: userData.jobSeekerProfile?.profession || '',
                    college: userData.jobSeekerProfile?.college || '',
                    domain: userData.jobSeekerProfile?.domain || '',
                    desiredRole: userData.jobSeekerProfile?.desiredRole || '',
                    linkedin: userData.jobSeekerProfile?.portfolioLinks?.linkedin || '',
                    github: userData.jobSeekerProfile?.portfolioLinks?.github || '',
                    portfolio: userData.jobSeekerProfile?.portfolioLinks?.portfolio || ''
                });
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            alert('Failed to load profile. Please try again.');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put(`/users/${userId}`, {
                profile: {
                    name: formData.name,
                    mobile: formData.mobile
                },
                jobSeekerProfile: {
                    profession: formData.profession,
                    college: formData.college,
                    domain: formData.domain,
                    desiredRole: formData.desiredRole,
                    portfolioLinks: {
                        linkedin: formData.linkedin,
                        github: formData.github,
                        portfolio: formData.portfolio
                    }
                }
            });
            setIsEditing(false);
            fetchUser();
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('photo', file);
                formData.append('userId', userId);

                try {
                    await api.post('/users/upload-photo', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    fetchUser();
                    alert('Photo uploaded successfully!');
                } catch (error) {
                    console.error('Error uploading photo:', error);
                    alert('Failed to upload photo');
                }
            }
        };
        input.click();
    };

    if (!user) {
        return <div className="profile-page"><div className="loading">Loading...</div></div>;
    }

    return (
        <div className="profile-page">
            <div className="profile-header card">
                <div className="profile-banner"></div>
                <div className="profile-info">
                    <div className="profile-avatar-container">
                        <div className="profile-avatar">
                            <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                            </svg>
                        </div>
                        <button className="btn btn-sm btn-secondary" onClick={handlePhotoUpload}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" />
                                <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            Change Photo
                        </button>
                    </div>
                    <div className="profile-details">
                        {isEditing ? (
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input"
                                style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: 'var(--spacing-sm)' }}
                            />
                        ) : (
                            <h1>{user.profile?.name}</h1>
                        )}
                        {isEditing ? (
                            <input
                                type="text"
                                name="profession"
                                value={formData.profession}
                                onChange={handleChange}
                                className="input"
                                placeholder="Profession"
                            />
                        ) : (
                            <p className="profession">{user.jobSeekerProfile?.profession}</p>
                        )}
                        <p className="text-muted">{user.jobSeekerProfile?.college}</p>
                    </div>
                    <div className="profile-actions">
                        {isEditing ? (
                            <>
                                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" />
                                    <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {user.interviewStatus?.completed && (
                    <div className="interview-badge">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" strokeWidth="2" />
                            <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <div>
                            <strong>Interview {user.interviewStatus.cracked ? 'Cracked' : 'Completed'}</strong>
                            <p>Score: {user.interviewStatus.overallScore}/100</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="profile-content">
                <div className="profile-section card">
                    <h3>About</h3>
                    {isEditing ? (
                        <>
                            <div className="form-group">
                                <label>Mobile</label>
                                <input
                                    type="tel"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    className="input"
                                />
                            </div>
                            <div className="form-group">
                                <label>College</label>
                                <input
                                    type="text"
                                    name="college"
                                    value={formData.college}
                                    onChange={handleChange}
                                    className="input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Domain</label>
                                <input
                                    type="text"
                                    name="domain"
                                    value={formData.domain}
                                    onChange={handleChange}
                                    className="input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Desired Role</label>
                                <input
                                    type="text"
                                    name="desiredRole"
                                    value={formData.desiredRole}
                                    onChange={handleChange}
                                    className="input"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <p><strong>Mobile:</strong> {user.profile?.mobile}</p>
                            <p><strong>College:</strong> {user.jobSeekerProfile?.college}</p>
                            <p><strong>Domain:</strong> {user.jobSeekerProfile?.domain}</p>
                            <p><strong>Desired Role:</strong> {user.jobSeekerProfile?.desiredRole}</p>
                        </>
                    )}
                </div>

                <div className="profile-section card">
                    <h3>Links</h3>
                    {isEditing ? (
                        <>
                            <div className="form-group">
                                <label>LinkedIn</label>
                                <input
                                    type="url"
                                    name="linkedin"
                                    value={formData.linkedin}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="https://linkedin.com/in/username"
                                />
                            </div>
                            <div className="form-group">
                                <label>GitHub</label>
                                <input
                                    type="url"
                                    name="github"
                                    value={formData.github}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="https://github.com/username"
                                />
                            </div>
                            <div className="form-group">
                                <label>Portfolio</label>
                                <input
                                    type="url"
                                    name="portfolio"
                                    value={formData.portfolio}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="https://yourportfolio.com"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {user.jobSeekerProfile?.portfolioLinks?.linkedin && (
                                <p>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ display: 'inline', marginRight: '8px' }}>
                                        <path d="M16 8C17.5913 8 19.1174 8.63214 20.2426 9.75736C21.3679 10.8826 22 12.4087 22 14V21H18V14C18 13.4696 17.7893 12.9609 17.4142 12.5858C17.0391 12.2107 16.5304 12 16 12C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V21H10V14C10 12.4087 10.6321 10.8826 11.7574 9.75736C12.8826 8.63214 14.4087 8 16 8Z" stroke="currentColor" strokeWidth="2" />
                                        <rect x="2" y="9" width="4" height="12" stroke="currentColor" strokeWidth="2" />
                                        <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                    <a href={user.jobSeekerProfile.portfolioLinks.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn Profile</a>
                                </p>
                            )}
                            {user.jobSeekerProfile?.portfolioLinks?.github && (
                                <p>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ display: 'inline', marginRight: '8px' }}>
                                        <path d="M9 19C4 20.5 4 16.5 2 16M16 22V18.13C16.0375 17.6532 15.9731 17.1738 15.811 16.7238C15.6489 16.2738 15.3929 15.8634 15.06 15.52C18.2 15.17 21.5 13.98 21.5 8.52C21.4997 7.12383 20.9627 5.7812 20 4.77C20.4559 3.54851 20.4236 2.19835 19.91 1C19.91 1 18.73 0.650001 16 2.48C13.708 1.85882 11.292 1.85882 9 2.48C6.27 0.650001 5.09 1 5.09 1C4.57638 2.19835 4.54414 3.54851 5 4.77C4.03013 5.7887 3.49252 7.14346 3.5 8.55C3.5 13.97 6.8 15.16 9.94 15.55C9.611 15.89 9.35726 16.2954 9.19531 16.7399C9.03335 17.1844 8.96681 17.6581 9 18.13V22" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                    <a href={user.jobSeekerProfile.portfolioLinks.github} target="_blank" rel="noopener noreferrer">GitHub Profile</a>
                                </p>
                            )}
                            {user.jobSeekerProfile?.portfolioLinks?.portfolio && (
                                <p>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ display: 'inline', marginRight: '8px' }}>
                                        <path d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6897C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.4791 3.53087C19.5521 2.60383 18.298 2.07799 16.987 2.0666C15.676 2.0552 14.413 2.55918 13.47 3.46997L11.75 5.17997" stroke="currentColor" strokeWidth="2" />
                                        <path d="M14 11C13.5705 10.4259 13.0226 9.95083 12.3934 9.60707C11.7642 9.26331 11.0685 9.05889 10.3533 9.00768C9.63819 8.95646 8.92037 9.05965 8.24861 9.31023C7.57685 9.5608 6.96684 9.95303 6.45996 10.46L3.45996 13.46C2.54917 14.403 2.04519 15.666 2.05659 16.977C2.06798 18.288 2.59382 19.5421 3.52086 20.4691C4.4479 21.3961 5.70197 21.922 7.01295 21.9334C8.32393 21.9448 9.58694 21.4408 10.53 20.53L12.24 18.82" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                    <a href={user.jobSeekerProfile.portfolioLinks.portfolio} target="_blank" rel="noopener noreferrer">Portfolio Website</a>
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
