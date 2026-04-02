import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import OnboardingInterview from './OnboardingInterview';
import InterviewReadiness from '../interview/InterviewReadiness';
import './Onboarding.css';
import PlatformWalkthrough from './PlatformWalkthrough';
import ResumeOnboarding from './ResumeOnboarding';

const JobSeekerOnboarding = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const toast = useToast();

    // State
    const [resumeUploaded, setResumeUploaded] = useState(false);
    const [loading, setLoading] = useState(true);

    // Interview state (for direct interview access via URL)
    const [showInterview, setShowInterview] = useState(false);
    const [showInterviewReadiness, setShowInterviewReadiness] = useState(false);
    const [capturedFacePhoto, setCapturedFacePhoto] = useState(null);
    const [parsedResume, setParsedResume] = useState(null);
    const [formData, setFormData] = useState({
        desiredRole: '',
        experienceLevel: 'fresher',
        yearsOfExperience: '',
        jobDomains: [],
        skills: []
    });
    const [interviewStatus, setInterviewStatus] = useState({
        loading: true,
        canTakeInterview: false,
        status: 'none',
        message: '',
        rejectionReason: null,
        cooldownEndsAt: null
    });
    const [showWalkthrough, setShowWalkthrough] = useState(false);

    // Force light theme on onboarding page
    // No theme override — inherit platform's dark theme

    // Handle OAuth redirect - extract token and userId from URL
    useEffect(() => {
        const tokenFromUrl = searchParams.get('token');
        const userIdFromUrl = searchParams.get('userId');

        if (tokenFromUrl) {
            localStorage.setItem('token', tokenFromUrl);
        }
        if (userIdFromUrl) {
            localStorage.setItem('userId', userIdFromUrl);
        }
        if (tokenFromUrl || userIdFromUrl) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);
        }
    }, [searchParams]);

    // Check if user already completed onboarding (has a resume uploaded)
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                const response = await api.get(`/users/${userId}`);
                const user = response.data || response;

                if (user.isOnboardingComplete) {
                    // Already completed - redirect to platform
                    navigate('/jobseeker/jobs', { replace: true });
                    return;
                }

                // If user has a resume uploaded but onboarding isn't marked complete,
                // mark it complete and redirect
                if (user.resume) {
                    setResumeUploaded(true);
                    navigate('/jobseeker/jobs', { replace: true });
                    return;
                }
            } catch (err) {
                console.error('Failed to check onboarding status:', err);
            }
            setLoading(false);
        };

        // Check if this is a direct interview access
        const stepParam = searchParams.get('step');
        if (stepParam === 'interview') {
            handleDirectInterviewAccess();
        } else {
            checkOnboardingStatus();
        }
    }, []);

    // Handle direct interview access (existing flow for platform interview)
    const handleDirectInterviewAccess = async () => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            toast.warning('Please complete your profile first');
            setLoading(false);
            return;
        }

        try {
            const userResponse = await api.get(`/users/${userId}`);
            const userData = userResponse.data || userResponse;

            // ── Profile completeness gate ──
            // Block interview if mandatory fields are missing
            const missing = [];
            if (!userData.profile?.name) missing.push('Full Name');
            if (!userData.profile?.mobile) missing.push('Phone Number');
            if (!userData.profile?.dob) missing.push('Date of Birth');
            if (!userData.profile?.photo) missing.push('Profile Photo');
            if (!userData.resume) missing.push('Resume');
            if (!userData.jobSeekerProfile?.desiredRole) missing.push('Desired Role');
            if (!userData.jobSeekerProfile?.jobDomains || userData.jobSeekerProfile.jobDomains.length === 0) missing.push('Job Domains');

            if (missing.length > 0) {
                toast.warning(`Please complete your profile first: ${missing.join(', ')}`);
                navigate('/jobseeker/profile', { replace: true });
                return;
            }

            if (userData.jobSeekerProfile) {
                const profile = userData.jobSeekerProfile;
                setFormData(prev => ({
                    ...prev,
                    domain: profile.domain || '',
                    desiredRole: profile.desiredRole || '',
                    experienceLevel: profile.experienceLevel || 'fresher',
                    skills: profile.skills || [],
                    jobDomains: profile.jobDomains || []
                }));

                if (profile.parsedResume) {
                    setParsedResume(profile.parsedResume);
                } else if ((profile.skills && profile.skills.length > 0) || userData.resume) {
                    setParsedResume({
                        skills: profile.skills || [],
                        experience: profile.experience || [],
                        education: profile.education || [],
                        summary: 'Profile-based entry'
                    });

                    if (userData.resume) {
                        try {
                            const resumeResponse = await api.get(`/resume/${userData.resume}`);
                            if (resumeResponse.success && resumeResponse.data?.parsedData) {
                                setParsedResume(resumeResponse.data.parsedData);
                            }
                        } catch (err) {
                            console.warn('Failed to fetch resume details:', err);
                        }
                    }
                } else {
                    toast.warning('Please upload your resume first');
                    setLoading(false);
                    return;
                }
            } else {
                toast.warning('Please upload your resume first');
                setLoading(false);
                return;
            }

            // Check interview status
            const statusResponse = await api.get(`/onboarding-interview/check-status/${userId}`);
            if (statusResponse.success) {
                const data = statusResponse.data || {};
                const status = data.status || 'none';
                const canRetry = data.canRetry || false;

                const canTakeInterview =
                    status === 'pending' ||
                    status === 'in_progress' ||
                    status === 'none' ||
                    ((status === 'failed' || status === 'rejected' || status === 'cheating') && canRetry);

                setInterviewStatus({
                    loading: false,
                    canTakeInterview,
                    status,
                    score: data.score,
                    message: data.statusMessage || statusResponse.message || '',
                    rejectionReason: data.rejectionReason || statusResponse.rejectionReason || null,
                    cooldownEndsAt: data.retryAfter || statusResponse.cooldownEndsAt || null
                });

                if (canTakeInterview) {
                    setShowInterviewReadiness(true);
                }
            }
        } catch (error) {
            console.error('Failed to check interview status:', error);
            setInterviewStatus(prev => ({ ...prev, loading: false, canTakeInterview: true }));
            setShowInterviewReadiness(true);
        }
        setLoading(false);
    };

    // Handle successful resume upload
    const handleResumeComplete = () => {
        setResumeUploaded(true);
        // The server already set isOnboardingComplete=true and populated profile
        // Store user role and redirect
        localStorage.setItem('userRole', 'jobseeker');
        toast.success('Welcome! Your profile has been set up from your resume.');
        navigate('/jobseeker/jobs', { replace: true });
    };

    // Loading state
    if (loading) {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                height: '100vh', background: '#f8fafc'
            }}>
                <div className="spinner" style={{
                    width: '40px', height: '40px',
                    border: '4px solid #e2e8f0', borderTopColor: '#6366f1',
                    borderRadius: '50%', animation: 'spin 1s linear infinite'
                }}></div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // Direct interview access
    const stepParam = searchParams.get('step');
    if (stepParam === 'interview') {
        return (
            <div className="onboarding">
                <div className="onboarding-background">
                    <div className="gradient-orb orb-1"></div>
                    <div className="gradient-orb orb-2"></div>
                </div>

                {/* Interview status screens */}
                {!interviewStatus.canTakeInterview && !interviewStatus.loading && (
                    <div className="onboarding-box" style={{ maxWidth: '600px' }}>
                        <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                            {interviewStatus.status === 'pending_review' && (
                                <>
                                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>⏳</div>
                                    <h2 style={{ color: '#1e293b', marginBottom: '16px', fontSize: '1.75rem' }}>Interview Under Review</h2>
                                    <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '1rem', lineHeight: '1.6' }}>{interviewStatus.message}</p>
                                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                                        <p style={{ color: '#0369a1', margin: 0, fontWeight: 500 }}>📧 You'll receive an email notification once your interview has been reviewed.</p>
                                    </div>
                                    <button className="onboarding-btn" onClick={() => navigate('/jobseeker/jobs')} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>Go to Dashboard</button>
                                </>
                            )}
                            {interviewStatus.status === 'rejected' && (
                                <>
                                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>📋</div>
                                    <h2 style={{ color: '#1e293b', marginBottom: '16px' }}>Interview Feedback</h2>
                                    <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>{interviewStatus.message}</p>
                                    {interviewStatus.rejectionReason && (
                                        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
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
                            {interviewStatus.status === 'passed' && (
                                <>
                                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
                                    <h2 style={{ color: '#1e293b', marginBottom: '16px' }}>Interview Passed!</h2>
                                    <p style={{ color: '#64748b', marginBottom: '32px', lineHeight: '1.6' }}>Congratulations! You have successfully passed the platform interview. You can now apply for jobs.</p>
                                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
                                        <div style={{ fontSize: '32px', color: '#059669', fontWeight: 'bold', marginBottom: '8px' }}>{interviewStatus.score || 77}/100</div>
                                        <div style={{ color: '#059669', fontSize: '0.9rem', fontWeight: 500 }}>STRONG MATCH</div>
                                    </div>
                                    <button className="onboarding-btn" onClick={() => navigate('/jobseeker/jobs')} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>Go to Dashboard</button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Interview Readiness */}
                {showInterviewReadiness && !showInterview && (
                    <div className="interview-readiness-wrapper">
                        <InterviewReadiness
                            inline={true}
                            customInterviewId="platform-interview"
                            onReady={(readinessData) => {
                                setCapturedFacePhoto(readinessData.capturedPhoto);
                                setShowInterviewReadiness(false);
                                setShowInterview(true);
                                toast.success('Ready to start interview!');
                            }}
                            onCancel={() => {
                                setShowInterviewReadiness(false);
                                toast.info('Interview cancelled.');
                                navigate('/jobseeker/jobs');
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
                            setShowInterview(false);
                            setShowWalkthrough(true);
                        }}
                        onSkip={() => {
                            toast.info('Interview skipped. You can take it later.');
                            navigate('/jobseeker/jobs');
                        }}
                    />
                )}

                {/* Walkthrough */}
                {showWalkthrough && <PlatformWalkthrough />}
            </div>
        );
    }

    // Default: Resume upload screen (the only onboarding step for new users)
    return <ResumeOnboarding onComplete={handleResumeComplete} />;
};

export default JobSeekerOnboarding;
