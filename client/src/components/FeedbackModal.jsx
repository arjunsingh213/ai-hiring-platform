import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import './FeedbackModal.css';

const FEATURE_CONFIG = {
    'onboarding': {
        title: 'How was your onboarding?',
        description: 'We want to make the start of your journey seamless.',
        questions: [
            { id: 'accuracy', label: 'How accurate were the AI questions?', type: 'rating' },
            { id: 'clarity', label: 'Were the instructions clear?', type: 'rating' },
            { id: 'proctoring', label: 'Was the camera proctoring comfortable?', type: 'rating' },
            { id: 'voice', label: 'Did the voice/speech feature work well?', type: 'rating' },
            { id: 'value', label: 'Did it help you understand your skills?', type: 'rating' }
        ],
        insights: ['Fast & smooth', 'Clear instructions', 'Sleek design', 'A bit lengthy', 'Technical issues'],
        insightQuestion: 'What stood out to you?'
    },
    'domain-interview': {
        title: 'How was the technical interview?',
        description: 'Your feedback helps us refine our AI domain models.',
        questions: [
            { id: 'relevance', label: 'Were the questions relevant to your domain?', type: 'rating' },
            { id: 'difficulty', label: 'Was the difficulty level appropriate?', type: 'rating' },
            { id: 'coding', label: 'Was the coding IDE easy to use?', type: 'rating' },
            { id: 'timing', label: 'Did you have enough time per question?', type: 'rating' },
            { id: 'feedback', label: 'Is the AI evaluation helpful?', type: 'rating' }
        ],
        insights: ['Relatable questions', 'Good difficulty', 'Fair evaluation', 'Too hard', 'Too easy'],
        insightQuestion: 'What can we improve?'
    },
    'atp': {
        title: 'AI Talent Passport Feedback',
        description: 'How do you like your verified credentials?',
        questions: [
            { id: 'accuracy', label: 'Does the skill profile represent you accurately?', type: 'rating' },
            { id: 'design', label: 'Is the passport layout professional?', type: 'rating' },
            { id: 'insights', label: 'Are the career insights actionable?', type: 'rating' },
            { id: 'sharing', label: 'Would you share this with employers?', type: 'rating' },
            { id: 'clarity', label: 'Are the metrics easy to understand?', type: 'rating' }
        ],
        insights: ['Comprehensive', 'Looks professional', 'Shareable', 'Needs more detail', 'Data accuracy'],
        insightQuestion: 'Did this represent you well?'
    },
    'recruiter-dashboard': {
        title: 'Recruiter Dashboard Feedback',
        description: 'How is your hiring overview helping you?',
        questions: [
            { id: 'visibility', label: 'Is the hiring data clearly visible?', type: 'rating' },
            { id: 'navigation', label: 'Is it easy to navigate between jobs?', type: 'rating' },
            { id: 'metrics', label: 'Are the applicant metrics useful?', type: 'rating' },
            { id: 'updates', label: 'Are notification updates timely?', type: 'rating' },
            { id: 'utility', label: 'Does it improve your hiring efficiency?', type: 'rating' }
        ],
        insights: ['Clear metrics', 'Easy navigation', 'Great overview', 'Missing data', 'Slow loading'],
        insightQuestion: 'What stood out in the dashboard?'
    },
    'job-post': {
        title: 'Job Posting Experience',
        description: 'Help us make job creation faster and better.',
        questions: [
            { id: 'simplicity', label: 'Was the posting process simple?', type: 'rating' },
            { id: 'ai-help', label: 'Was AI helpful in generating descriptions?', type: 'rating' },
            { id: 'formatting', label: 'Are the formatting tools easy to use?', type: 'rating' },
            { id: 'preview', label: 'Is the job preview accurate?', type: 'rating' },
            { id: 'speed', label: 'How would you rate the posting speed?', type: 'rating' }
        ],
        insights: ['Fast creation', 'AI help was great', 'Clear steps', 'Too many fields', 'Confusing layout'],
        insightQuestion: 'How can we improve job posting?'
    },
    'talent-pipeline': {
        title: 'Talent Pipeline Feedback',
        description: 'How was your experience reviewing applicants?',
        questions: [
            { id: 'screening', label: 'Are the AI screening scores accurate?', type: 'rating' },
            { id: 'filters', label: 'Are the filtering options effective?', type: 'rating' },
            { id: 'communication', label: 'Is it easy to message candidates?', type: 'rating' },
            { id: 'profile-view', label: 'Is the candidate profile view clear?', type: 'rating' },
            { id: 'workflow', label: 'Does the pipeline stage system work well?', type: 'rating' }
        ],
        insights: ['Good filters', 'Accurate scores', 'Clear profiles', 'Hard to message', 'Cluttered view'],
        insightQuestion: 'What influenced your review process?'
    },
    'hiring-pipeline': {
        title: 'Onboarding & Management',
        description: 'Feedback on managing hired candidates.',
        questions: [
            { id: 'tracking', label: 'Is it easy to track onboarding progress?', type: 'rating' },
            { id: 'documents', label: 'Is document management efficient?', type: 'rating' },
            { id: 'integration', label: 'Does it integrate well with your tools?', type: 'rating' },
            { id: 'collaboration', label: 'Is team collaboration effective?', type: 'rating' },
            { id: 'satisfaction', label: 'Overall satisfaction with management tools?', type: 'rating' }
        ],
        insights: ['Smooth onboarding', 'Good doc tools', 'Team friendly', 'Needs more sync', 'A bit complex'],
        insightQuestion: 'What can we refine here?'
    },
    'home': {
        title: 'Home Feed Experience',
        description: 'How is the community hub working for you?',
        questions: [
            { id: 'relevance', label: 'Are the posts relevant to you?', type: 'rating' },
            { id: 'engagement', label: 'Is it easy to interact with posts?', type: 'rating' },
            { id: 'variety', label: 'Is there a good variety of content?', type: 'rating' },
            { id: 'discovery', label: 'Did you discover useful opportunities/info?', type: 'rating' },
            { id: 'design', label: 'Is the feed layout clean and readable?', type: 'rating' }
        ],
        insights: ['High quality content', 'Active community', 'Easy to use', 'Too much noise', 'Needs more variety'],
        insightQuestion: 'What stood out in your feed today?'
    }
};

const FeedbackModal = ({
    featureId,
    onClose,
    userId,
    isOpen = true
}) => {
    const config = FEATURE_CONFIG[featureId] || FEATURE_CONFIG['onboarding'];
    const [step, setStep] = useState(0); // 0 to n-1 are questions, n is insights, n+1 is comment
    const [responses, setResponses] = useState({});
    const [selectedInsights, setSelectedInsights] = useState([]);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const questions = config.questions || [];
    const totalSteps = questions.length + 2; // Questions + Insights + Comment

    const handleRating = (questionId, val) => {
        setResponses(prev => ({ ...prev, [questionId]: val }));
        // Automatically move to next step after a short delay
        setTimeout(() => setStep(prev => prev + 1), 300);
    };

    const toggleInsight = (insight) => {
        if (selectedInsights.includes(insight)) {
            setSelectedInsights(selectedInsights.filter(i => i !== insight));
        } else {
            setSelectedInsights([...selectedInsights, insight]);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await api.post('/feedback', {
                featureId,
                responses,
                insights: selectedInsights,
                comment
            });
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2500);
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const renderProgressDots = () => (
        <div className="feedback-steps">
            {[...Array(totalSteps)].map((_, i) => (
                <div
                    key={i}
                    className={`feedback-step-dot ${step >= i ? 'active' : ''}`}
                    onClick={() => i < step && setStep(i)}
                    style={{ cursor: i < step ? 'pointer' : 'default' }}
                />
            ))}
        </div>
    );

    return (
        <div className="feedback-modal-overlay">
            <motion.div
                className="feedback-modal"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
                <button className="feedback-modal-close" onClick={onClose}>×</button>

                {!success ? (
                    <div className="feedback-modal-content">
                        <div className="feedback-header">
                            <h2>{config.title}</h2>
                            <p>{config.description}</p>
                        </div>

                        {renderProgressDots()}

                        <AnimatePresence mode="wait">
                            {step < questions.length ? (
                                <motion.div
                                    key={`q-${step}`}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="feedback-question-container"
                                >
                                    <label className="feedback-question-title">{questions[step].label}</label>
                                    <div className="feedback-rating-scale">
                                        {[1, 2, 3, 4, 5].map((val) => (
                                            <button
                                                key={val}
                                                className={`rating-btn ${responses[questions[step].id] === val ? 'active' : ''}`}
                                                onClick={() => handleRating(questions[step].id, val)}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="rating-labels">
                                        <span>Not satisfied</span>
                                        <span>Extremely satisfied</span>
                                    </div>
                                    {step > 0 && (
                                        <div className="feedback-footer">
                                            <button className="feedback-prev-btn" onClick={() => setStep(step - 1)}>Back</button>
                                        </div>
                                    )}
                                </motion.div>
                            ) : step === questions.length ? (
                                <motion.div
                                    key="insights"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="feedback-question-container"
                                >
                                    <label className="feedback-question-title">{config.insightQuestion}</label>
                                    <div className="feedback-insights-grid">
                                        {config.insights.map((insight) => (
                                            <button
                                                key={insight}
                                                className={`insight-chip ${selectedInsights.includes(insight) ? 'active' : ''}`}
                                                onClick={() => toggleInsight(insight)}
                                            >
                                                {insight}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="feedback-footer">
                                        <button className="feedback-prev-btn" onClick={() => setStep(step - 1)}>Back</button>
                                        <button className="feedback-next-btn" onClick={() => setStep(step + 1)}>Next</button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="comment"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="feedback-question-container"
                                >
                                    <label className="feedback-question-title">Anything else you'd like to add?</label>
                                    <textarea
                                        className="feedback-comment-area"
                                        placeholder="Optional: Tell us more about your experience..."
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                    />
                                    <div className="feedback-footer">
                                        <button className="feedback-prev-btn" onClick={() => setStep(step - 1)}>Back</button>
                                        <button
                                            className="feedback-submit-btn"
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                        >
                                            {submitting ? 'Sending...' : 'Submit Feedback'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="feedback-success">
                        <span className="success-icon">✨</span>
                        <h3>Thank you for your feedback!</h3>
                        <p>We've recorded your insights. This helps us build a better platform for everyone.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default FeedbackModal;
