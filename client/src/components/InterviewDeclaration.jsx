import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './InterviewDeclaration.css';

const InterviewDeclaration = ({ isOpen, onAccept, onDecline }) => {
    const [allChecked, setAllChecked] = useState(false);
    const [declarations, setDeclarations] = useState({
        identity: false,
        proctoring: false,
        recording: false,
        noHelp: false,
        authenticity: false
    });

    const handleCheckChange = (key) => {
        const newDeclarations = {
            ...declarations,
            [key]: !declarations[key]
        };
        setDeclarations(newDeclarations);

        // Check if all are checked
        const allAgreed = Object.values(newDeclarations).every(val => val === true);
        setAllChecked(allAgreed);
    };

    const handleAccept = () => {
        if (allChecked) {
            onAccept(declarations);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="declaration-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="declaration-content"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", duration: 0.5 }}
                >
                    {/* Header */}
                    <div className="declaration-header">
                        <div className="declaration-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12L11 14L15 10" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
                            </svg>
                        </div>
                        <h2>Interview Declaration</h2>
                        <p className="declaration-subtitle">Please read and accept the following before starting your interview</p>
                    </div>

                    {/* Body */}
                    <div className="declaration-body">
                        <div className="declaration-notice">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <p>
                                This interview will be recorded and monitored for integrity purposes.
                                Your acceptance of these terms is required to proceed.
                            </p>
                        </div>

                        <div className="declaration-items">
                            {/* Identity Verification */}
                            <label className="declaration-item">
                                <input
                                    type="checkbox"
                                    checked={declarations.identity}
                                    onChange={() => handleCheckChange('identity')}
                                />
                                <div className="declaration-item-content">
                                    <h4>Identity Verification</h4>
                                    <p>
                                        I confirm that I am the person whose name appears on this account and that
                                        I will be the only person taking this interview.
                                    </p>
                                </div>
                            </label>

                            {/* Proctoring Consent */}
                            <label className="declaration-item">
                                <input
                                    type="checkbox"
                                    checked={declarations.proctoring}
                                    onChange={() => handleCheckChange('proctoring')}
                                />
                                <div className="declaration-item-content">
                                    <h4>Proctoring & Monitoring Consent</h4>
                                    <p>
                                        I consent to camera monitoring during the interview. I understand that the system
                                        will detect face presence, multiple faces, tab switches, and other activities to
                                        ensure interview integrity.
                                    </p>
                                </div>
                            </label>

                            {/* Recording Consent */}
                            <label className="declaration-item">
                                <input
                                    type="checkbox"
                                    checked={declarations.recording}
                                    onChange={() => handleCheckChange('recording')}
                                />
                                <div className="declaration-item-content">
                                    <h4>Video Recording Consent</h4>
                                    <p>
                                        I consent to the recording of my video, audio, and screen during this interview.
                                        I understand recordings will be used for evaluation, quality assurance, and may be
                                        reviewed by administrators.
                                    </p>
                                </div>
                            </label>

                            {/* No External Help */}
                            <label className="declaration-item">
                                <input
                                    type="checkbox"
                                    checked={declarations.noHelp}
                                    onChange={() => handleCheckChange('noHelp')}
                                />
                                <div className="declaration-item-content">
                                    <h4>Independent Completion</h4>
                                    <p>
                                        I will complete this interview independently without any external assistance,
                                        unauthorized materials, or communication with others.
                                    </p>
                                </div>
                            </label>

                            {/* Authenticity Pledge */}
                            <label className="declaration-item">
                                <input
                                    type="checkbox"
                                    checked={declarations.authenticity}
                                    onChange={() => handleCheckChange('authenticity')}
                                />
                                <div className="declaration-item-content">
                                    <h4>Authenticity & Honesty Pledge</h4>
                                    <p>
                                        I pledge to provide truthful, honest responses that accurately represent my skills,
                                        knowledge, and experience. I understand that fraudulent behavior may result in
                                        disqualification and account termination.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="declaration-warning">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <p>
                                Violation of any of these terms may result in interview invalidation,
                                application rejection, or account suspension.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="declaration-footer">
                        <button
                            className="btn btn-secondary"
                            onClick={onDecline}
                        >
                            Decline
                        </button>
                        <button
                            className={`btn btn-primary ${!allChecked ? 'btn-disabled' : ''}`}
                            onClick={handleAccept}
                            disabled={!allChecked}
                        >
                            {allChecked ? 'Accept & Start Interview' : 'Accept All to Continue'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default InterviewDeclaration;
