import React, { useState, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import './ResumeOnboarding.css';

const ResumeOnboarding = ({ onComplete }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [parseStage, setParseStage] = useState(''); // '', 'uploading', 'parsing', 'saving', 'done'
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const toast = useToast();

    const handleFileSelect = (selectedFile) => {
        setError(null);

        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Please upload a PDF, DOC, or DOCX file');
            return;
        }

        const maxSize = 5 * 1024 * 1024;
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
        if (droppedFile) handleFileSelect(droppedFile);
    };

    const uploadResume = async (resumeFile) => {
        setUploading(true);
        setUploadProgress(0);
        setParseStage('uploading');
        setError(null);

        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 40) {
                    setParseStage('parsing');
                }
                if (prev >= 75) {
                    setParseStage('saving');
                }
                if (prev >= 95) {
                    clearInterval(progressInterval);
                    return 95;
                }
                return prev + 3;
            });
        }, 300);

        try {
            const formData = new FormData();
            formData.append('resume', resumeFile);
            formData.append('userId', localStorage.getItem('userId'));

            const response = await api.post('/resume/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            clearInterval(progressInterval);
            setUploadProgress(100);
            setParseStage('done');

            if (response.success && response.data) {
                toast.success('Resume uploaded & profile created!');
                // Small delay so user sees the success state
                setTimeout(() => {
                    onComplete();
                }, 800);
            } else {
                throw new Error('Failed to parse resume');
            }
        } catch (err) {
            clearInterval(progressInterval);
            console.error('Resume upload error:', err);
            setError(err.response?.data?.error || 'Failed to upload resume. Please try again.');
            setUploading(false);
            setUploadProgress(0);
            setParseStage('');
            setFile(null);
            toast.error('Upload failed. Please try again.');
        }
    };

    const getStageText = () => {
        switch (parseStage) {
            case 'uploading': return 'Uploading your resume...';
            case 'parsing': return 'AI is extracting your skills & experience...';
            case 'saving': return 'Setting up your profile...';
            case 'done': return 'All done! Entering the platform...';
            default: return 'Processing...';
        }
    };

    return (
        <div className="resume-onboarding">
            <div className="resume-onboarding-bg">
                <div className="ro-orb ro-orb-1"></div>
                <div className="ro-orb ro-orb-2"></div>
                <div className="ro-orb ro-orb-3"></div>
            </div>

            <div className="resume-onboarding-card">
                {/* Header */}
                <div className="ro-header">
                    <div className="ro-logo">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
                            <path d="M14 2V8H20" />
                            <path d="M16 13H8" />
                            <path d="M16 17H8" />
                            <path d="M10 9H8" />
                        </svg>
                    </div>
                    <h1>Upload Your Resume</h1>
                    <p>We'll extract your skills, experience, and education to build your profile automatically.</p>
                </div>

                {/* Upload Area */}
                {!uploading && !file && (
                    <div
                        className={`ro-dropzone ${isDragging ? 'ro-dragging' : ''} ${error ? 'ro-error-zone' : ''}`}
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                            style={{ display: 'none' }}
                        />

                        <div className="ro-upload-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" />
                                <path d="M17 8L12 3L7 8" />
                                <path d="M12 3V15" />
                            </svg>
                        </div>

                        <h3>Drag & drop your resume here</h3>
                        <p className="ro-or">or click to browse</p>

                        <div className="ro-file-types">
                            <span className="ro-type-badge">PDF</span>
                            <span className="ro-type-badge">DOC</span>
                            <span className="ro-type-badge">DOCX</span>
                            <span className="ro-size-limit">Max 5MB</span>
                        </div>
                    </div>
                )}

                {/* Uploading / Processing State */}
                {uploading && (
                    <div className="ro-processing">
                        <div className="ro-processing-icon">
                            {parseStage === 'done' ? (
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2">
                                    <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" />
                                    <path d="M22 4L12 14.01L9 11.01" />
                                </svg>
                            ) : (
                                <div className="ro-spinner"></div>
                            )}
                        </div>
                        <h3>{getStageText()}</h3>
                        <p className="ro-filename">{file?.name}</p>

                        <div className="ro-progress-track">
                            <div className="ro-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                        </div>

                        {/* Stage indicators */}
                        <div className="ro-stages">
                            <div className={`ro-stage ${uploadProgress >= 10 ? 'active' : ''} ${uploadProgress >= 40 ? 'done' : ''}`}>
                                <div className="ro-stage-dot"></div>
                                <span>Upload</span>
                            </div>
                            <div className={`ro-stage ${uploadProgress >= 40 ? 'active' : ''} ${uploadProgress >= 75 ? 'done' : ''}`}>
                                <div className="ro-stage-dot"></div>
                                <span>AI Parse</span>
                            </div>
                            <div className={`ro-stage ${uploadProgress >= 75 ? 'active' : ''} ${uploadProgress >= 100 ? 'done' : ''}`}>
                                <div className="ro-stage-dot"></div>
                                <span>Profile</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="ro-error">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8V12" />
                            <path d="M12 16H12.01" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {/* Footer note */}
                <div className="ro-footer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" />
                    </svg>
                    <span>Your data is encrypted and secure. We only extract professional information.</span>
                </div>
            </div>
        </div>
    );
};

export default ResumeOnboarding;
