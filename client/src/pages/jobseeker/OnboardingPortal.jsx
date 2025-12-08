import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import ProgressBar from '../../components/ProgressBar';
import StatusBadge from '../../components/StatusBadge';
import StageTimeline from '../../components/StageTimeline';
import './OnboardingPortal.css';

const OnboardingPortal = () => {
    const { hiringId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const fileInputRef = useRef(null);

    const [hiringProcess, setHiringProcess] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        fetchData();
    }, [hiringId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [hpResponse, docsResponse] = await Promise.all([
                api.get(`/hiring/${hiringId}`),
                api.get(`/hiring/${hiringId}/documents`)
            ]);

            setHiringProcess(hpResponse.data);
            setDocuments(docsResponse.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load onboarding data');
        } finally {
            setLoading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0] && selectedDoc) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0] && selectedDoc) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (file) => {
        // Validate file
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('File size must be less than 5MB');
            return;
        }

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only PDF, JPG, PNG, DOC, and DOCX files are allowed');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('documentId', selectedDoc._id);

            await api.post(`/hiring/${hiringId}/documents/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Document uploaded successfully!');
            fetchData();
            setSelectedDoc(null);
        } catch (error) {
            console.error('Error uploading document:', error);
            toast.error(error.error || 'Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (docId) => {
        try {
            await api.delete(`/hiring/${hiringId}/documents/${docId}`);
            toast.success('Document deleted');
            fetchData();
        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error('Failed to delete document');
        }
    };

    const getDaysUntilStart = () => {
        if (!hiringProcess?.offer?.startDate) return null;
        const days = Math.ceil((new Date(hiringProcess.offer.startDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (days < 0) return 'Started';
        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        return `${days} days`;
    };

    const getDocumentIcon = (type) => {
        const icons = {
            id_proof: '🪪',
            education_certificate: '🎓',
            employment_letter: '💼',
            address_proof: '🏠',
            bank_details: '🏦',
            emergency_contact: '📞',
            background_check_consent: '✅',
            nda_signed: '📝',
            tax_form: '📋',
            other: '📄'
        };
        return icons[type] || '📄';
    };

    if (loading) {
        return (
            <div className="onboarding-portal loading-state">
                <div className="loading-spinner-large"></div>
                <p>Loading onboarding portal...</p>
            </div>
        );
    }

    if (!hiringProcess) {
        return (
            <div className="onboarding-portal empty-state">
                <h2>Onboarding process not found</h2>
                <button className="btn btn-primary" onClick={() => navigate('/jobseeker/jobs')}>
                    Browse Jobs
                </button>
            </div>
        );
    }

    const pendingDocs = documents.filter(d => d.status === 'pending' || d.status === 'rejected');
    const uploadedDocs = documents.filter(d => d.status === 'uploaded' || d.status === 'verified');
    const daysUntilStart = getDaysUntilStart();

    return (
        <div className="onboarding-portal">
            {/* Header */}
            <div className="portal-header card-glass">
                <div className="header-content">
                    <div>
                        <h1>Welcome to Your Onboarding! 🎉</h1>
                        <p className="position-title">{hiringProcess.offer?.position}</p>
                        {daysUntilStart && (
                            <p className="start-date">
                                Start Date: {new Date(hiringProcess.offer.startDate).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })} ({daysUntilStart})
                            </p>
                        )}
                    </div>
                    <div className="progress-circle">
                        <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="8"
                                strokeDasharray={`${(hiringProcess.progress?.overallProgress || 0) * 2.83} 283`}
                                strokeLinecap="round"
                                transform="rotate(-90 50 50)"
                            />
                        </svg>
                        <div className="progress-text">
                            <span className="progress-value">{hiringProcess.progress?.overallProgress || 0}%</span>
                            <span className="progress-label">Complete</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stage Timeline */}
            <div className="timeline-section card">
                <h2>Your Progress</h2>
                <StageTimeline currentStage={hiringProcess.currentStage} />
            </div>

            {/* Current Stage Info */}
            <div className="current-stage card">
                <div className="stage-header">
                    <h2>Current Stage</h2>
                    <StatusBadge status={hiringProcess.currentStage} size="lg" />
                </div>
                <p className="stage-description">
                    {hiringProcess.currentStage === 'documents_pending' &&
                        'Please upload all required documents to proceed with your onboarding.'}
                    {hiringProcess.currentStage === 'documents_complete' &&
                        'All documents verified! Your onboarding is almost complete.'}
                    {hiringProcess.currentStage === 'offer_accepted' &&
                        'Offer accepted! Please upload your documents to continue.'}
                </p>
            </div>

            {/* Documents Section */}
            <div className="documents-section card">
                <div className="section-header">
                    <h2>📄 Required Documents</h2>
                    <span className="doc-count">
                        {uploadedDocs.length} of {documents.length} uploaded
                    </span>
                </div>

                <ProgressBar
                    progress={(uploadedDocs.length / documents.length) * 100}
                    color="success"
                    showPercentage={true}
                    height="md"
                    label="Document Completion"
                />

                {/* Document List */}
                <div className="documents-list">
                    {documents.map((doc) => (
                        <div key={doc._id} className={`document-card ${selectedDoc?._id === doc._id ? 'selected' : ''}`}>
                            <div className="doc-icon">{getDocumentIcon(doc.type)}</div>
                            <div className="doc-info">
                                <h4>{doc.name}</h4>
                                <p className="doc-description">{doc.description}</p>
                                {doc.fileName && (
                                    <p className="doc-filename">📎 {doc.fileName}</p>
                                )}
                                {doc.status === 'rejected' && doc.rejectionReason && (
                                    <p className="rejection-reason">❌ {doc.rejectionReason}</p>
                                )}
                            </div>
                            <div className="doc-actions">
                                <StatusBadge status={doc.status} />
                                {doc.status === 'pending' || doc.status === 'rejected' ? (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            setSelectedDoc(doc);
                                            fileInputRef.current?.click();
                                        }}
                                    >
                                        {doc.status === 'rejected' ? 'Reupload' : 'Upload'}
                                    </button>
                                ) : doc.status === 'uploaded' ? (
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleDeleteDocument(doc._id)}
                                    >
                                        Delete
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    style={{ display: 'none' }}
                />

                {/* Drag & Drop Zone (shown when document selected) */}
                {selectedDoc && (
                    <div
                        className={`drop-zone ${dragActive ? 'active' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploading ? (
                            <div className="uploading-state">
                                <div className="loading-spinner"></div>
                                <p>Uploading {selectedDoc.name}...</p>
                            </div>
                        ) : (
                            <>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" />
                                    <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 3V15" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                <h3>Upload {selectedDoc.name}</h3>
                                <p>Drag & drop your file here or click to browse</p>
                                <p className="file-info">PDF, JPG, PNG, DOC, DOCX (Max 5MB)</p>
                                <button className="btn btn-secondary" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDoc(null);
                                }}>
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Help Section */}
            <div className="help-section card-glass">
                <h3>💡 Need Help?</h3>
                <p>If you have any questions about the onboarding process or need assistance with document uploads, please contact your recruiter.</p>
                <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/jobseeker/messages')}
                >
                    Contact Recruiter
                </button>
            </div>
        </div>
    );
};

export default OnboardingPortal;
