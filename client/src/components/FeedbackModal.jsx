import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import './FeedbackModal.css';

const FEATURE_CONFIG = {
    'onboarding': {
        title: 'How was your onboarding?',
        description: 'We want to make the start of your journey seamless.',
        ratingLabel: 'Overall Experience',
        insights: ['Fast & smooth', 'Clear instructions', 'Sleek design', 'A bit lengthy', 'Technical issues'],
        insightQuestion: 'What stood out to you?'
    },
    'domain-interview': {
        title: 'How was the technical interview?',
        description: 'Your feedback helps us refine our AI domain models.',
        ratingLabel: 'Question Accuracy',
        insights: ['Relatable questions', 'Good difficulty', 'Fair evaluation', 'Too hard', 'Too easy'],
        insightQuestion: 'What can we improve?'
    },
    'atp': {
        title: 'AI Talent Passport Feedback',
        description: 'How do you like your verified credentials?',
        ratingLabel: 'Professionalism & Clarity',
        insights: ['Comprehensive', 'Looks professional', 'Shareable', 'Needs more detail', 'Data accuracy'],
        insightQuestion: 'Did this represent you well?'
    },
    'job-post': {
        title: 'Job Posting Experience',
        description: 'Help us improve the hiring flow for recruiters.',
        ratingLabel: 'Ease of Posting',
        insights: ['Fast creation', 'AI suggestions helpful', 'Clean interface', 'Too many fields', 'Confusing steps'],
        insightQuestion: 'What was your favorite part?'
    },
    'recruiter-dashboard': {
        title: 'Dashboard Feedback',
        description: 'How is your recruitment overview?',
        ratingLabel: 'Informative & Actionable',
        insights: ['Great metrics', 'Easy navigation', 'Clear pipeline', 'Slow loading', 'Needs more filters'],
        insightQuestion: 'Help us improve your workflow'
    }
};

const FeedbackModal = ({
    featureId,
    onClose,
    userId,
    isOpen = true
}) => {
    const config = FEATURE_CONFIG[featureId] || FEATURE_CONFIG['onboarding'];
    const [step, setStep] = useState(1);
    const [rating, setRating] = useState(0);
    const [selectedInsights, setSelectedInsights] = useState([]);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleRating = (val) => {
        setRating(val);
        // Automatically move to step 2 after rating
        setTimeout(() => setStep(2), 300);
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
                rating,
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

                        <div className="feedback-steps">
                            <div className={`feedback-step-dot ${step >= 1 ? 'active' : ''}`} />
                            <div className={`feedback-step-dot ${step >= 2 ? 'active' : ''}`} />
                            <div className={`feedback-step-dot ${step >= 3 ? 'active' : ''}`} />
                        </div>

                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="feedback-question-container"
                                >
                                    <label className="feedback-question-title">{config.ratingLabel}</label>
                                    <div className="feedback-rating-scale">
                                        {[1, 2, 3, 4, 5].map((val) => (
                                            <button
                                                key={val}
                                                className={`rating-btn ${rating === val ? 'active' : ''}`}
                                                onClick={() => handleRating(val)}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="rating-labels">
                                        <span>Not satisfied</span>
                                        <span>Extremely satisfied</span>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
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
                                        <button className="feedback-prev-btn" onClick={() => setStep(1)}>Back</button>
                                        <button className="feedback-next-btn" onClick={() => setStep(3)}>Next</button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
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
                                        <button className="feedback-prev-btn" onClick={() => setStep(2)}>Back</button>
                                        <button
                                            className="feedback-submit-btn"
                                            onClick={handleSubmit}
                                            disabled={submitting || rating === 0}
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
