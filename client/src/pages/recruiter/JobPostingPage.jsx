import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import InterviewPipelineConfig from '../../components/InterviewPipelineConfig';
import FeedbackModal from '../../components/FeedbackModal';
import './JobPostingPage.css';

const JobPostingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();

    // Check if we're in edit mode
    const editMode = location.state?.editMode || false;
    const existingJob = location.state?.jobData || null;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        skills: '',
        minExperience: '',
        maxExperience: '',
        education: '',
        type: 'full-time',
        location: '',
        remote: false,
        salaryMin: '',
        salaryMax: '',
        currency: 'USD'
    });
    const [loading, setLoading] = useState(false);

    // Two-step flow: Show pipeline config modal after job creation
    const [showPipelineModal, setShowPipelineModal] = useState(false);
    const [createdJobId, setCreatedJobId] = useState(null);
    const [savingPipeline, setSavingPipeline] = useState(false);
    const [modalStep, setModalStep] = useState(1); // 1: Config, 2: Overview
    const [showFeedback, setShowFeedback] = useState(false);

    // Interview Pipeline Configuration
    const [interviewPipeline, setInterviewPipeline] = useState({
        pipelineType: 'standard_4round',
        rounds: [],
        settings: {
            requirePlatformInterview: false,
            autoRejectBelowScore: null,
            autoAdvanceAboveScore: 70,
            allowReschedule: true,
            maxAttempts: 1,
            expiryDays: 7
        }
    });

    // Get user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user._id || localStorage.getItem('userId');

    // Pre-fill form when editing
    useEffect(() => {
        if (editMode && existingJob) {
            setFormData({
                title: existingJob.title || '',
                description: existingJob.description || '',
                skills: existingJob.requirements?.skills?.join(', ') || '',
                minExperience: existingJob.requirements?.minExperience?.toString() || '',
                maxExperience: existingJob.requirements?.maxExperience?.toString() || '',
                education: existingJob.requirements?.education?.[0] || '',
                type: existingJob.jobDetails?.type || 'full-time',
                location: existingJob.jobDetails?.location || '',
                remote: existingJob.jobDetails?.remote || false,
                salaryMin: existingJob.jobDetails?.salary?.min?.toString() || '',
                salaryMax: existingJob.jobDetails?.salary?.max?.toString() || '',
                currency: existingJob.jobDetails?.salary?.currency || 'USD'
            });

            // Pre-fill interview pipeline if exists
            if (existingJob.interviewPipeline) {
                setInterviewPipeline(existingJob.interviewPipeline);
            }
        }
    }, [editMode, existingJob]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Step 1: Submit job details (without pipeline)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const jobData = {
                recruiterId: userId,
                title: formData.title,
                description: formData.description,
                requirements: {
                    skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
                    minExperience: parseInt(formData.minExperience) || 0,
                    maxExperience: parseInt(formData.maxExperience) || 10,
                    education: [formData.education].filter(e => e)
                },
                jobDetails: {
                    type: formData.type,
                    location: formData.location,
                    remote: formData.remote,
                    salary: {
                        min: parseInt(formData.salaryMin) || 0,
                        max: parseInt(formData.salaryMax) || 0,
                        currency: formData.currency,
                        period: 'yearly'
                    }
                },
                status: 'active'
            };

            if (editMode && existingJob) {
                // UPDATE existing job - include pipeline since we're editing
                jobData.interviewPipeline = interviewPipeline;
                await api.put(`/jobs/${existingJob._id}`, jobData);
                toast.success('Job updated successfully! ✅');
                setTimeout(() => navigate('/recruiter/my-jobs'), 1500);
            } else {
                // CREATE new job - then show pipeline modal
                const response = await api.post('/jobs', jobData);
                const createdJob = response.data || response.job;

                if (createdJob && createdJob._id) {
                    setCreatedJobId(createdJob._id);
                    toast.success('Job created! Now configure the interview process.');
                    setShowPipelineModal(true);
                } else {
                    toast.success('Job posted successfully! 🎉');
                    setTimeout(() => navigate('/recruiter/my-jobs'), 1500);
                }
            }
        } catch (error) {
            console.error('Error saving job:', error);
            toast.error('Failed to post job. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Save pipeline configuration
    const handleSavePipeline = async () => {
        if (modalStep === 1) {
            setModalStep(2);
            return;
        }

        if (!createdJobId) return;

        setSavingPipeline(true);
        try {
            await api.put(`/jobs/${createdJobId}`, {
                interviewPipeline: interviewPipeline
            });
            toast.success('Job published successfully! 🎉');
            setShowPipelineModal(false);

            // Trigger feedback for job post
            const feedbackShown = localStorage.getItem(`feedback_jobpost_${userId}`);
            if (!feedbackShown) {
                setShowFeedback(true);
            } else {
                setTimeout(() => navigate('/recruiter/my-jobs'), 1000);
            }
        } catch (error) {
            console.error('Error saving pipeline:', error);
            toast.error('Failed to save pipeline. Please try again.');
        } finally {
            setSavingPipeline(false);
        }
    };

    // Skip pipeline configuration
    const handleSkipPipeline = () => {
        toast.info('You can configure the interview pipeline later from My Jobs.');
        setShowPipelineModal(false);

        // Trigger feedback for job post even if skipped
        const feedbackShown = localStorage.getItem(`feedback_jobpost_${userId}`);
        if (!feedbackShown) {
            setShowFeedback(true);
        } else {
            navigate('/recruiter/my-jobs');
        }
    };

    return (
        <div className="job-posting-page">
            <div className="page-header">
                <h1>{editMode ? '✏️ Edit Job' : 'Post a New Job'}</h1>
                <p className="text-muted">
                    {editMode ? 'Update the job details below' : 'Fill in the details to create a job posting'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="job-form card">
                <section className="form-section">
                    <h3>Job Details</h3>

                    <div className="form-group">
                        <label className="form-label">Job Title *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="input"
                            placeholder="e.g. Senior Software Engineer"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Job Description *</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="input"
                            rows="8"
                            placeholder="Describe the role, responsibilities, and what you're looking for..."
                            required
                        />
                        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 'var(--spacing-sm)' }}>
                            💡 Tip: Our AI will format and enhance your job description
                        </p>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Job Type *</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                <option value="full-time">Full Time</option>
                                <option value="part-time">Part Time</option>
                                <option value="contract">Contract</option>
                                <option value="internship">Internship</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Location *</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g. San Francisco, CA"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="remote"
                                checked={formData.remote}
                                onChange={handleChange}
                            />
                            <span>Remote work available</span>
                        </label>
                    </div>
                </section>

                <section className="form-section">
                    <h3>Requirements</h3>

                    <div className="form-group">
                        <label className="form-label">Required Skills *</label>
                        <input
                            type="text"
                            name="skills"
                            value={formData.skills}
                            onChange={handleChange}
                            className="input"
                            placeholder="e.g. React, Node.js, MongoDB (comma separated)"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Min Experience (years)</label>
                            <input
                                type="number"
                                name="minExperience"
                                value={formData.minExperience}
                                onChange={handleChange}
                                className="input"
                                placeholder="0"
                                min="0"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Max Experience (years)</label>
                            <input
                                type="number"
                                name="maxExperience"
                                value={formData.maxExperience}
                                onChange={handleChange}
                                className="input"
                                placeholder="10"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Education</label>
                        <input
                            type="text"
                            name="education"
                            value={formData.education}
                            onChange={handleChange}
                            className="input"
                            placeholder="e.g. Bachelor's in Computer Science"
                        />
                    </div>
                </section>

                <section className="form-section">
                    <h3>Compensation</h3>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Min Salary</label>
                            <input
                                type="number"
                                name="salaryMin"
                                value={formData.salaryMin}
                                onChange={handleChange}
                                className="input"
                                placeholder="50000"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Max Salary</label>
                            <input
                                type="number"
                                name="salaryMax"
                                value={formData.salaryMax}
                                onChange={handleChange}
                                className="input"
                                placeholder="100000"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Currency</label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="INR">INR</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Show inline pipeline config only in edit mode */}
                {editMode && existingJob && (
                    <section className="form-section">
                        <InterviewPipelineConfig
                            value={interviewPipeline}
                            onChange={setInterviewPipeline}
                            jobSkills={formData.skills.split(',').map(s => s.trim()).filter(s => s)}
                        />
                    </section>
                )}

                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/recruiter/my-jobs')}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading
                            ? (editMode ? 'Updating...' : 'Creating Job...')
                            : (editMode ? 'Update Job' : 'Next: Configure Interview')
                        }
                        {!loading && !editMode && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px' }}>
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        )}
                    </button>
                </div>
            </form>

            {/* Pipeline Configuration Modal - Step 2 */}
            {showPipelineModal && (
                <div className="pipeline-modal-overlay">
                    <div className="pipeline-modal">
                        <div className="pipeline-modal-header">
                            <h2>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <circle cx="12" cy="12" r="6" />
                                    <circle cx="12" cy="12" r="2" />
                                </svg>
                                Configure Interview Pipeline
                            </h2>
                            <p>Set up how candidates will be evaluated for this position</p>
                        </div>

                        <div className="pipeline-modal-body">
                            {modalStep === 1 ? (
                                <InterviewPipelineConfig
                                    value={interviewPipeline}
                                    onChange={setInterviewPipeline}
                                    jobSkills={formData.skills.split(',').map(s => s.trim()).filter(s => s)}
                                />
                            ) : (
                                <div className="job-overview-section">
                                    <div className="overview-header">
                                        <h3>Review Job Posting</h3>
                                        <p>Check all details before publishing this job to the platform.</p>
                                    </div>

                                    <div className="overview-grid">
                                        <div className="overview-card">
                                            <h4>General Info</h4>
                                            <div className="overview-item">
                                                <label>Title:</label>
                                                <span>{formData.title}</span>
                                            </div>
                                            <div className="overview-item">
                                                <label>Type:</label>
                                                <span className="capitalize">{formData.type}</span>
                                            </div>
                                            <div className="overview-item">
                                                <label>Location:</label>
                                                <span>{formData.location} {formData.remote && '(Remote)'}</span>
                                            </div>
                                        </div>

                                        <div className="overview-card">
                                            <h4>Requirements</h4>
                                            <div className="overview-item">
                                                <label>Skills:</label>
                                                <span>{formData.skills}</span>
                                            </div>
                                            <div className="overview-item">
                                                <label>Experience:</label>
                                                <span>{formData.minExperience || 0} - {formData.maxExperience || 10} years</span>
                                            </div>
                                        </div>

                                        <div className="overview-card full-width">
                                            <h4>Interview Journey</h4>
                                            <div className="pipeline-mini-preview">
                                                {interviewPipeline.rounds.map((round, idx) => (
                                                    <div key={idx} className="mini-round">
                                                        <span className="round-idx">{idx + 1}</span>
                                                        <div className="round-details">
                                                            <div className="round-top">
                                                                <span className="round-name">{round.title}</span>
                                                                <span className={`round-badge ${round.type === 'AI' ? 'ai' : 'human'}`}>
                                                                    {round.type === 'AI' ? 'AI' : 'Human'}
                                                                </span>
                                                            </div>
                                                            <div className="round-meta">{round.duration} min • {round.roundType}</div>
                                                        </div>
                                                        {idx < interviewPipeline.rounds.length - 1 && <div className="mini-connector" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pipeline-modal-footer">
                            <div className="footer-left">
                                {modalStep === 2 && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => setModalStep(1)}
                                    >
                                        Back to Edit
                                    </button>
                                )}
                            </div>
                            <div className="footer-right">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={handleSkipPipeline}
                                    style={{ marginRight: 'var(--spacing-md)' }}
                                >
                                    Skip for Now
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSavePipeline}
                                    disabled={savingPipeline}
                                >
                                    {savingPipeline ? 'Publishing...' : (
                                        <>
                                            {modalStep === 1 ? (
                                                <>
                                                    Next: Review & Overview
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px' }}>
                                                        <line x1="5" y1="12" x2="19" y2="12" />
                                                        <polyline points="12 5 19 12 12 19" />
                                                    </svg>
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    Confirm & Publish Job
                                                </>
                                            )}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showFeedback && (
                <FeedbackModal
                    featureId="job-post"
                    onClose={() => {
                        setShowFeedback(false);
                        localStorage.setItem(`feedback_jobpost_${userId}`, 'true');
                        navigate('/recruiter/my-jobs');
                    }}
                    userId={userId}
                />
            )}
        </div>
    );
};

export default JobPostingPage;
