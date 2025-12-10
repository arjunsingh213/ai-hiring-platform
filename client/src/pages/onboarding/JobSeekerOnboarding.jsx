import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import ImageCropModal from '../../components/ImageCropModal';
import OnboardingInterview from './OnboardingInterview';
import LiveCameraVerification from '../../components/LiveCameraVerification';
import { validateProfilePhoto } from '../../services/faceValidationService';
import './Onboarding.css';

const JobSeekerOnboarding = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [step, setStep] = useState(1);
    const [showInterviewPrompt, setShowInterviewPrompt] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        dob: '',
        profession: '',
        college: '',
        domain: '',
        mobile: '',
        experienceLevel: 'fresher',
        desiredRole: '',
        linkedin: '',
        github: '',
        portfolio: '',
        photo: null
    });
    const [resumeFile, setResumeFile] = useState(null);
    const [loading, setLoading] = useState(false);

    // Image crop state
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [croppedPhotoBlob, setCroppedPhotoBlob] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    // Face verification state
    const [showFaceVerification, setShowFaceVerification] = useState(false);
    const [faceDescriptor, setFaceDescriptor] = useState(null);
    const [faceVerified, setFaceVerified] = useState(false);
    const [faceValidationResult, setFaceValidationResult] = useState(null);
    const [validatingFace, setValidatingFace] = useState(false);

    // Interview state
    const [showInterview, setShowInterview] = useState(false);
    const [parsedResume, setParsedResume] = useState(null);
    const [parsingResume, setParsingResume] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (name === 'resume') {
            setResumeFile(files[0]);
        } else if (name === 'photo') {
            // Open crop modal instead of directly setting photo
            const file = files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    setCropImageSrc(reader.result);
                    setShowCropModal(true);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleCropComplete = async (croppedBlob) => {
        setCroppedPhotoBlob(croppedBlob);
        const previewUrl = URL.createObjectURL(croppedBlob);
        setPhotoPreview(previewUrl);
        setFormData(prev => ({ ...prev, photo: croppedBlob }));
        setShowCropModal(false);
        setCropImageSrc(null);

        // Validate face in the uploaded photo
        setValidatingFace(true);
        toast.info('Validating face in photo...');

        try {
            // Create an image element from the blob
            const img = new Image();
            img.src = previewUrl;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const validationResult = await validateProfilePhoto(img);
            setFaceValidationResult(validationResult);

            if (validationResult.valid) {
                setFaceDescriptor(validationResult.descriptor);
                toast.success('Face detected! Please complete live verification.');
                // Trigger live camera verification
                setShowFaceVerification(true);
            } else {
                toast.error(validationResult.message || 'Face validation failed. Please upload a clearer photo.');
                setPhotoPreview(null);
                setCroppedPhotoBlob(null);
                setFormData(prev => ({ ...prev, photo: null }));
            }
        } catch (error) {
            console.error('Face validation error:', error);
            toast.error('Failed to validate face. Please try again.');
        } finally {
            setValidatingFace(false);
        }
    };

    const handleFaceVerificationComplete = (result) => {
        setShowFaceVerification(false);

        if (result.success) {
            setFaceVerified(true);
            // Update face descriptor with live descriptor for better accuracy
            if (result.descriptor) {
                setFaceDescriptor(result.descriptor);
            }
            toast.success('🎉 Face verification successful! Your identity is confirmed.');
        } else {
            // Face didn't match - clear photo and ask to try again
            setFaceVerified(false);
            setPhotoPreview(null);
            setCroppedPhotoBlob(null);
            setFormData(prev => ({ ...prev, photo: null }));
            setFaceDescriptor(null);
            toast.error('Face verification failed. Please upload a matching photo.');
        }
    };

    const handleFaceVerificationCancel = () => {
        setShowFaceVerification(false);
        // Keep the photo but mark as unverified
        setFaceVerified(false);
        toast.warning('Face verification skipped. You can verify later.');
    };

    const handleCropCancel = () => {
        setShowCropModal(false);
        setCropImageSrc(null);
    };

    const nextStep = () => {
        if (step < 4) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        // Validate required fields
        if (!formData.name || !formData.age || !formData.mobile || !formData.profession || !formData.college || !formData.domain || !formData.desiredRole) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                throw new Error('User ID not found');
            }

            // Upload photo if cropped photo blob exists
            let photoUrl = '';
            if (croppedPhotoBlob) {
                try {
                    const photoFormData = new FormData();
                    photoFormData.append('photo', croppedPhotoBlob, 'profile-photo.jpg');
                    photoFormData.append('userId', userId);

                    const photoResponse = await api.post('/users/upload-photo', photoFormData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    photoUrl = photoResponse.photoUrl || photoResponse.data?.photoUrl || '';
                    console.log('Photo uploaded successfully:', photoUrl);
                } catch (photoError) {
                    console.error('Photo upload failed:', photoError);
                    // Continue without photo
                }
            }

            // Update existing user
            const userData = {
                profile: {
                    name: formData.name.trim(),
                    age: parseInt(formData.age),
                    dob: formData.dob,
                    mobile: formData.mobile.trim(),
                    photo: photoUrl || '',
                    // Face authentication data
                    faceDescriptor: faceDescriptor || [],
                    faceVerified: faceVerified,
                    faceVerifiedAt: faceVerified ? new Date().toISOString() : null,
                    faceQualityScore: faceValidationResult?.score || 0,
                    livenessVerified: faceVerified
                },
                jobSeekerProfile: {
                    profession: formData.profession.trim(),
                    college: formData.college.trim(),
                    domain: formData.domain.trim(),
                    experienceLevel: formData.experienceLevel,
                    desiredRole: formData.desiredRole.trim(),
                    portfolioLinks: {
                        linkedin: formData.linkedin,
                        github: formData.github,
                        portfolio: formData.portfolio
                    }
                },
                isOnboardingComplete: true // Mark onboarding as complete
            };

            console.log('Updating user data:', userData);

            const userResponse = await api.put(`/users/${userId}`, userData);
            console.log('User updated successfully:', userId);

            // Upload resume if provided (optional)
            if (resumeFile) {
                try {
                    const resumeFormData = new FormData();
                    resumeFormData.append('resume', resumeFile);
                    resumeFormData.append('userId', userId);
                    await api.post('/resumes/upload', resumeFormData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    console.log('Resume uploaded successfully');
                } catch (resumeError) {
                    console.error('Resume upload failed (continuing anyway):', resumeError);
                    // Don't fail the entire onboarding if resume upload fails
                }
            }

            // Store user ID in localStorage
            localStorage.setItem('userId', userId);
            localStorage.setItem('userRole', 'jobseeker');

            // Show AI interview prompt
            setShowInterviewPrompt(true);
        } catch (error) {
            console.error('Onboarding error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to complete onboarding';
            toast.error(`Error: ${errorMessage}\n\nPlease try again.`);
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="form-step animate-fade-in">
                        <h2>Personal Information</h2>
                        <p className="step-description">Tell us about yourself</p>

                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input"
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Age *</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="25"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date of Birth *</label>
                                <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    className="input"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mobile Number *</label>
                            <input
                                type="tel"
                                name="mobile"
                                value={formData.mobile}
                                onChange={handleChange}
                                className="input"
                                placeholder="+1 234 567 8900"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Profile Photo</label>
                            <div className="photo-upload-container">
                                {photoPreview ? (
                                    <div className="photo-preview">
                                        <img src={photoPreview} alt="Profile preview" />
                                        <button
                                            type="button"
                                            className="change-photo-btn"
                                            onClick={() => document.getElementById('photo-input').click()}
                                        >
                                            Change Photo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="photo-placeholder" onClick={() => document.getElementById('photo-input').click()}>
                                        <span className="photo-icon">📷</span>
                                        <span>Click to upload</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    id="photo-input"
                                    name="photo"
                                    onChange={handleFileChange}
                                    className="hidden-input"
                                    accept="image/*"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="form-step animate-fade-in">
                        <h2>Professional Details</h2>
                        <p className="step-description">Your educational and professional background</p>

                        <div className="form-group">
                            <label className="form-label">Profession *</label>
                            <input
                                type="text"
                                name="profession"
                                value={formData.profession}
                                onChange={handleChange}
                                className="input"
                                placeholder="Software Engineer"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">College/University *</label>
                            <input
                                type="text"
                                name="college"
                                value={formData.college}
                                onChange={handleChange}
                                className="input"
                                placeholder="MIT"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Domain/Field *</label>
                            <input
                                type="text"
                                name="domain"
                                value={formData.domain}
                                onChange={handleChange}
                                className="input"
                                placeholder="Computer Science"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Experience Level *</label>
                            <select
                                name="experienceLevel"
                                value={formData.experienceLevel}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="fresher">Fresher</option>
                                <option value="experienced">Experienced</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Desired Role *</label>
                            <input
                                type="text"
                                name="desiredRole"
                                value={formData.desiredRole}
                                onChange={handleChange}
                                className="input"
                                placeholder="Full Stack Developer"
                                required
                            />
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="form-step animate-fade-in">
                        <h2>Portfolio & Links</h2>
                        <p className="step-description">Share your professional profiles</p>

                        <div className="form-group">
                            <label className="form-label">LinkedIn Profile</label>
                            <input
                                type="url"
                                name="linkedin"
                                value={formData.linkedin}
                                onChange={handleChange}
                                className="input"
                                placeholder="https://linkedin.com/in/johndoe"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">GitHub Profile</label>
                            <input
                                type="url"
                                name="github"
                                value={formData.github}
                                onChange={handleChange}
                                className="input"
                                placeholder="https://github.com/johndoe"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Portfolio Website</label>
                            <input
                                type="url"
                                name="portfolio"
                                value={formData.portfolio}
                                onChange={handleChange}
                                className="input"
                                placeholder="https://johndoe.com"
                            />
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="form-step animate-fade-in">
                        <h2>Upload Resume</h2>
                        <p className="step-description">Upload your resume for AI analysis</p>

                        <div className="upload-area">
                            <div className="upload-icon">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3>Upload Your Resume</h3>
                            <p>PDF or DOCX format, max 5MB</p>
                            <input
                                type="file"
                                name="resume"
                                onChange={handleFileChange}
                                className="input"
                                accept=".pdf,.doc,.docx"
                                id="resume-upload"
                            />
                            <label htmlFor="resume-upload" className="btn btn-outline">
                                Choose File
                            </label>
                            {resumeFile && (
                                <div className="file-selected">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span>{resumeFile.name}</span>
                                </div>
                            )}
                        </div>

                        <div className="info-box">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <div>
                                <strong>Why upload your resume?</strong>
                                <p>Our AI will analyze your resume to generate personalized interview questions and match you with relevant jobs.</p>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="onboarding">
            <div className="onboarding-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
            </div>

            {/* Hide onboarding form when interview is active */}
            {!showInterview && (
                <div className="onboarding-container">
                    <div className="onboarding-header">
                        <h1>Job Seeker Onboarding</h1>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }}></div>
                        </div>
                        <p className="step-indicator">Step {step} of 4</p>
                    </div>

                    <div className="onboarding-content card-glass">
                        {renderStep()}

                        <div className="form-actions">
                            {step > 1 && (
                                <button onClick={prevStep} className="btn btn-secondary">
                                    Previous
                                </button>
                            )}
                            {step < 4 ? (
                                <button onClick={nextStep} className="btn btn-primary">
                                    Next
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            ) : (
                                <button onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
                                    {loading ? <span className="loading"></span> : 'Complete Onboarding'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showInterviewPrompt}
                title="Take AI Interview?"
                message="Crack the interview to stand out among top-tier recruiters! Would you like to take the AI interview now? (Recommended)"
                confirmText="Yes, Let's Go!"
                cancelText="Skip for Now"
                variant="info"
                onConfirm={async () => {
                    setShowInterviewPrompt(false);
                    // Parse resume if available
                    if (resumeFile) {
                        setParsingResume(true);
                        try {
                            const formData = new FormData();
                            formData.append('resume', resumeFile);
                            const response = await api.post('/resume/parse', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            if (response.success && response.data.parsedResume) {
                                setParsedResume(response.data.parsedResume);
                            }
                        } catch (error) {
                            console.error('Resume parsing failed:', error);
                            // Continue with empty resume data
                        }
                        setParsingResume(false);
                    }
                    setShowInterview(true);
                }}
                onCancel={() => {
                    setShowInterviewPrompt(false);
                    navigate('/jobseeker/home');
                }}
            />

            {/* Image Crop Modal */}
            {showCropModal && cropImageSrc && (
                <ImageCropModal
                    image={cropImageSrc}
                    onComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}

            {/* Live Camera Face Verification Modal */}
            {showFaceVerification && (
                <LiveCameraVerification
                    referenceDescriptor={faceDescriptor}
                    onVerificationComplete={handleFaceVerificationComplete}
                    onCancel={handleFaceVerificationCancel}
                />
            )}

            {/* Face Validation Loading Overlay */}
            {validatingFace && (
                <div className="face-validation-overlay">
                    <div className="face-validation-spinner">
                        <div className="spinner"></div>
                        <p>Validating face in photo...</p>
                    </div>
                </div>
            )}

            {/* Inline Interview */}
            {showInterview && (
                <OnboardingInterview
                    parsedResume={parsedResume}
                    userId={localStorage.getItem('userId')}
                    desiredRole={formData.desiredRole}
                    onComplete={(results) => {
                        toast.success(`Interview completed! Score: ${results?.score || 'N/A'}`);
                        navigate('/jobseeker/home');
                    }}
                    onSkip={() => {
                        toast.info('Interview skipped. You can take it later.');
                        navigate('/jobseeker/home');
                    }}
                />
            )}
        </div>
    );
};

export default JobSeekerOnboarding;
