import React from 'react';
import { motion } from 'framer-motion';
import './OnboardingMethodChoice.css';

const OnboardingMethodChoice = ({ onSelect }) => {
    return (
        <div className="onboarding">
            <div className="onboarding-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
            </div>

            <div className="onboarding-box">
                {/* Left Panel - Purple Gradient (matching existing design) */}
                <div className="onboarding-sidebar">
                    <div className="sidebar-content">
                        <h2>Welcome!</h2>
                        <p>Choose how you'd like to get started</p>

                        {/* User icon */}
                        <div className="user-icon-large">
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.2)" />
                                <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Right Panel - White Content Area */}
                <div className="onboarding-form">
                    <div className="form-header">
                        <h1>How would you like to complete your profile?</h1>
                        <p>Choose the option that works best for you</p>
                    </div>

                    <div className="method-options">
                        {/* Option 1: Auto-fill with Resume */}
                        <motion.div
                            className="method-card recommended-card"
                            onClick={() => onSelect('resume')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
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

                            <button className="method-button primary-button">
                                Get Started with Resume
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12H19M19 12L12 5M19 12L12 19" />
                                </svg>
                            </button>
                        </motion.div>

                        {/* Option 2: Fill Manually */}
                        <motion.div
                            className="method-card"
                            onClick={() => onSelect('manual')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
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
    );
};

export default OnboardingMethodChoice;
