/**
 * InterviewProctor Component
 * Monitors for proctoring violations and logs them for admin review
 * Does NOT terminate interview - just logs and shows gentle reminders
 * Admin makes final decision after reviewing violations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useFaceDetection from '../hooks/useFaceDetection';
import useActivityMonitor from '../hooks/useActivityMonitor';
import './InterviewProctor.css';

const InterviewProctor = ({
    videoRef,
    enabled = true,
    initialViolations = [],  // NEW: Accept initial violations from parent to maintain cumulative count
    onViolationLog = null  // Callback to log violations for final evaluation
}) => {
    // Violation log (all violations recorded for admin review)
    // Initialize with parent's cumulative violations to maintain count across remounts
    // Violation log (all violations recorded for admin review)
    // Initialize with parent's cumulative violations to maintain count across remounts
    const [violations, setViolations] = useState(initialViolations);
    const [currentNotice, setCurrentNotice] = useState(null);
    const [showNotice, setShowNotice] = useState(false);

    // REMOVED manual sync useEffect that was causing infinite loops
    // initialViolations is used for initial state only
    // Components should be remounted with a new key if a full reset is needed
    // or the parent should manage the state entirely.

    // Determine violation severity for admin review
    const getSeverity = useCallback((type) => {
        switch (type) {
            case 'TAB_SWITCH':
            case 'WINDOW_BLUR':
                return 'high';
            case 'MULTIPLE_FACES':
            case 'NO_FACE':
                return 'medium';
            case 'LOOK_AWAY':
            case 'COPY_ATTEMPT':
            case 'PASTE_ATTEMPT':
                return 'low';
            default:
                return 'medium';
        }
    }, []);

    // Get icon for violation type
    const getViolationIcon = useCallback((type) => {
        switch (type) {
            case 'NO_FACE': return '👤';
            case 'MULTIPLE_FACES': return '👥';
            case 'LOOK_AWAY': return '👀';
            case 'TAB_SWITCH': return '🔀';
            case 'WINDOW_BLUR': return '🪟';
            case 'COPY_ATTEMPT':
            case 'PASTE_ATTEMPT': return '📋';
            case 'DEV_TOOLS': return '⚙️';
            default: return '⚠️';
        }
    }, []);

    // Log a violation (does NOT terminate - just records)
    const logViolation = useCallback((type, message) => {
        const violation = {
            id: `violation-${Date.now()}`,
            type,
            message,
            timestamp: new Date().toISOString(),
            severity: getSeverity(type)
        };

        // Add to violations list
        setViolations(prev => {
            const updated = [...prev, violation];
            // Defer callback to avoid setState during render
            // Parent component (OnboardingInterview) needs this update async
            if (onViolationLog) {
                setTimeout(() => onViolationLog(updated), 0);
            }
            return updated;
        });

        // Show gentle notice (non-blocking, auto-dismiss after 3 seconds)
        setCurrentNotice(violation);
        setShowNotice(true);
        setTimeout(() => setShowNotice(false), 3000);

        console.log(`📋 Violation logged: ${type} - ${message}`);
    }, [onViolationLog, getSeverity]);

    // Handle violations from activity monitor
    const handleViolation = useCallback((violation) => {
        logViolation(violation.type, violation.details.message);
    }, [logViolation]);

    // Use our custom hooks
    const faceDetection = useFaceDetection(videoRef, enabled);
    const activityMonitor = useActivityMonitor(enabled, handleViolation);

    // Start monitoring when component mounts
    useEffect(() => {
        if (enabled) {
            activityMonitor.startMonitoring();
        }
        return () => activityMonitor.stopMonitoring();
    }, [enabled, activityMonitor]);

    // Track previous face detection states to prevent duplicate logging
    const prevFaceState = useRef({ shouldWarnNoFace: false, hasMultipleFaces: false, shouldWarnLookAway: false });

    // React to face detection issues (log, don't terminate)
    // Using refs to prevent infinite loops
    useEffect(() => {
        if (!enabled) return;

        // No face detected - only log if state changed
        if (faceDetection.shouldWarnNoFace && !faceDetection.faceDetected &&
            !prevFaceState.current.shouldWarnNoFace) {
            prevFaceState.current.shouldWarnNoFace = true;
            logViolation('NO_FACE', 'Face not detected in camera');
        } else if (faceDetection.faceDetected) {
            prevFaceState.current.shouldWarnNoFace = false;
        }

        // Multiple faces - only log if state changed
        if (faceDetection.hasMultipleFaces && !prevFaceState.current.hasMultipleFaces) {
            prevFaceState.current.hasMultipleFaces = true;
            logViolation('MULTIPLE_FACES', `${faceDetection.faceCount} faces detected`);
        } else if (!faceDetection.hasMultipleFaces) {
            prevFaceState.current.hasMultipleFaces = false;
        }

        // Looking away - only log if state changed
        if (faceDetection.shouldWarnLookAway && !prevFaceState.current.shouldWarnLookAway) {
            prevFaceState.current.shouldWarnLookAway = true;
            logViolation('LOOK_AWAY', 'Looking away from camera');
        } else if (!faceDetection.shouldWarnLookAway) {
            prevFaceState.current.shouldWarnLookAway = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        enabled,
        faceDetection.shouldWarnNoFace,
        faceDetection.faceDetected,
        faceDetection.hasMultipleFaces,
        faceDetection.faceCount,
        faceDetection.shouldWarnLookAway
    ]);

    // Get violations for parent component to include in evaluation
    const getViolationReport = useCallback(() => {
        const highCount = violations.filter(v => v.severity === 'high').length;
        const mediumCount = violations.filter(v => v.severity === 'medium').length;
        const lowCount = violations.filter(v => v.severity === 'low').length;

        return {
            totalViolations: violations.length,
            highSeverity: highCount,
            mediumSeverity: mediumCount,
            lowSeverity: lowCount,
            suspiciousActivity: highCount >= 3 || violations.length >= 10,
            violations: violations,
            recommendation: highCount >= 3
                ? 'FLAG_FOR_REVIEW'
                : violations.length >= 10
                    ? 'NEEDS_ATTENTION'
                    : 'NORMAL'
        };
    }, [violations]);

    // Removed duplicate useEffect that was causing infinite loops
    // The callback is now called from logViolation directly

    if (!enabled) return null;

    return (
        <>
            {/* Proctor Status Indicator - shows in camera area */}
            <div className="proctor-status">
                <div className={`proctoring-badge ${faceDetection.faceDetected ? 'active' : 'warning'}`}>
                    <span className="badge-dot"></span>
                    <span className="badge-text">
                        {faceDetection.error ? 'Error' :
                            faceDetection.loading ? 'Loading...' :
                                faceDetection.faceDetected ? 'Proctoring Active' : 'Checking...'}
                    </span>
                </div>
                {faceDetection.error && <div className="proctor-error-msg">{faceDetection.error}</div>}

                {/* Violation counter (visible but non-threatening) */}
                {violations.length > 0 && (
                    <div className="violation-counter">
                        <span className="violation-icon">📋</span>
                        <span className="violation-count">{violations.length}</span>
                    </div>
                )}
            </div>

            {/* Gentle Notice Toast (non-blocking) */}
            <AnimatePresence>
                {showNotice && currentNotice && (
                    <motion.div
                        className="proctor-notice"
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                    >
                        <span className="notice-icon">{getViolationIcon(currentNotice.type)}</span>
                        <span className="notice-text">{currentNotice.message}</span>
                        <span className="notice-dismiss">Logged</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default InterviewProctor;
