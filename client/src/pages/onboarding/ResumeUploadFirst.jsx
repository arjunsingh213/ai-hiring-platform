import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import './ResumeUploadFirst.css';

const ResumeUploadFirst = ({ onComplete, onSwitchToManual }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [parsedData, setParsedData] = useState(null);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const toast = useToast();

    const handleFileSelect = (selectedFile) => {
        setError(null);

        // Validate file type
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Please upload a PDF, DOC, or DOCX file');
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (selectedFile.size > maxSize) {
            setError('File size must be less than 5MB');
            return;
        }

        setFile(selectedFile);
        uploadResume(selectedFile);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const uploadResume = async (resumeFile) => {
        setUploading(true);
        setUploadProgress(0);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('resume', resumeFile);
            formData.append('userId', localStorage.getItem('userId'));

            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            const response = await api.post('/resumes/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.success && response.data) {
                // Extract the parsed data for auto-fill
                const resumeData = response.data.parsedResume || response.data.autoFillData;
                setParsedData(resumeData);
                toast.success('Resume parsed successfully!');
            } else {
                throw new Error('Failed to parse resume');
            }
        } catch (err) {
            console.error('Resume upload error:', err);
            setError(err.response?.data?.error || 'Failed to upload resume. Please try again.');
            toast.error('Failed to upload resume');
        } finally {
            setUploading(false);
        }
    };

    const handleContinue = () => {
        if (parsedData) {
            onComplete(parsedData);
        }
    };

    return (
        <div className="resume-upload-first-page">
            <div className="resume-upload-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
            </div>

            <div className="resume-upload-container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="upload-header"
                >
                    <h1>Upload Your Resume</h1>
                    <p>We'll automatically extract your information to save you time</p>
                </motion.div>

                {!parsedData && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className={`upload-zone ${isDragging ? 'dragging' : ''} ${error ? 'error' : ''}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => !uploading && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                            style={{ display: 'none' }}
                        />

                        {!uploading && !file && (
                            <>
                                <div className="upload-icon">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" />
                                        <path d="M17 8L12 3L7 8" />
                                        <path d="M12 3V15" />
                                    </svg>
                                </div>
                                <h3>Drag & drop your resume here</h3>
                                <p>or click to browse files</p>
                                <div className="file-info">
                                    <span>Supported formats: PDF, DOC, DOCX</span>
                                    <span>•</span>
                                    <span>Max size: 5MB</span>
                                </div>
                            </>
                        )}

                        {uploading && (
                            <div className="uploading-state">
                                <div className="upload-spinner"></div>
                                <h3>Parsing your resume...</h3>
                                <p>Extracting your information</p>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                                <span className="progress-text">{uploadProgress}%</span>
                            </div>
                        )}
                    </motion.div>
                )}

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="error-message"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8V12" />
                                <path d="M12 16H12.01" />
                            </svg>
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {parsedData && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="preview-card"
                        >
                            <div className="preview-header">
                                <div className="success-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" />
                                        <path d="M22 4L12 14.01L9 11.01" />
                                    </svg>
                                </div>
                                <div>
                                    <h3>Resume Parsed Successfully!</h3>
                                    <p>Here's what we found:</p>
                                </div>
                            </div>

                            <div className="extracted-info">
                                {parsedData.name && (
                                    <div className="info-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        <span>Name: {parsedData.name}</span>
                                    </div>
                                )}
                                {parsedData.email && (
                                    <div className="info-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" />
                                            <path d="M22 6L12 13L2 6" />
                                        </svg>
                                        <span>Email: {parsedData.email}</span>
                                    </div>
                                )}
                                {parsedData.phone && (
                                    <div className="info-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 16.92V19.92C22 20.49 21.54 20.99 20.97 21C9.44 21.49 2.51 14.56 3 3.03C3.01 2.46 3.51 2 4.08 2H7.08C7.65 2 8.13 2.47 8.14 3.04C8.23 5.18 8.67 7.25 9.45 9.17C9.6 9.54 9.48 9.97 9.18 10.25L7.59 11.84C9.18 15.14 11.86 17.82 15.16 19.41L16.75 17.82C17.03 17.52 17.46 17.4 17.83 17.55C19.75 18.33 21.82 18.77 23.96 18.86C24.53 18.87 25 19.35 25 19.92Z" />
                                        </svg>
                                        <span>Phone: {parsedData.phone}</span>
                                    </div>
                                )}
                                {parsedData.skills && parsedData.skills.length > 0 && (
                                    <div className="info-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" />
                                            <path d="M22 4L12 14.01L9 11.01" />
                                        </svg>
                                        <span>Skills: {parsedData.skills.slice(0, 5).join(', ')}{parsedData.skills.length > 5 ? '...' : ''}</span>
                                    </div>
                                )}
                                {parsedData.experience && parsedData.experience.length > 0 && (
                                    <div className="info-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="7" width="20" height="14" rx="2" />
                                            <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" />
                                        </svg>
                                        <span>Experience: {parsedData.experience.length} position(s)</span>
                                    </div>
                                )}
                                {parsedData.education && parsedData.education.length > 0 && (
                                    <div className="info-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 10V15C22 16 21 17 20 17H4C3 17 2 16 2 15V10" />
                                            <path d="M12 3L2 8L12 13L22 8L12 3Z" />
                                            <path d="M6 12V17" />
                                        </svg>
                                        <span>Education: {parsedData.education[0]?.degree || 'Found'}</span>
                                    </div>
                                )}
                            </div>

                            <div className="preview-actions">
                                <button className="btn-continue" onClick={handleContinue}>
                                    Continue with this Information
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12H19M19 12L12 5M19 12L12 19" />
                                    </svg>
                                </button>
                                <button
                                    className="btn-reupload"
                                    onClick={() => {
                                        setParsedData(null);
                                        setFile(null);
                                    }}
                                >
                                    Upload Different Resume
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="switch-to-manual"
                    onClick={onSwitchToManual}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" />
                    </svg>
                    Switch to Manual Entry
                </motion.button>
            </div>
        </div>
    );
};

export default ResumeUploadFirst;
