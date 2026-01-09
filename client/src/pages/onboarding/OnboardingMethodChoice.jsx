import React from 'react';
import { motion } from 'framer-motion';
import './OnboardingMethodChoice.css';

const OnboardingMethodChoice = ({ onSelect }) => {
    return (
        <div className="method-choice-page">
            <div className="method-choice-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
            </div>

            <div className="method-choice-container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="method-choice-header"
                >
                    <h1>Welcome! Let's build your profile</h1>
                    <p>Choose how you'd like to get started</p>
                </motion.div>

                <div className="choice-cards">
                    {/* Resume Auto-fill Option */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="choice-card recommended"
                        onClick={() => onSelect('resume')}
                        whileHover={{ scale: 1.03, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="recommended-badge">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                            </svg>
                            <span>Recommended</span>
                        </div>

                        <div className="card-icon-wrapper resume-icon">
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

                        <div className="card-benefits">
                            <div className="benefit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Save time - 2 minutes vs 10 minutes</span>
                            </div>
                            <div className="benefit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>More accurate information</span>
                            </div>
                        </div>

                        <button className="select-button primary">
                            Get Started with Resume
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12H19M19 12L12 5M19 12L12 19" />
                            </svg>
                        </button>
                    </motion.div>

                    {/* Manual Entry Option */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="choice-card"
                        onClick={() => onSelect('manual')}
                        whileHover={{ scale: 1.03, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="card-icon-wrapper manual-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V19C19 19.5304 18.7893 20.0391 18.4142 20.4142C18.0391 20.7893 17.5304 21 17 21H7C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17Z" />
                                <path d="M9 7H15" />
                                <path d="M9 11H15" />
                                <path d="M9 15H12" />
                            </svg>
                        </div>

                        <h3>Fill Manually</h3>
                        <p>Enter your information step by step through our guided form</p>

                        <div className="card-benefits">
                            <div className="benefit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Full control over your data</span>
                            </div>
                            <div className="benefit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>No resume needed</span>
                            </div>
                        </div>

                        <button className="select-button secondary">
                            Fill Manually
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12H19M19 12L12 5M19 12L12 19" />
                            </svg>
                        </button>
                    </motion.div>
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="privacy-note"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" />
                    </svg>
                    Your data is secure and encrypted
                </motion.p>
            </div>
        </div>
    );
};

export default OnboardingMethodChoice;
