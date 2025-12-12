import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import ImageCropModal from '../../components/ImageCropModal';
import AITalentPassport from '../../components/AITalentPassport/AITalentPassport';
import './ProfilePage.css';

const ProfilePage = () => {
    const toast = useToast();
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [activeSection, setActiveSection] = useState(null); // 'about', 'experience', 'education', 'skills'
    const [loading, setLoading] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [cropType, setCropType] = useState('photo'); // 'photo' or 'banner'

    // Tab navigation for Profile vs AI Talent Passport
    const [activeTab, setActiveTab] = useState('profile');

    // Form data for editing
    const [formData, setFormData] = useState({
        name: '',
        headline: '',
        location: '',
        about: '',
        mobile: '',
        profession: '',
        college: '',
        domain: '',
        desiredRole: '',
        linkedin: '',
        github: '',
        portfolio: '',
        twitter: '',
        website: ''
    });

    // Modal forms for adding/editing
    const [experienceForm, setExperienceForm] = useState({
        title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: ''
    });
    const [educationForm, setEducationForm] = useState({
        degree: '', institution: '', field: '', startYear: '', endYear: '', grade: ''
    });
    const [skillInput, setSkillInput] = useState('');
    const [editingIndex, setEditingIndex] = useState(null);

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
                    headline: userData.profile?.headline || '',
                    location: userData.profile?.location || '',
                    about: userData.jobSeekerProfile?.about || '',
                    mobile: userData.profile?.mobile || '',
                    profession: userData.jobSeekerProfile?.profession || '',
                    college: userData.jobSeekerProfile?.college || '',
                    domain: userData.jobSeekerProfile?.domain || '',
                    desiredRole: userData.jobSeekerProfile?.desiredRole || '',
                    linkedin: userData.jobSeekerProfile?.portfolioLinks?.linkedin || '',
                    github: userData.jobSeekerProfile?.portfolioLinks?.github || '',
                    portfolio: userData.jobSeekerProfile?.portfolioLinks?.portfolio || '',
                    twitter: userData.jobSeekerProfile?.portfolioLinks?.twitter || '',
                    website: userData.jobSeekerProfile?.portfolioLinks?.website || ''
                });
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            toast.error('Failed to load profile');
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            await api.put(`/users/${userId}`, {
                profile: {
                    name: formData.name,
                    headline: formData.headline,
                    location: formData.location,
                    mobile: formData.mobile
                },
                jobSeekerProfile: {
                    about: formData.about,
                    profession: formData.profession,
                    college: formData.college,
                    domain: formData.domain,
                    desiredRole: formData.desiredRole,
                    portfolioLinks: {
                        linkedin: formData.linkedin,
                        github: formData.github,
                        portfolio: formData.portfolio,
                        twitter: formData.twitter,
                        website: formData.website
                    }
                }
            });
            setIsEditing(false);
            setActiveSection(null);
            await fetchUser();
            toast.success('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    // Photo upload handler
    const handlePhotoUpload = (type = 'photo') => {
        setCropType(type);
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setSelectedImage(reader.result);
                    setShowCropModal(true);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const handleCropComplete = async (croppedBlob) => {
        try {
            const formData = new FormData();
            const endpoint = cropType === 'banner' ? '/users/upload-banner' : '/users/upload-photo';
            const fieldName = cropType === 'banner' ? 'banner' : 'photo';

            formData.append(fieldName, croppedBlob, `${fieldName}.jpg`);
            formData.append('userId', userId);

            await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setShowCropModal(false);
            setSelectedImage(null);
            await fetchUser();
            toast.success(`${cropType === 'banner' ? 'Banner' : 'Photo'} uploaded successfully!`);
        } catch (error) {
            console.error('Error uploading:', error);
            toast.error('Failed to upload image');
        }
    };

    // Experience handlers
    const handleAddExperience = async () => {
        try {
            const experiences = [...(user.jobSeekerProfile?.experience || [])];
            if (editingIndex !== null) {
                experiences[editingIndex] = experienceForm;
            } else {
                experiences.push(experienceForm);
            }

            await api.put(`/users/${userId}`, {
                jobSeekerProfile: { experience: experiences }
            });

            setActiveSection(null);
            setExperienceForm({ title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' });
            setEditingIndex(null);
            await fetchUser();
            toast.success('Experience saved!');
        } catch (error) {
            toast.error('Failed to save experience');
        }
    };

    const handleDeleteExperience = async (index) => {
        try {
            const experiences = [...(user.jobSeekerProfile?.experience || [])];
            experiences.splice(index, 1);

            await api.put(`/users/${userId}`, {
                jobSeekerProfile: { experience: experiences }
            });
            await fetchUser();
            toast.success('Experience deleted!');
        } catch (error) {
            toast.error('Failed to delete experience');
        }
    };

    // Education handlers
    const handleAddEducation = async () => {
        try {
            const education = [...(user.jobSeekerProfile?.education || [])];
            if (editingIndex !== null) {
                education[editingIndex] = educationForm;
            } else {
                education.push(educationForm);
            }

            await api.put(`/users/${userId}`, {
                jobSeekerProfile: { education }
            });

            setActiveSection(null);
            setEducationForm({ degree: '', institution: '', field: '', startYear: '', endYear: '', grade: '' });
            setEditingIndex(null);
            await fetchUser();
            toast.success('Education saved!');
        } catch (error) {
            toast.error('Failed to save education');
        }
    };

    const handleDeleteEducation = async (index) => {
        try {
            const education = [...(user.jobSeekerProfile?.education || [])];
            education.splice(index, 1);

            await api.put(`/users/${userId}`, {
                jobSeekerProfile: { education }
            });
            await fetchUser();
            toast.success('Education deleted!');
        } catch (error) {
            toast.error('Failed to delete education');
        }
    };

    // Skills handlers
    const handleAddSkill = async () => {
        if (!skillInput.trim()) return;

        try {
            const skills = [...(user.jobSeekerProfile?.skills || [])];
            skills.push({ name: skillInput.trim(), level: 'intermediate' });

            await api.put(`/users/${userId}`, {
                jobSeekerProfile: { skills }
            });

            setSkillInput('');
            await fetchUser();
            toast.success('Skill added!');
        } catch (error) {
            toast.error('Failed to add skill');
        }
    };

    const handleDeleteSkill = async (index) => {
        try {
            const skills = [...(user.jobSeekerProfile?.skills || [])];
            skills.splice(index, 1);

            await api.put(`/users/${userId}`, {
                jobSeekerProfile: { skills }
            });
            await fetchUser();
        } catch (error) {
            toast.error('Failed to delete skill');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Present';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    if (!user) {
        return <div className="profile-page"><div className="loading-spinner">Loading...</div></div>;
    }

    return (
        <div className="profile-page">
            {/* Banner Section */}
            <div className="profile-banner-section">
                <div
                    className="profile-banner"
                    style={{
                        backgroundImage: user.jobSeekerProfile?.bannerImage
                            ? `url(${user.jobSeekerProfile.bannerImage})`
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                >
                    <button className="banner-edit-btn" onClick={() => handlePhotoUpload('banner')}>
                        📷 Edit Banner
                    </button>
                </div>

                {/* Profile Photo */}
                <div className="profile-photo-container">
                    <div className="profile-photo">
                        {user.profile?.photo ? (
                            <img src={user.profile.photo} alt="Profile" />
                        ) : (
                            <div className="photo-placeholder">
                                {user.profile?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        )}
                    </div>
                    <button className="photo-edit-btn" onClick={() => handlePhotoUpload('photo')}>
                        📷
                    </button>
                </div>
            </div>

            {/* Profile Header Card */}
            <div className="profile-header-card">
                <div className="profile-header-content">
                    <div className="profile-header-info">
                        <h1>{user.profile?.name}</h1>
                        <p className="headline">{user.profile?.headline || user.jobSeekerProfile?.profession || 'Professional'}</p>
                        <p className="location">
                            📍 {user.profile?.location || user.jobSeekerProfile?.college || 'Location not specified'}
                        </p>
                        <p className="connections">
                            {user.connections?.followersCount || 0} followers • {user.connections?.followingCount || 0} following
                        </p>
                    </div>
                    <div className="profile-header-actions">
                        <button className="btn-primary" onClick={() => setIsEditing(true)}>
                            ✏️ Edit Profile
                        </button>
                    </div>
                </div>

                {/* Interview Badge */}
                {user.interviewStatus?.completed && (
                    <div className={`interview-badge ${user.interviewStatus.cracked ? 'cracked' : ''}`}>
                        <span className="badge-icon">🎯</span>
                        <div>
                            <strong>AI Interview {user.interviewStatus.cracked ? 'Cracked' : 'Completed'}</strong>
                            <p>Score: {user.interviewStatus.overallScore}/100</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="profile-tabs">
                <button
                    className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                </button>
                <button
                    className={`profile-tab ${activeTab === 'talent-passport' ? 'active' : ''}`}
                    onClick={() => setActiveTab('talent-passport')}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    AI Talent Passport
                </button>
            </div>

            {/* Conditional Tab Content */}
            {activeTab === 'talent-passport' ? (
                <AITalentPassport
                    passport={user?.aiTalentPassport}
                    userName={user?.profile?.name}
                />
            ) : (
                <>
                    {/* About Section */}
                    <div className="profile-section">
                        <div className="section-header">
                            <h2>About</h2>
                            <button className="btn-icon" onClick={() => setActiveSection('about')}>✏️</button>
                        </div>
                        <p className="about-text">
                            {user.jobSeekerProfile?.about || 'Tell people about yourself, your experience, and what you\'re looking for.'}
                        </p>
                        <div className="about-details">
                            <div className="detail-item"><span>🎓</span> {user.jobSeekerProfile?.college || 'Add education'}</div>
                            <div className="detail-item"><span>💼</span> {user.jobSeekerProfile?.domain || 'Add domain'}</div>
                            <div className="detail-item"><span>🎯</span> Looking for: {user.jobSeekerProfile?.desiredRole || 'Add desired role'}</div>
                        </div>
                    </div>

                    {/* Experience Section */}
                    <div className="profile-section">
                        <div className="section-header">
                            <h2>Experience</h2>
                            <button className="btn-icon" onClick={() => {
                                setExperienceForm({ title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' });
                                setEditingIndex(null);
                                setActiveSection('experience');
                            }}>➕</button>
                        </div>

                        {(user.jobSeekerProfile?.experience || []).length > 0 ? (
                            <div className="experience-list">
                                {user.jobSeekerProfile.experience.map((exp, index) => (
                                    <div key={index} className="experience-item">
                                        <div className="exp-icon">💼</div>
                                        <div className="exp-content">
                                            <h3>{exp.title}</h3>
                                            <p className="company">{exp.company}</p>
                                            <p className="dates">
                                                {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                                                {exp.location && ` • ${exp.location}`}
                                            </p>
                                            {exp.description && <p className="description">{exp.description}</p>}
                                        </div>
                                        <div className="exp-actions">
                                            <button onClick={() => {
                                                setExperienceForm(exp);
                                                setEditingIndex(index);
                                                setActiveSection('experience');
                                            }}>✏️</button>
                                            <button onClick={() => handleDeleteExperience(index)}>🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="empty-state">Add your work experience to stand out to recruiters</p>
                        )}
                    </div>

                    {/* Education Section */}
                    <div className="profile-section">
                        <div className="section-header">
                            <h2>Education</h2>
                            <button className="btn-icon" onClick={() => {
                                setEducationForm({ degree: '', institution: '', field: '', startYear: '', endYear: '', grade: '' });
                                setEditingIndex(null);
                                setActiveSection('education');
                            }}>➕</button>
                        </div>

                        {(user.jobSeekerProfile?.education || []).length > 0 ? (
                            <div className="education-list">
                                {user.jobSeekerProfile.education.map((edu, index) => (
                                    <div key={index} className="education-item">
                                        <div className="edu-icon">🎓</div>
                                        <div className="edu-content">
                                            <h3>{edu.institution}</h3>
                                            <p className="degree">{edu.degree} {edu.field && `in ${edu.field}`}</p>
                                            <p className="years">
                                                {edu.startYear || edu.year} - {edu.endYear || 'Present'}
                                                {edu.grade && ` • Grade: ${edu.grade}`}
                                            </p>
                                        </div>
                                        <div className="edu-actions">
                                            <button onClick={() => {
                                                setEducationForm(edu);
                                                setEditingIndex(index);
                                                setActiveSection('education');
                                            }}>✏️</button>
                                            <button onClick={() => handleDeleteEducation(index)}>🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="empty-state">Add your educational background</p>
                        )}
                    </div>

                    {/* Skills Section */}
                    <div className="profile-section">
                        <div className="section-header">
                            <h2>Skills</h2>
                            <button className="btn-icon" onClick={() => setActiveSection('skills')}>➕</button>
                        </div>

                        <div className="skills-container">
                            {(user.jobSeekerProfile?.skills || []).map((skill, index) => (
                                <span key={index} className="skill-tag">
                                    {skill.name}
                                    <button className="skill-remove" onClick={() => handleDeleteSkill(index)}>×</button>
                                </span>
                            ))}
                            {(!user.jobSeekerProfile?.skills || user.jobSeekerProfile.skills.length === 0) && (
                                <p className="empty-state">Add skills to showcase your expertise</p>
                            )}
                        </div>
                    </div>

                    {/* Portfolio Links Section */}
                    <div className="profile-section">
                        <div className="section-header">
                            <h2>Links</h2>
                            <button className="btn-icon" onClick={() => setActiveSection('about')}>✏️</button>
                        </div>
                        <div className="links-container">
                            {user.jobSeekerProfile?.portfolioLinks?.linkedin && (
                                <a href={user.jobSeekerProfile.portfolioLinks.linkedin} target="_blank" rel="noopener noreferrer" className="link-item linkedin">
                                    💼 LinkedIn
                                </a>
                            )}
                            {user.jobSeekerProfile?.portfolioLinks?.github && (
                                <a href={user.jobSeekerProfile.portfolioLinks.github} target="_blank" rel="noopener noreferrer" className="link-item github">
                                    💻 GitHub
                                </a>
                            )}
                            {user.jobSeekerProfile?.portfolioLinks?.portfolio && (
                                <a href={user.jobSeekerProfile.portfolioLinks.portfolio} target="_blank" rel="noopener noreferrer" className="link-item portfolio">
                                    🌐 Portfolio
                                </a>
                            )}
                            {user.jobSeekerProfile?.portfolioLinks?.twitter && (
                                <a href={user.jobSeekerProfile.portfolioLinks.twitter} target="_blank" rel="noopener noreferrer" className="link-item twitter">
                                    Twitter
                                </a>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Edit Profile Modal */}
            {isEditing && (
                <div className="modal-overlay" onClick={() => setIsEditing(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Profile</h2>
                            <button className="modal-close" onClick={() => setIsEditing(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Headline</label>
                                <input type="text" name="headline" value={formData.headline} onChange={handleChange} placeholder="e.g., Full Stack Developer | React Specialist" />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="City, Country" />
                            </div>
                            <div className="form-group">
                                <label>About</label>
                                <textarea name="about" value={formData.about} onChange={handleChange} rows={4} placeholder="Tell your story..." />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Desired Role</label>
                                    <input type="text" name="desiredRole" value={formData.desiredRole} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>LinkedIn URL</label>
                                <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>GitHub URL</label>
                                <input type="url" name="github" value={formData.github} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Portfolio URL</label>
                                <input type="url" name="portfolio" value={formData.portfolio} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSaveProfile} disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Experience Modal */}
            {activeSection === 'experience' && (
                <div className="modal-overlay" onClick={() => setActiveSection(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingIndex !== null ? 'Edit' : 'Add'} Experience</h2>
                            <button className="modal-close" onClick={() => setActiveSection(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Job Title *</label>
                                <input type="text" value={experienceForm.title} onChange={e => setExperienceForm({ ...experienceForm, title: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Company *</label>
                                <input type="text" value={experienceForm.company} onChange={e => setExperienceForm({ ...experienceForm, company: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input type="text" value={experienceForm.location} onChange={e => setExperienceForm({ ...experienceForm, location: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input type="month" value={experienceForm.startDate?.substring(0, 7)} onChange={e => setExperienceForm({ ...experienceForm, startDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input type="month" value={experienceForm.endDate?.substring(0, 7)} onChange={e => setExperienceForm({ ...experienceForm, endDate: e.target.value })} disabled={experienceForm.current} />
                                </div>
                            </div>
                            <div className="form-group checkbox-group">
                                <input type="checkbox" id="current" checked={experienceForm.current} onChange={e => setExperienceForm({ ...experienceForm, current: e.target.checked, endDate: '' })} />
                                <label htmlFor="current">I currently work here</label>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={experienceForm.description} onChange={e => setExperienceForm({ ...experienceForm, description: e.target.value })} rows={3} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setActiveSection(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleAddExperience}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Education Modal */}
            {activeSection === 'education' && (
                <div className="modal-overlay" onClick={() => setActiveSection(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingIndex !== null ? 'Edit' : 'Add'} Education</h2>
                            <button className="modal-close" onClick={() => setActiveSection(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Institution *</label>
                                <input type="text" value={educationForm.institution} onChange={e => setEducationForm({ ...educationForm, institution: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Degree *</label>
                                <input type="text" value={educationForm.degree} onChange={e => setEducationForm({ ...educationForm, degree: e.target.value })} placeholder="e.g., Bachelor's, Master's" />
                            </div>
                            <div className="form-group">
                                <label>Field of Study</label>
                                <input type="text" value={educationForm.field} onChange={e => setEducationForm({ ...educationForm, field: e.target.value })} placeholder="e.g., Computer Science" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Year</label>
                                    <input type="number" value={educationForm.startYear} onChange={e => setEducationForm({ ...educationForm, startYear: e.target.value })} min="1950" max="2030" />
                                </div>
                                <div className="form-group">
                                    <label>End Year</label>
                                    <input type="number" value={educationForm.endYear} onChange={e => setEducationForm({ ...educationForm, endYear: e.target.value })} min="1950" max="2030" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Grade/CGPA</label>
                                <input type="text" value={educationForm.grade} onChange={e => setEducationForm({ ...educationForm, grade: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setActiveSection(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleAddEducation}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Skills Modal */}
            {activeSection === 'skills' && (
                <div className="modal-overlay" onClick={() => setActiveSection(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Skills</h2>
                            <button className="modal-close" onClick={() => setActiveSection(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Skill Name</label>
                                <div className="skill-input-row">
                                    <input
                                        type="text"
                                        value={skillInput}
                                        onChange={e => setSkillInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleAddSkill()}
                                        placeholder="e.g., React, Node.js, Python"
                                    />
                                    <button className="btn-primary" onClick={handleAddSkill}>Add</button>
                                </div>
                            </div>
                            <div className="current-skills">
                                <label>Current Skills:</label>
                                <div className="skills-container">
                                    {(user.jobSeekerProfile?.skills || []).map((skill, index) => (
                                        <span key={index} className="skill-tag">
                                            {skill.name}
                                            <button className="skill-remove" onClick={() => handleDeleteSkill(index)}>×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-primary" onClick={() => setActiveSection(null)}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Crop Modal */}
            {showCropModal && selectedImage && (
                <ImageCropModal
                    image={selectedImage}
                    onComplete={handleCropComplete}
                    onCancel={() => { setShowCropModal(false); setSelectedImage(null); }}
                    aspectRatio={cropType === 'banner' ? 3 : 1}
                />
            )}
        </div>
    );
};

export default ProfilePage;
