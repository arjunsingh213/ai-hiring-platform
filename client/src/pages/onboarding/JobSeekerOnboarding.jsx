import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import ImageCropModal from '../../components/ImageCropModal';
import OnboardingInterview from './OnboardingInterview';
import InterviewReadiness from '../interview/InterviewReadiness';
import LiveCameraVerification from '../../components/LiveCameraVerification';
import { validateProfilePhoto } from '../../services/faceValidationService';
import AutocompleteInput from '../../components/AutocompleteInput';
import { search as searchColleges } from 'aishe-institutions-list';
import {
    DOMAINS,
    JOB_DOMAINS,
    JOB_ROLES,
    PROFESSIONS,
    validateAgeAndDOB,
    validateName,
    validateMobile,
    validateLinkedIn,
    validateGitHub
} from '../../data/validationData';
import './Onboarding.css';
import PlatformWalkthrough from './PlatformWalkthrough';
import OnboardingMethodChoice from './OnboardingMethodChoice';
import ResumeUploadFirst from './ResumeUploadFirst';

const JobSeekerOnboarding = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const toast = useToast();

    // Initialize step from URL params or default to 1
    const getInitialStep = () => {
        const stepParam = searchParams.get('step');
        if (stepParam === 'interview') return 4;
        if (stepParam && !isNaN(parseInt(stepParam))) {
            const parsedStep = parseInt(stepParam);
            if (parsedStep >= 1 && parsedStep <= 5) return parsedStep;
        }
        return 1;
    };

    // Onboarding method selection
    const [onboardingMethod, setOnboardingMethod] = useState(null); // null | 'manual' | 'resume'
    const [resumeAutoFillData, setResumeAutoFillData] = useState(null); // Parsed resume data for auto-fill

    const [step, setStep] = useState(getInitialStep);
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
        yearsOfExperience: '', // NEW: Years of professional experience in desired role
        desiredRole: '',
        jobDomains: [], // Array of selected job domains (max 3)
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
    const [showInterviewReadiness, setShowInterviewReadiness] = useState(false);
    const [capturedFacePhoto, setCapturedFacePhoto] = useState(null);
    const [interviewReadinessComplete, setInterviewReadinessComplete] = useState(false);
    const [parsedResume, setParsedResume] = useState(null);
    const [parsingResume, setParsingResume] = useState(false);

    // Interview access control state
    const [interviewStatus, setInterviewStatus] = useState({
        loading: true,
        canTakeInterview: false,
        status: 'none',
        message: '',
        rejectionReason: null,
        cooldownEndsAt: null
    });

    // Validation errors state
    const [errors, setErrors] = useState({});

    // Custom "Other" values for autocomplete fields
    const [otherValues, setOtherValues] = useState({
        college: '',
        domain: '',
        desiredRole: '',
        profession: ''
    });

    // Force light theme on onboarding page
    useEffect(() => {
        const previousTheme = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', 'light');

        return () => {
            if (previousTheme) {
                document.documentElement.setAttribute('data-theme', previousTheme);
            }
        };
    }, []);

    // Handle OAuth redirect - extract token and userId from URL
    useEffect(() => {
        const tokenFromUrl = searchParams.get('token');
        const userIdFromUrl = searchParams.get('userId');

        if (tokenFromUrl) {
            // Store JWT token for API authentication
            localStorage.setItem('token', tokenFromUrl);
            console.log('OAuth token stored from URL');
        }

        if (userIdFromUrl) {
            // Store userId for user identification
            localStorage.setItem('userId', userIdFromUrl);
            console.log('OAuth userId stored from URL:', userIdFromUrl);
        }

        // Clean up URL params after extracting (optional - for cleaner URL)
        if (tokenFromUrl || userIdFromUrl) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);
        }
    }, [searchParams]);

    // Persist step to URL when it changes (for refresh persistence)
    useEffect(() => {
        const currentStepParam = searchParams.get('step');
        const newStepValue = step === 4 ? 'interview' : step.toString();

        // Only update if different to avoid infinite loops
        if (currentStepParam !== newStepValue) {
            setSearchParams({ step: newStepValue }, { replace: true });
        }
    }, [step]);

    // Handle step query parameter for direct interview access
    useEffect(() => {
        const stepParam = searchParams.get('step');
        if (stepParam === 'interview') {
            // Check if user has completed basic onboarding
            const userId = localStorage.getItem('userId');
            if (userId) {
                // Fetch user's existing profile data including parsed resume
                const fetchUserProfile = async () => {
                    try {
                        const userResponse = await api.get(`/users/${userId}`);
                        const userData = userResponse.data || userResponse;

                        // Set form data from existing profile
                        if (userData.jobSeekerProfile) {
                            const profile = userData.jobSeekerProfile;
                            setFormData(prev => ({
                                ...prev,
                                domain: profile.domain || '',
                                desiredRole: profile.desiredRole || '',
                                experience: profile.experienceLevel || '',
                                skills: profile.skills || []
                            }));

                            // Use the existing parsed resume if available
                            if (profile.parsedResume) {
                                console.log('Using pre-parsed resume with skills:', profile.parsedResume.skills?.slice(0, 5));
                                setParsedResume(profile.parsedResume);
                            } else {
                                // No resume found - redirect to resume upload step
                                console.log('[INTERVIEW] No resume found - redirecting to resume upload');
                                toast.warning('Please upload your resume first');
                                setSearchParams({ step: '3' }, { replace: true });
                                setStep(3);
                                return; // Stop further processing
                            }
                        } else {
                            // No job seeker profile - redirect to resume upload
                            console.log('[INTERVIEW] No profile found - redirecting to resume upload');
                            toast.warning('Please complete your profile first');
                            setSearchParams({ step: '3' }, { replace: true });
                            setStep(3);
                            return; // Stop further processing
                        }

                        // Set basic profile info
                        if (userData.profile) {
                            setFormData(prev => ({
                                ...prev,
                                name: userData.profile.name || ''
                            }));
                        }
                    } catch (error) {
                        console.error('Failed to fetch user profile:', error);
                        // On error, redirect to resume upload to be safe
                        toast.error('Failed to load profile. Please start from resume upload.');
                        setSearchParams({ step: '3' }, { replace: true });
                        setStep(3);
                        return;
                    }
                };

                // Check interview status before showing interview
                const checkInterviewStatus = async () => {
                    try {
                        // First fetch user profile to get resume data
                        await fetchUserProfile();

                        const response = await api.get(`/onboarding-interview/check-status/${userId}`);
                        if (response.success) {
                            setInterviewStatus({
                                loading: false,
                                canTakeInterview: response.canTakeInterview,
                                status: response.status,
                                message: response.message,
                                rejectionReason: response.rejectionReason || null,
                                cooldownEndsAt: response.cooldownEndsAt || null
                            });

                            if (response.canTakeInterview) {
                                setStep(4);
                                setShowInterviewReadiness(true);
                                toast.info('Complete the interview preparation to start');
                            } else {
                                setStep(4);
                                // Don't show readiness, show status message instead
                                toast.warning(response.message);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to check interview status:', error);
                        // Default to allowing interview if check fails
                        setInterviewStatus(prev => ({ ...prev, loading: false, canTakeInterview: true }));
                        setStep(4);
                        setShowInterviewReadiness(true);
                    }
                };
                checkInterviewStatus();
            } else {
                // No userId - redirect to step 1
                console.log('[INTERVIEW] No userId found - redirecting to step 1');
                toast.warning('Please complete your profile first');
                setSearchParams({ step: '1' }, { replace: true });
                setStep(1);
            }
        }
    }, []);

    // Auto-fill form data from resume
    useEffect(() => {
        if (resumeAutoFillData && onboardingMethod === 'resume') {
            console.log('Auto-filling form from resume data:', resumeAutoFillData);

            setFormData(prev => ({
                ...prev,
                // Step 1: Personal Information
                name: resumeAutoFillData.name || prev.name,
                age: calculateAge(resumeAutoFillData.dateOfBirth) || resumeAutoFillData.age || prev.age,
                dob: formatDateOfBirth(resumeAutoFillData.dateOfBirth) || prev.dob,
                mobile: resumeAutoFillData.phone || resumeAutoFillData.mobile || prev.mobile,

                // Step 2: Education
                college: resumeAutoFillData.education?.[0]?.institution || prev.college,
                domain: resumeAutoFillData.education?.[0]?.field || resumeAutoFillData.domain || prev.domain,
                profession: resumeAutoFillData.profession || determineProfession(resumeAutoFillData) || prev.profession,

                // Step 3: Experience (resume already uploaded, so skip this step in logic)
                experienceLevel: determineExperienceLevel(resumeAutoFillData.experience) || prev.experienceLevel,
                yearsOfExperience: resumeAutoFillData.totalExperience?.toString() || prev.yearsOfExperience,

                // Step 4: Preferences
                desiredRole: resumeAutoFillData.desiredRole || resumeAutoFillData.currentRole || prev.desiredRole,
                jobDomains: extractJobDomains(resumeAutoFillData.skills) || prev.jobDomains,
                linkedin: resumeAutoFillData.linkedin || prev.linkedin,
                github: resumeAutoFillData.github || prev.github,
                portfolio: resumeAutoFillData.portfolio || prev.portfolio,
            }));

            // Set parsed resume for interview
            if (resumeAutoFillData) {
                setParsedResume({
                    ...resumeAutoFillData,
                    skills: resumeAutoFillData.skills || [],
                    experience: resumeAutoFillData.experience || [],
                    education: resumeAutoFillData.education || []
                });
            }

            toast.success('Resume data loaded! Review and edit if needed.');
        }
    }, [resumeAutoFillData, onboardingMethod]);

    // Helper function: Calculate age from date of birth
    const calculateAge = (dob) => {
        if (!dob) return '';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age > 0 && age < 100 ? age.toString() : '';
    };

    // Helper function: Format date of birth to YYYY-MM-DD
    const formatDateOfBirth = (dob) => {
        if (!dob) return '';
        try {
            const date = new Date(dob);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0]; // YYYY-MM-DD format
        } catch {
            return '';
        }
    };

    // Helper function: Determine profession from resume data
    const determineProfession = (resumeData) => {
        if (resumeData.profession) return resumeData.profession;
        if (resumeData.experience && resumeData.experience.length > 0) {
            const latestJob = resumeData.experience[0];
            return latestJob.title || '';
        }
        return '';
    };

    // Helper function: Determine experience level from experience array
    const determineExperienceLevel = (experience) => {
        if (!experience || experience.length === 0) return 'fresher';

        // Calculate total years
        let totalMonths = 0;
        experience.forEach(exp => {
            if (exp.startDate) {
                const start = new Date(exp.startDate);
                const end = exp.current ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date());
                const months = (end.getFullYear() - start.getFullYear()) * 12 +
                    (end.getMonth() - start.getMonth());
                totalMonths += months > 0 ? months : 0;
            }
        });

        const totalYears = totalMonths / 12;
        if (totalYears < 1) return 'fresher';
        if (totalYears < 3) return 'entry';
        if (totalYears < 5) return 'mid';
        return 'senior';
    };

    // Helper function: Extract job domains from skills (max 3)
    const extractJobDomains = (skills) => {
        if (!skills || skills.length === 0) return [];

        // For now, just return empty array - let user select manually
        // This avoids validation errors from mismatched skill names
        // TODO: Implement skill-to-domain mapping in future
        return [];
    };

    // Handle method selection
    const handleMethodSelect = (method) => {
        setOnboardingMethod(method);
        if (method === 'manual') {
            // Skip directly to step 1
            setStep(1);
        }
        // If 'resume', ResumeUploadFirst will be shown
    };

    // Handle resume upload completion
    const handleResumeUploadComplete = (parsedData) => {
        console.log('Resume upload complete, parsed data:', parsedData);
        setOnboardingMethod('resume'); // CRITICAL: Set method to enable transition
        setResumeAutoFillData(parsedData);
        // Now show step 1 with auto-filled data
        setStep(1);
    };

    // Handle switch to manual from resume upload
    const handleSwitchToManual = () => {
        setOnboardingMethod('manual');
        setResumeAutoFillData(null);
        setStep(1);
    };

    // College search wrapper for AISHE
    const searchCollegeWrapper = (query, limit = 10) => {
        try {
            const results = searchColleges(query, limit);
            return results || [];
        } catch (error) {
            console.log('College search error:', error);
            return [];
        }
    };

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

    // Validate current step before proceeding
    const validateStep = (currentStep) => {
        const newErrors = {};

        if (currentStep === 1) {
            // Required fields: name, age, DOB, mobile
            const nameError = validateName(formData.name);
            if (nameError) newErrors.name = nameError;

            // Validate age (must be number between 16-70)
            if (!formData.age || isNaN(formData.age) || formData.age < 16 || formData.age > 70) {
                newErrors.age = 'Please enter a valid age (16-70)';
            }

            // Validate DOB
            if (!formData.dob) {
                newErrors.dob = 'Date of birth is required';
            }

            // Validate Age and DOB consistency
            if (formData.age && formData.dob) {
                const ageDobError = validateAgeAndDOB(formData.age, formData.dob);
                if (ageDobError) {
                    newErrors.dob = ageDobError;
                }
            }

            // Validate mobile
            const mobileError = validateMobile(formData.mobile);
            if (mobileError) newErrors.mobile = mobileError;

            // Photo is OPTIONAL - no validation
        }

        if (currentStep === 2) {
            // Required: desiredRole and jobDomains only
            if (!formData.desiredRole && !otherValues.desiredRole) {
                newErrors.desiredRole = 'Desired role is required';
            }
            if (formData.jobDomains.length === 0) {
                newErrors.jobDomains = 'Please select at least 1 job domain';
            }

            // NEW: Validate years of experience if experienced is selected
            if (formData.experienceLevel === 'experienced') {
                if (!formData.yearsOfExperience || formData.yearsOfExperience === '') {
                    newErrors.yearsOfExperience = 'Years of experience is required for experienced candidates';
                } else if (formData.yearsOfExperience < 0 || formData.yearsOfExperience > 50) {
                    newErrors.yearsOfExperience = 'Please enter a valid number of years (0-50)';
                }
            }

            // profession, college, domain are OPTIONAL for onboarding
            // but will be required when applying for jobs
        }

        if (currentStep === 3) {
            // All fields are optional - only validate format if provided
            const linkedinError = validateLinkedIn(formData.linkedin);
            if (linkedinError) newErrors.linkedin = linkedinError;

            const githubError = validateGitHub(formData.github);
            if (githubError) newErrors.github = githubError;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (!validateStep(step)) {
            toast.error('Please fix the errors before proceeding');
            return;
        }
        if (step < 4) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        // Validate only strictly required fields (optional fields can be added when applying for jobs)
        if (!formData.name || !formData.age || !formData.mobile || !formData.desiredRole || formData.jobDomains.length === 0) {
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
                    yearsOfExperience: formData.experienceLevel === 'experienced'
                        ? parseInt(formData.yearsOfExperience)
                        : 0,
                    desiredRole: formData.desiredRole.trim(),
                    jobDomains: formData.jobDomains,
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
                    const resumeResponse = await api.post('/resumes/upload', resumeFormData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    console.log('Resume uploaded successfully');

                    // IMPORTANT: Store parsed resume data for interview use
                    if (resumeResponse.success && resumeResponse.data?.parsedData) {
                        const uploadedParsedData = resumeResponse.data.parsedData;
                        console.log('Parsed resume skills count:', uploadedParsedData.skills?.length || 0);
                        console.log('Parsed resume skills:', uploadedParsedData.skills);

                        // Store in state for interview component
                        setParsedResume({
                            skills: uploadedParsedData.skills || [],
                            experience: uploadedParsedData.experience || [],
                            education: uploadedParsedData.education || [],
                            projects: uploadedParsedData.projects || [],
                            skillCategories: uploadedParsedData.skillCategories || {},
                            summary: `${uploadedParsedData.skills?.join(', ') || 'No skills extracted'}`
                        });
                    }
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
                                className={`input ${errors.name ? 'input-error' : ''}`}
                                placeholder="Enter your full name"
                                required
                            />
                            {errors.name && <span className="error-message">{errors.name}</span>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Age *</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    className={`input ${errors.age ? 'input-error' : ''}`}
                                    placeholder="25"
                                    min="16"
                                    max="70"
                                    required
                                />
                                {errors.age && <span className="error-message">{errors.age}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date of Birth *</label>
                                <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    className={`input ${errors.dob ? 'input-error' : ''}`}
                                    max={new Date().toISOString().split('T')[0]}
                                    required
                                />
                                {errors.dob && <span className="error-message">{errors.dob}</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mobile Number *</label>
                            <input
                                type="tel"
                                name="mobile"
                                value={formData.mobile}
                                onChange={handleChange}
                                className={`input ${errors.mobile ? 'input-error' : ''}`}
                                placeholder="9876543210"
                                required
                            />
                            {errors.mobile && <span className="error-message">{errors.mobile}</span>}
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
                                        <span className="photo-icon">
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                                <circle cx="12" cy="13" r="4"></circle>
                                            </svg>
                                        </span>
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
                            <AutocompleteInput
                                name="profession"
                                label="Profession (Optional)"
                                value={formData.profession}
                                onChange={handleChange}
                                suggestions={PROFESSIONS}
                                placeholder="Start typing your profession..."
                                allowOther={true}
                                otherValue={otherValues.profession}
                                onOtherChange={(val) => setOtherValues(prev => ({ ...prev, profession: val }))}
                                error={errors.profession}
                            />
                        </div>

                        <div className="form-group">
                            <AutocompleteInput
                                name="college"
                                label="College/University (Optional)"
                                value={formData.college}
                                onChange={handleChange}
                                searchFunction={searchCollegeWrapper}
                                placeholder="Start typing your college name..."
                                allowOther={true}
                                otherValue={otherValues.college}
                                onOtherChange={(val) => setOtherValues(prev => ({ ...prev, college: val }))}
                                error={errors.college}
                            />
                        </div>

                        <div className="form-group">
                            <AutocompleteInput
                                name="domain"
                                label="Domain/Field of Study (Optional)"
                                value={formData.domain}
                                onChange={handleChange}
                                suggestions={DOMAINS}
                                placeholder="Start typing your field..."
                                allowOther={true}
                                otherValue={otherValues.domain}
                                onOtherChange={(val) => setOtherValues(prev => ({ ...prev, domain: val }))}
                                error={errors.domain}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Experience Level (Optional)</label>
                            <select
                                name="experienceLevel"
                                value={formData.experienceLevel}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="fresher">Fresher</option>
                                <option value="experienced">Experienced</option>
                            </select>
                        </div>

                        {/* Conditional Years of Experience Input */}
                        {formData.experienceLevel === 'experienced' && (
                            <div className="form-group">
                                <label className="form-label">
                                    Years of Experience in {formData.desiredRole || 'desired role'} *
                                </label>
                                <input
                                    type="number"
                                    name="yearsOfExperience"
                                    value={formData.yearsOfExperience}
                                    onChange={handleChange}
                                    className={`input ${errors.yearsOfExperience ? 'input-error' : ''}`}
                                    placeholder="e.g., 2"
                                    min="0"
                                    max="50"
                                    required
                                />
                                <span className="label-hint">
                                    Total years of professional experience specifically in this role
                                </span>
                                {errors.yearsOfExperience && <span className="error-message">{errors.yearsOfExperience}</span>}
                            </div>
                        )}

                        <div className="form-group">
                            <AutocompleteInput
                                name="desiredRole"
                                label="Desired Role"
                                value={formData.desiredRole}
                                onChange={handleChange}
                                suggestions={JOB_ROLES}
                                placeholder="Start typing your desired role..."
                                required
                                allowOther={true}
                                otherValue={otherValues.desiredRole}
                                onOtherChange={(val) => setOtherValues(prev => ({ ...prev, desiredRole: val }))}
                                error={errors.desiredRole}
                            />
                        </div>

                        {/* Job Domains Multi-Select */}
                        <div className="form-group">
                            <label className="form-label">
                                Job Domains You're Interested In *
                                <span className="label-hint">(Select up to 3)</span>
                            </label>
                            <div className="job-domains-grid">
                                {JOB_DOMAINS.map(domain => (
                                    <button
                                        key={domain.id}
                                        type="button"
                                        className={`job-domain-chip ${formData.jobDomains.includes(domain.id) ? 'selected' : ''} ${formData.jobDomains.length >= 3 && !formData.jobDomains.includes(domain.id) ? 'disabled' : ''}`}
                                        onClick={() => {
                                            if (formData.jobDomains.includes(domain.id)) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    jobDomains: prev.jobDomains.filter(d => d !== domain.id)
                                                }));
                                            } else if (formData.jobDomains.length < 3) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    jobDomains: [...prev.jobDomains, domain.id]
                                                }));
                                            }
                                        }}
                                        disabled={formData.jobDomains.length >= 3 && !formData.jobDomains.includes(domain.id)}
                                    >
                                        <span className="domain-icon">{domain.icon}</span>
                                        <span className="domain-name">{domain.name}</span>
                                        {formData.jobDomains.includes(domain.id) && (
                                            <span className="domain-check">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {formData.jobDomains.length > 0 && (
                                <div className="selected-domains-count">
                                    {formData.jobDomains.length}/3 selected
                                </div>
                            )}
                            {errors.jobDomains && <span className="error-message">{errors.jobDomains}</span>}
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

                        <label htmlFor="resume-upload" className="upload-area upload-area-clickable">
                            <input
                                type="file"
                                name="resume"
                                onChange={handleFileChange}
                                className="hidden-input"
                                accept=".pdf,.doc,.docx"
                                id="resume-upload"
                            />
                            <div className="upload-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M17 8L12 3L7 8" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 3V15" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3>Upload Your Resume</h3>
                            <p>PDF or DOCX format, max 5MB</p>

                            <span className="upload-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"></path>
                                    <path d="M17 8L12 3L7 8"></path>
                                    <path d="M12 3V15"></path>
                                </svg>
                                Choose File
                            </span>

                            {resumeFile && (
                                <div className="file-selected">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="16 10 10.5 15 8 12.5"></polyline>
                                    </svg>
                                    <span>{resumeFile.name}</span>
                                </div>
                            )}
                        </label>

                        <div className="info-box">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <div>
                                <strong>Important Note</strong>
                                <p>Only add skills in your resume that you truly know. During the interview, questions will be based on the skills mentioned in your resume.</p>
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
            {/* Step 0: Method Choice - Show if no method selected yet */}
            {!onboardingMethod && (
                <OnboardingMethodChoice
                    onSelect={handleMethodSelect}
                    onResumeUploadComplete={handleResumeUploadComplete}
                />
            )}

            {/* Regular onboarding - Show once method is selected (manual or resume with data) */}
            {onboardingMethod && (onboardingMethod === 'manual' || resumeAutoFillData) && (
                <>
                    <div className="onboarding-background">
                        <div className="gradient-orb orb-1"></div>
                        <div className="gradient-orb orb-2"></div>
                    </div>

                    {/* Hide onboarding form when interview or readiness is active */}
                    {/* Show pending review status instead of interview if blocked */}
                    {step === 4 && !interviewStatus.canTakeInterview && !interviewStatus.loading && (
                        <div className="onboarding-box" style={{ maxWidth: '600px' }}>
                            <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                                {interviewStatus.status === 'pending_review' && (
                                    <>
                                        <div style={{
                                            fontSize: '64px',
                                            marginBottom: '24px'
                                        }}>⏳</div>
                                        <h2 style={{
                                            color: '#1e293b',
                                            marginBottom: '16px',
                                            fontSize: '1.75rem'
                                        }}>Interview Under Review</h2>
                                        <p style={{
                                            color: '#64748b',
                                            marginBottom: '32px',
                                            fontSize: '1rem',
                                            lineHeight: '1.6'
                                        }}>
                                            {interviewStatus.message}
                                        </p>
                                        <div style={{
                                            background: '#f0f9ff',
                                            border: '1px solid #bae6fd',
                                            borderRadius: '12px',
                                            padding: '20px',
                                            marginBottom: '24px'
                                        }}>
                                            <p style={{ color: '#0369a1', margin: 0, fontWeight: 500 }}>
                                                📧 You'll receive an email notification once your interview has been reviewed.
                                            </p>
                                        </div>
                                        <button
                                            className="onboarding-btn"
                                            onClick={() => navigate('/jobseeker/home')}
                                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                                        >
                                            Go to Dashboard
                                        </button>
                                    </>
                                )}

                                {interviewStatus.status === 'rejected' && (
                                    <>
                                        <div style={{ fontSize: '64px', marginBottom: '24px' }}>📋</div>
                                        <h2 style={{ color: '#1e293b', marginBottom: '16px' }}>Interview Feedback</h2>
                                        <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
                                            {interviewStatus.message}
                                        </p>
                                        {interviewStatus.rejectionReason && (
                                            <div style={{
                                                background: '#fef3c7',
                                                border: '1px solid #fcd34d',
                                                borderRadius: '12px',
                                                padding: '16px',
                                                marginBottom: '24px',
                                                textAlign: 'left'
                                            }}>
                                                <strong style={{ color: '#92400e' }}>Feedback:</strong>
                                                <p style={{ color: '#78350f', margin: '8px 0 0' }}>{interviewStatus.rejectionReason}</p>
                                            </div>
                                        )}
                                        {interviewStatus.cooldownEndsAt && (
                                            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                                You can retake the interview after: <strong>{new Date(interviewStatus.cooldownEndsAt).toLocaleDateString()}</strong>
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Handle step 5 - Platform Walkthrough */}
                    {step === 5 && (
                        <PlatformWalkthrough />
                    )}

                    {!showInterview && !showInterviewReadiness && step !== 5 && (step !== 4 || interviewStatus.canTakeInterview || interviewStatus.loading) && (
                        <div className="onboarding-box">
                            {/* Left Panel - Purple Gradient */}
                            <div className="onboarding-sidebar">
                                <div className="sidebar-content">
                                    <h2>Welcome!</h2>
                                    <p>Complete your profile to unlock amazing job opportunities</p>

                                    {/* Step progress circles */}
                                    <div className="step-circles">
                                        {[1, 2, 3, 4].map((s) => (
                                            <div
                                                key={s}
                                                className={`step-circle ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}
                                            >
                                                {step > s ? (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                ) : s}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Step labels */}
                                    <div className="step-labels">
                                        <span className={step === 1 ? 'current' : ''}>Personal</span>
                                        <span className={step === 2 ? 'current' : ''}>Education</span>
                                        <span className={step === 3 ? 'current' : ''}>Experience</span>
                                        <span className={step === 4 ? 'current' : ''}>Preferences</span>
                                    </div>

                                    <div className="sidebar-icon">
                                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel - Form Content */}
                            <div className="onboarding-main">
                                <div className="onboarding-header">
                                    <div className="header-top">
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }}></div>
                                        </div>
                                        <p className="step-indicator">Step {step} of 4</p>
                                    </div>
                                </div>

                                <div className="onboarding-content">
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

                            // Only parse resume if not already parsed from upload
                            if (!parsedResume && resumeFile) {
                                console.log('No parsed resume, parsing now...');
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
                                }
                                setParsingResume(false);
                            }
                            setShowInterviewReadiness(true);
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

                    {/* Interview Readiness Check (Platform Interview) */}
                    {showInterviewReadiness && !showInterview && (
                        <div className="interview-readiness-wrapper">
                            <InterviewReadiness
                                inline={true}
                                customInterviewId="platform-interview"
                                onReady={(readinessData) => {
                                    // Store captured photo for identity verification
                                    setCapturedFacePhoto(readinessData.capturedPhoto);
                                    setInterviewReadinessComplete(true);
                                    setShowInterviewReadiness(false);
                                    setShowInterview(true);

                                    toast.success('Ready to start interview!');
                                }}
                                onCancel={() => {
                                    setShowInterviewReadiness(false);
                                    toast.info('Interview cancelled.');
                                    navigate('/jobseeker/home');
                                }}
                            />
                        </div>
                    )}

                    {/* Inline Interview */}
                    {showInterview && (
                        <OnboardingInterview
                            parsedResume={parsedResume}
                            userId={localStorage.getItem('userId')}
                            desiredRole={formData.desiredRole}
                            experienceLevel={formData.experienceLevel}
                            yearsOfExperience={formData.yearsOfExperience}
                            jobDomains={formData.jobDomains}
                            onComplete={(results) => {
                                toast.success(`Interview completed! Score: ${results?.score || 'N/A'}`);
                                // Instead of navigating to home, go to platform walkthrough (step 5)
                                setShowInterview(false);
                                setStep(5);
                            }}
                            onSkip={() => {
                                toast.info('Interview skipped. You can take it later.');
                                navigate('/jobseeker/home');
                            }}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default JobSeekerOnboarding;
