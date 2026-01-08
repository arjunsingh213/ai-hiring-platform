import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './TermsModal.css';

const TermsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="terms-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="terms-modal-content"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="terms-header">
                        <h2>Terms & Conditions</h2>
                        <button className="terms-close-btn" onClick={onClose} aria-label="Close">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="terms-body">
                        <p className="terms-effective-date">Last Updated: January 8, 2026</p>

                        <section className="terms-section">
                            <h3>1. Acceptance of Terms</h3>
                            <p>
                                By accessing or using the AI Hiring Platform (the "Platform"), you agree to be bound by these Terms and Conditions.
                                If you do not agree to these terms, please do not use the Platform.
                            </p>
                        </section>

                        <section className="terms-section">
                            <h3>2. Platform Description</h3>
                            <p>
                                The AI Hiring Platform is an innovative recruitment solution that connects job seekers with recruiters using
                                artificial intelligence-powered interviews, automated resume parsing, and intelligent candidate matching.
                            </p>
                            <p>Our Platform provides:</p>
                            <ul>
                                <li>AI-powered video interviews with automated evaluation</li>
                                <li>Resume parsing and talent passport generation</li>
                                <li>Job posting and candidate management for recruiters</li>
                                <li>Proctoring and integrity monitoring during interviews</li>
                                <li>Administrative oversight and review tools</li>
                            </ul>
                        </section>

                        <section className="terms-section">
                            <h3>3. User Accounts & Registration</h3>
                            <p>
                                <strong>3.1 Account Creation:</strong> You must provide accurate, current, and complete information during registration.
                                You are responsible for maintaining the confidentiality of your account credentials.
                            </p>
                            <p>
                                <strong>3.2 Account Types:</strong> The Platform supports three user types: Job Seekers, Recruiters, and Administrators.
                                Each account type has specific features and responsibilities.
                            </p>
                            <p>
                                <strong>3.3 Account Security:</strong> You are solely responsible for all activities that occur under your account.
                                Notify us immediately of any unauthorized access.
                            </p>
                        </section>

                        <section className="terms-section">
                            <h3>4. AI Interview Services</h3>
                            <p>
                                <strong>4.1 Interview Process:</strong> Our AI-powered interview system evaluates candidates based on their responses,
                                experience, and qualifications. Interviews are adaptive and role-specific.
                            </p>
                            <p>
                                <strong>4.2 Video Recording:</strong> All interviews are recorded for evaluation, quality assurance, and dispute resolution.
                                By participating in an interview, you consent to being recorded.
                            </p>
                            <p>
                                <strong>4.3 AI Evaluation:</strong> Interview responses are analyzed by our AI system using natural language processing
                                and machine learning algorithms. Evaluations are forwarded to recruiters for final decision-making.
                            </p>
                            <p>
                                <strong>4.4 Interview Integrity:</strong> Candidates must complete interviews independently without external assistance.
                                Any detected cheating or fraudulent behavior may result in immediate disqualification and account termination.
                            </p>
                        </section>

                        <section className="terms-section">
                            <h3>5. Proctoring & Monitoring</h3>
                            <p>
                                <strong>5.1 Camera Monitoring:</strong> During interviews, your camera feed is monitored to ensure interview integrity.
                                The system detects face presence, multiple faces, and suspicious behavior.
                            </p>
                            <p>
                                <strong>5.2 Activity Tracking:</strong> We monitor tab switches, window focus changes, copy-paste attempts,
                                and other browser activities during interviews.
                            </p>
                            <p>
                                <strong>5.3 Violation Logging:</strong> Suspicious activities are logged with timestamps and flagged for administrative review.
                                Violations do not automatically fail candidates but are reviewed by administrators.
                            </p>
                            <p>
                                <strong>5.4 Admin Review:</strong> Administrators may review interview recordings and proctoring logs to make final
                                determinations about interview validity.
                            </p>
                        </section>

                        <section className="terms-section">
                            <h3>6. Data Collection & Privacy</h3>
                            <p>
                                <strong>6.1 Personal Information:</strong> We collect name, email, phone number, location, education, experience,
                                and other professional information you provide.
                            </p>
                            <p>
                                <strong>6.2 Resume Data:</strong> Uploaded resumes are parsed using AI to extract skills, experience, projects,
                                and qualifications for your talent passport.
                            </p>
                            <p>
                                <strong>6.3 Interview Data:</strong> We collect and store interview recordings, responses, AI evaluations,
                                proctoring logs, and performance metrics.
                            </p>
                            <p>
                                <strong>6.4 Usage Data:</strong> We collect information about how you use the Platform, including pages visited,
                                features used, and interaction patterns.
                            </p>
                            <p>
                                <strong>6.5 Data Security:</strong> We implement industry-standard security measures to protect your data.
                                However, no method of transmission over the internet is 100% secure.
                            </p>
                            <p>
                                <strong>6.6 Data Retention:</strong> Your data is retained for as long as your account is active and for a
                                reasonable period thereafter for legal compliance and business purposes.
                            </p>
                        </section>

                        <section className="terms-section">
                            <h3>7. User Responsibilities</h3>
                            <p>You agree to:</p>
                            <ul>
                                <li>Provide truthful and accurate information</li>
                                <li>Complete interviews independently without external help</li>
                                <li>Maintain a professional environment during video interviews</li>
                                <li>Not share, sell, or distribute Platform content</li>
                                <li>Not attempt to circumvent proctoring or security measures</li>
                                <li>Not use the Platform for any illegal or unauthorized purpose</li>
                                <li>Comply with all applicable laws and regulations</li>
                            </ul>
                        </section>

                        <section className="terms-section">
                            <h3>8. Intellectual Property</h3>
                            <p>
                                <strong>8.1 Platform Ownership:</strong> The Platform, including all software, AI models, algorithms, designs,
                                and content, is owned by us and protected by intellectual property laws.
                            </p>
                            <p>
                                <strong>8.2 User Content:</strong> You retain ownership of content you submit (resumes, responses, etc.) but
                                grant us a license to use, process, and store it for Platform operation.
                            </p>
                            <p>
                                <strong>8.3 Talent Passport:</strong> Your generated talent passport remains your property, but we may use
                                anonymized data for improving our AI models.
                            </p>
                        </section>

                        <section className="terms-section">
                            <h3>9. Prohibited Activities</h3>
                            <p>You may not:</p>
                            <ul>
                                <li>Create multiple accounts to manipulate the system</li>
                                <li>Use automated tools, bots, or scripts to interact with the Platform</li>
                                <li>Reverse engineer, decompile, or attempt to extract source code</li>
                                <li>Violate interview integrity through cheating or fraud</li>
                                <li>Harass, abuse, or harm other users</li>
                                <li>Upload malicious code, viruses, or harmful content</li>
                                <li>Scrape, data mine, or extract Platform data</li>
                            </ul>
                        </section>

                        <section className="terms-section">
                            <h3>10. Disclaimer & Limitation of Liability</h3>
                            <p>
                                <strong>10.1 "As Is" Service:</strong> The Platform is provided "as is" without warranties of any kind,
                                express or implied, including accuracy, reliability, or fitness for a particular purpose.
                            </p>
                            <p>
                                <strong>10.2 AI Limitations:</strong> While our AI strives for accuracy, we do not guarantee perfect
                                evaluations. Human review is recommended for final hiring decisions.
                            </p>
                            <p>
                                <strong>10.3 No Employment Guarantee:</strong> Use of the Platform does not guarantee job placement,
                                interview invitations, or employment outcomes.
                            </p>
                            <p>
                                <strong>10.4 Liability Limitation:</strong> To the maximum extent permitted by law, we shall not be liable
                                for any indirect, incidental, special, or consequential damages arising from Platform use.
                            </p>
                        </section>

                        <section className="terms-section">
                            <h3>11. Account Termination</h3>
                            <p>
                                <strong>11.1 By User:</strong> You may delete your account at any time through account settings.
                                Some data may be retained for legal compliance.
                            </p>
                            <p>
                                <strong>11.2 By Us:</strong> We reserve the right to suspend or terminate accounts that violate these Terms,
                                engage in fraudulent behavior, or pose security risks.
                            </p>
                            <p>
                                <strong>11.3 Effect of Termination:</strong> Upon termination, your access to the Platform will cease.
                                We may retain certain data as required by law.
                            </p>
                        </section>

                        <section className="terms-section">
                            <h3>12. Changes to Terms</h3>
                            <p>
                                We reserve the right to modify these Terms at any time. Users will be notified of significant changes
                                via email or Platform notification. Continued use after changes constitutes acceptance of the new Terms.
                            </p>
                        </section>

                        <section className="terms-section">
                            <h3>13. Governing Law</h3>
                            <p>
                                These Terms shall be governed by and construed in accordance with applicable laws.
                                Any disputes shall be resolved through binding arbitration or in courts of competent jurisdiction.
                            </p>
                        </section>

                        <section className="terms-section">
                            <h3>14. Contact Information</h3>
                            <p>
                                For questions about these Terms, please contact us at:<br />
                                Email: legal@aihiring.com<br />
                                Support: support@aihiring.com
                            </p>
                        </section>

                        <div className="terms-acknowledgment">
                            <p>
                                By using the AI Hiring Platform, you acknowledge that you have read, understood, and agree to be bound by
                                these Terms and Conditions.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="terms-footer">
                        <button className="btn btn-primary" onClick={onClose}>
                            I Understand
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TermsModal;
