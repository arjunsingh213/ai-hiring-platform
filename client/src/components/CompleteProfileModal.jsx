import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useToast } from './Toast';
import './CompleteProfileModal.css';

/**
 * CompleteProfileModal
 * A full-screen blocking form that appears when a user tries to apply 
 * for a job or start an interview with an incomplete profile.
 * Checks: name, phone, DOB, profile photo, desired role, job domains
 */
const CompleteProfileModal = ({ isOpen, onClose, onComplete, action = 'apply' }) => {
    const toast = useToast();
    const userId = localStorage.getItem('userId');
    const photoInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [missingFields, setMissingFields] = useState([]);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        dob: '',
        desiredRole: '',
        jobDomains: [],
        photo: '',
        headline: ''
    });

    // Skill input
    const [skillInput, setSkillInput] = useState('');
    const [skills, setSkills] = useState([]);

    // Domain options
    const domainOptions = [
        'Software Engineering', 'Data Science', 'Machine Learning',
        'Web Development', 'Mobile Development', 'Cloud Computing',
        'Cybersecurity', 'DevOps', 'UI/UX Design', 'Product Management',
        'Marketing', 'Finance', 'Healthcare', 'Education', 'Other'
    ];

    // Fetch user profile to detect missing fields
    useEffect(() => {
        if (!isOpen || !userId) return;

        const fetchProfile = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/users/${userId}`);
                const user = response.data || response;

                const detected = [];
                if (!user.profile?.name) detected.push('name');
                if (!user.profile?.mobile) detected.push('mobile');
                if (!user.profile?.dob) detected.push('dob');
                if (!user.profile?.photo) detected.push('photo');
                if (!user.resume) detected.push('resume');
                if (!user.jobSeekerProfile?.desiredRole) detected.push('desiredRole');
                if (!user.jobSeekerProfile?.jobDomains || user.jobSeekerProfile.jobDomains.length === 0) detected.push('jobDomains');

                // Pre-fill existing data
                setFormData({
                    name: user.profile?.name || '',
                    mobile: user.profile?.mobile || '',
                    dob: user.profile?.dob ? new Date(user.profile.dob).toISOString().split('T')[0] : '',
                    desiredRole: user.jobSeekerProfile?.desiredRole || '',
                    jobDomains: user.jobSeekerProfile?.jobDomains || [],
                    photo: user.profile?.photo || '',
                    headline: user.profile?.headline || ''
                });

                setSkills(user.jobSeekerProfile?.skills?.map(s => typeof s === 'string' ? s : s.name) || []);
                setMissingFields(detected);
            } catch (err) {
                console.error('Failed to fetch profile:', err);
                toast.error('Failed to load profile data');
            }
            setLoading(false);
        };

        fetchProfile();
    }, [isOpen, userId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleDomain = (domain) => {
        setFormData(prev => {
            const current = prev.jobDomains;
            if (current.includes(domain)) {
                return { ...prev, jobDomains: current.filter(d => d !== domain) };
            }
            if (current.length >= 3) {
                toast.warning('You can select up to 3 domains');
                return prev;
            }
            return { ...prev, jobDomains: [...current, domain] };
        });
    };

    // Profile photo upload
    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        setUploadingPhoto(true);
        try {
            const uploadForm = new FormData();
            uploadForm.append('photo', file);
            uploadForm.append('userId', userId);

            const response = await api.post('/users/upload-photo', uploadForm, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.photoUrl || response.data?.photoUrl) {
                const photoUrl = response.photoUrl || response.data?.photoUrl;
                setFormData(prev => ({ ...prev, photo: photoUrl }));
                toast.success('Photo uploaded!');
            }
        } catch (err) {
            console.error('Photo upload error:', err);
            // Fallback: convert to base64 and save directly
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photo: reader.result }));
                toast.success('Photo ready!');
            };
            reader.readAsDataURL(file);
        }
        setUploadingPhoto(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate all mandatory fields
        if (missingFields.includes('name') && !formData.name.trim()) {
            toast.warning('Please enter your full name');
            return;
        }
        if (missingFields.includes('mobile') && !formData.mobile.trim()) {
            toast.warning('Please enter your phone number');
            return;
        }
        if (missingFields.includes('dob') && !formData.dob) {
            toast.warning('Please enter your date of birth');
            return;
        }
        if (missingFields.includes('photo') && !formData.photo) {
            toast.warning('Please upload a profile photo');
            return;
        }
        if (missingFields.includes('resume')) {
            toast.warning('Please upload your resume first');
            return;
        }

        setSaving(true);
        try {
            // Build update in the format the API expects (nested objects)
            const update = { profile: {}, jobSeekerProfile: {} };
            if (formData.name) update.profile.name = formData.name;
            if (formData.mobile) update.profile.mobile = formData.mobile;
            if (formData.dob) update.profile.dob = new Date(formData.dob);
            if (formData.photo) update.profile.photo = formData.photo;
            if (formData.headline) update.profile.headline = formData.headline;
            if (formData.desiredRole) update.jobSeekerProfile.desiredRole = formData.desiredRole;
            if (formData.jobDomains.length > 0) update.jobSeekerProfile.jobDomains = formData.jobDomains;

            // Remove empty sub-objects
            if (Object.keys(update.profile).length === 0) delete update.profile;
            if (Object.keys(update.jobSeekerProfile).length === 0) delete update.jobSeekerProfile;

            await api.put(`/users/${userId}`, update);
            toast.success('Profile updated successfully!');
            onComplete();
        } catch (err) {
            console.error('Failed to update profile:', err);
            toast.error('Failed to update profile. Please try again.');
        }
        setSaving(false);
    };

    if (!isOpen) return null;

    const needsResume = missingFields.includes('resume');

    return (
        <div className="cpm-overlay">
            <div className="cpm-modal" onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className="cpm-close" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6L18 18" />
                    </svg>
                </button>

                {/* Header */}
                <div className="cpm-header">
                    <div className="cpm-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    <h2>Complete Your Profile</h2>
                    <p>
                        {action === 'apply'
                            ? 'Fill in the required details to apply for this job.'
                            : 'Complete your profile before starting the interview.'}
                    </p>
                </div>

                {loading ? (
                    <div className="cpm-loading">
                        <div className="cpm-spinner"></div>
                        <span>Loading profile...</span>
                    </div>
                ) : needsResume ? (
                    <div className="cpm-resume-needed">
                        <div className="cpm-resume-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
                                <path d="M14 2V8H20" />
                            </svg>
                        </div>
                        <h3>Resume Required</h3>
                        <p>You need to upload your resume before you can {action === 'apply' ? 'apply for jobs' : 'start interviews'}.</p>
                        <a href="/onboarding/jobseeker" className="cpm-btn-primary">Upload Resume</a>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="cpm-form">
                        {/* Profile Photo */}
                        {missingFields.includes('photo') && (
                            <div className="cpm-field cpm-photo-field">
                                <label>Profile Photo *</label>
                                <div className="cpm-photo-upload">
                                    <div 
                                        className="cpm-photo-preview" 
                                        onClick={() => photoInputRef.current?.click()}
                                    >
                                        {formData.photo ? (
                                            <img src={formData.photo} alt="Profile" />
                                        ) : (
                                            <div className="cpm-photo-placeholder">
                                                {uploadingPhoto ? (
                                                    <div className="cpm-mini-spinner"></div>
                                                ) : (
                                                    <>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                            <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" />
                                                            <circle cx="12" cy="13" r="4" />
                                                        </svg>
                                                        <span>Upload Photo</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <p className="cpm-photo-hint">Click to upload your profile picture</p>
                                </div>
                            </div>
                        )}

                        {/* Full Name */}
                        {missingFields.includes('name') && (
                            <div className="cpm-field">
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>
                        )}

                        {/* Phone */}
                        {missingFields.includes('mobile') && (
                            <div className="cpm-field">
                                <label>Phone Number *</label>
                                <input
                                    type="tel"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    placeholder="+91 XXXXX XXXXX"
                                    required
                                />
                            </div>
                        )}

                        {/* DOB */}
                        {missingFields.includes('dob') && (
                            <div className="cpm-field">
                                <label>Date of Birth *</label>
                                <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        )}

                        {/* Desired Role */}
                        {missingFields.includes('desiredRole') && (
                            <div className="cpm-field">
                                <label>Desired Role *</label>
                                <input
                                    type="text"
                                    name="desiredRole"
                                    value={formData.desiredRole}
                                    onChange={handleChange}
                                    placeholder="e.g., Full Stack Developer"
                                    required
                                />
                            </div>
                        )}

                        {/* Job Domains */}
                        {missingFields.includes('jobDomains') && (
                            <div className="cpm-field">
                                <label>Job Domains * <span className="cpm-hint">(select up to 3)</span></label>
                                <div className="cpm-domains">
                                    {domainOptions.map(domain => (
                                        <button
                                            key={domain}
                                            type="button"
                                            className={`cpm-domain-chip ${formData.jobDomains.includes(domain) ? 'selected' : ''}`}
                                            onClick={() => toggleDomain(domain)}
                                        >
                                            {domain}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="cpm-actions">
                            <button type="button" className="cpm-btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="cpm-btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Save & Continue'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CompleteProfileModal;
