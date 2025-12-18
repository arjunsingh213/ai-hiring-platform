/**
 * InterviewProctor Component
 * Monitors for proctoring violations and logs them for admin review
 * Does NOT terminate interview - just logs and shows gentle reminders
 * Admin makes final decision after reviewing violations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useFaceDetection from '../hooks/useFaceDetection';
import useActivityMonitor from '../hooks/useActivityMonitor';
import './InterviewProctor.css';

const InterviewProctor = ({
    videoRef,
    enabled = true,
    onViolationLog = null  // Callback to log violations for final evaluation
}) => {
    // Violation log (all violations recorded for admin review)
    const [violations, setViolations] = useState([]);
    const [currentNotice, setCurrentNotice] = useState(null);
    const [showNotice, setShowNotice] = useState(false);

    // Use our custom hooks
    const faceDetection = useFaceDetection(videoRef, enabled);
    const activityMonitor = useActivityMonitor(enabled, handleViolation);

    // Start monitoring when component mounts
    useEffect(() => {
        if (enabled) {
            activityMonitor.startMonitoring();
        }
        return () => activityMonitor.stopMonitoring();
    }, [enabled]);

    // Handle violations from activity monitor
    function handleViolation(violation) {
        logViolation(violation.type, violation.details.message);
    }

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
            // Notify parent component for final evaluation
            if (onViolationLog) {
                onViolationLog(updated);
            }
            return updated;
        });

        // Show gentle notice (non-blocking, auto-dismiss after 3 seconds)
        setCurrentNotice(violation);
        setShowNotice(true);
        setTimeout(() => setShowNotice(false), 3000);

        console.log(`📋 Violation logged: ${type} - ${message}`);
    }, [onViolationLog]);

    // Determine violation severity for admin review
    const getSeverity = (type) => {
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
    };

    // Get icon for violation type
    const getViolationIcon = (type) => {
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
    };

    // React to face detection issues (log, don't terminate)
    useEffect(() => {
        if (!enabled) return;

        // No face detected
        if (faceDetection.shouldWarnNoFace && !faceDetection.faceDetected) {
            logViolation('NO_FACE', 'Face not detected in camera');
        }

        // Multiple faces
        if (faceDetection.hasMultipleFaces) {
            logViolation('MULTIPLE_FACES', `${faceDetection.faceCount} faces detected`);
        }

        // Looking away
        if (faceDetection.shouldWarnLookAway) {
            logViolation('LOOK_AWAY', 'Looking away from camera');
        }

    }, [
        enabled,
        faceDetection.shouldWarnNoFace,
        faceDetection.faceDetected,
        faceDetection.hasMultipleFaces,
        faceDetection.faceCount,
        faceDetection.shouldWarnLookAway,
        logViolation
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

    // Expose getViolationReport through ref or callback
    useEffect(() => {
        if (onViolationLog) {
            // Pass the report getter function
            onViolationLog(violations, getViolationReport);
        }
    }, [violations, getViolationReport, onViolationLog]);

    if (!enabled) return null;

    return (
        <>
            {/* Proctor Status Indicator - shows in camera area */}
            <div className="proctor-status">
                <div className={`proctoring-badge ${faceDetection.faceDetected ? 'active' : 'warning'}`}>
                    <span className="badge-dot"></span>
                    <span className="badge-text">
                        {faceDetection.loading ? 'Loading...' :
                            faceDetection.faceDetected ? 'Proctoring Active' : 'Checking...'}
                    </span>
                </div>

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
