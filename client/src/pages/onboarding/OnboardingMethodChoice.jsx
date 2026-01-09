import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import './OnboardingMethodChoice.css';

const OnboardingMethodChoice = ({ onSelect, onResumeUploadComplete }) => {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    const toast = useToast();

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) {
            toast.error('Please upload a PDF, DOC, or DOCX file');
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('File size must be less than 5MB');
            return;
        }

        setUploading(true);
        setUploadProgress(30);

        try {
            const formData = new FormData();
            formData.append('resume', file);
            formData.append('userId', localStorage.getItem('userId'));

            setUploadProgress(50);

            const response = await api.post('/resumes/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setUploadProgress(100);

            if (response.success && response.data) {
                // Backend returns: { success: true, data: resumeDocument }
                // resumeDocument has: { parsedData, aiAnalysis, ... }
                const resumeDocument = response.data;
                const parsedData = resumeDocument.parsedData || {};

                console.log('Resume uploaded, parsed data:', parsedData);
                toast.success('Resume uploaded successfully!');

                // Call the callback with parsed data immediately
                onResumeUploadComplete(parsedData);
            } else {
                throw new Error('Failed to parse resume');
            }
        } catch (err) {
            console.error('Resume upload error:', err);
            toast.error('Failed to upload resume. Please try again.');
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="onboarding">
            <div className="onboarding-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
            </div>

            <div className="onboarding-box">
                {/* Left Sidebar - Purple Gradient */}
                <div className="onboarding-sidebar">
                    <div className="sidebar-content">
                        <h2>Welcome!</h2>
                        <p>Choose how you'd like to get started</p>

                        <div className="sidebar-icon">
                            👤
                        </div>
                    </div>
                </div>

                {/* Right Main Content */}
                <div className="onboarding-main">
                    <div className="onboarding-content">
                        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.5rem' }}>
                            How would you like to complete your profile?
                        </h1>
                        <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.9375rem' }}>
                            Choose the option that works best for you
                        </p>

                        <div className="method-options">
                            {/* Option 1: Upload Resume */}
                            <motion.div
                                className="method-card recommended-card"
                                whileHover={{ scale: uploading ? 1 : 1.02 }}
                                whileTap={{ scale: uploading ? 1 : 0.98 }}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />

                                <div className="recommended-badge">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                    </svg>
                                    Recommended
                                </div>

                                <div className="method-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
                                        <path d="M14 2V8H20" />
                                        <path d="M16 13H8" />
                                        <path d="M16 17H8" />
                                        <path d="M10 9H8" />
                                    </svg>
                                </div>

                                <h3>Auto-fill with Resume</h3>
                                <p>Upload your resume and we'll automatically fill in your details</p>

                                <ul className="benefits-list">
                                    <li>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Save time - 2 minutes vs 10 minutes
                                    </li>
                                    <li>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        More accurate information
                                    </li>
                                </ul>

                                {!uploading ? (
                                    <button className="method-button primary-button" onClick={handleUploadClick}>
                                        Upload Resume
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" />
                                            <path d="M17 8L12 3L7 8" />
                                            <path d="M12 3V15" />
                                        </svg>
                                    </button>
                                ) : (
                                    <div className="uploading-state">
                                        <div className="upload-spinner"></div>
                                        <p style={{ fontSize: '0.875rem', color: '#6366F1', margin: '0.5rem 0' }}>
                                            Uploading... {uploadProgress}%
                                        </p>
                                        <div className="progress-bar-small">
                                            <div className="progress-fill-small" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            {/* Option 2: Fill Manually */}
                            <motion.div
                                className="method-card"
                                onClick={() => !uploading && onSelect('manual')}
                                whileHover={{ scale: uploading ? 1 : 1.02 }}
                                whileTap={{ scale: uploading ? 1 : 0.98 }}
                                style={{ opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto' }}
                            >
                                <div className="method-icon secondary">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 3C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V19C19 19.5304 18.7893 20.0391 18.4142 20.4142C18.0391 20.7893 17.5304 21 17 21H7C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17Z" />
                                        <path d="M9 7H15" />
                                        <path d="M9 11H15" />
                                        <path d="M9 15H12" />
                                    </svg>
                                </div>

                                <h3>Fill Manually</h3>
                                <p>Enter your information step by step through our guided form</p>

                                <ul className="benefits-list">
                                    <li>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Full control over your data
                                    </li>
                                    <li>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        No resume needed
                                    </li>
                                </ul>

                                <button className="method-button secondary-button">
                                    Fill Manually
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12H19M19 12L12 5M19 12L12 19" />
                                    </svg>
                                </button>
                            </motion.div>
                        </div>

                        <p className="privacy-note">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" />
                            </svg>
                            Your data is secure and encrypted
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingMethodChoice;
