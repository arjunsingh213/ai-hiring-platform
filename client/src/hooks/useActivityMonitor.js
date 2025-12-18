/**
 * useActivityMonitor Hook
 * Monitors user activity for cheating behaviors:
 * - Tab switching (visibility change)
 * - Window blur (alt-tab, clicking outside)
 * - Copy/paste attempts
 * - Dev tools opening (keyboard shortcuts)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const useActivityMonitor = (enabled = true, onViolation = null) => {
    // Violation tracking
    const [violations, setViolations] = useState([]);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [copyAttemptCount, setCopyAttemptCount] = useState(0);
    const [windowBlurCount, setWindowBlurCount] = useState(0);
    const [isTabActive, setIsTabActive] = useState(true);
    const [isWindowFocused, setIsWindowFocused] = useState(true);

    // Ref to track if interview has started (to avoid false positives during setup)
    const interviewStartedRef = useRef(false);
    const lastViolationTimeRef = useRef(0);

    // Add a violation with debounce (prevent spam)
    const addViolation = useCallback((type, details = {}) => {
        const now = Date.now();

        // Debounce violations of same type (at least 2 seconds apart)
        if (now - lastViolationTimeRef.current < 2000) return;
        lastViolationTimeRef.current = now;

        const violation = {
            id: `${type}-${now}`,
            type,
            timestamp: new Date().toISOString(),
            details
        };

        setViolations(prev => [...prev, violation]);

        // Callback for external handling (e.g., warning system)
        if (onViolation) {
            onViolation(violation);
        }

        console.log(`⚠️ Violation detected: ${type}`, details);
    }, [onViolation]);

    // Tab visibility change handler
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            const isHidden = document.hidden;
            setIsTabActive(!isHidden);

            if (isHidden && interviewStartedRef.current) {
                setTabSwitchCount(prev => prev + 1);
                addViolation('TAB_SWITCH', {
                    message: 'Switched away from interview tab'
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [enabled, addViolation]);

    // Window blur handler (alt-tab, clicking outside)
    useEffect(() => {
        if (!enabled) return;

        const handleBlur = () => {
            setIsWindowFocused(false);

            if (interviewStartedRef.current) {
                setWindowBlurCount(prev => prev + 1);
                addViolation('WINDOW_BLUR', {
                    message: 'Window lost focus - possible alt-tab'
                });
            }
        };

        const handleFocus = () => {
            setIsWindowFocused(true);
        };

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [enabled, addViolation]);

    // Prevent copy/paste in answer areas
    useEffect(() => {
        if (!enabled) return;

        const handleCopy = (e) => {
            if (interviewStartedRef.current) {
                e.preventDefault();
                setCopyAttemptCount(prev => prev + 1);
                addViolation('COPY_ATTEMPT', {
                    message: 'Attempted to copy text'
                });
            }
        };

        const handlePaste = (e) => {
            if (interviewStartedRef.current) {
                e.preventDefault();
                setCopyAttemptCount(prev => prev + 1);
                addViolation('PASTE_ATTEMPT', {
                    message: 'Attempted to paste text'
                });
            }
        };

        // Only prevent in answer textareas - will be binding to specific elements
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);

        return () => {
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
        };
    }, [enabled, addViolation]);

    // Detect dev tools opening (via keyboard shortcuts)
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e) => {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                addViolation('DEV_TOOLS', { message: 'F12 key pressed' });
            }

            // Ctrl+Shift+I (Chrome dev tools)
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                addViolation('DEV_TOOLS', { message: 'Ctrl+Shift+I pressed' });
            }

            // Ctrl+Shift+J (Chrome console)
            if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                e.preventDefault();
                addViolation('DEV_TOOLS', { message: 'Ctrl+Shift+J pressed' });
            }

            // Ctrl+U (View source)
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                addViolation('VIEW_SOURCE', { message: 'Ctrl+U pressed' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, addViolation]);

    // Detect right-click (context menu)
    useEffect(() => {
        if (!enabled) return;

        const handleContextMenu = (e) => {
            if (interviewStartedRef.current) {
                e.preventDefault();
                addViolation('CONTEXT_MENU', { message: 'Right-click attempted' });
            }
        };

        window.addEventListener('contextmenu', handleContextMenu);
        return () => window.removeEventListener('contextmenu', handleContextMenu);
    }, [enabled, addViolation]);

    // Start monitoring (call when interview actually starts)
    const startMonitoring = useCallback(() => {
        interviewStartedRef.current = true;
        console.log('🔍 Activity monitoring started');
    }, []);

    // Stop monitoring
    const stopMonitoring = useCallback(() => {
        interviewStartedRef.current = false;
    }, []);

    // Clear all violations
    const clearViolations = useCallback(() => {
        setViolations([]);
        setTabSwitchCount(0);
        setCopyAttemptCount(0);
        setWindowBlurCount(0);
    }, []);

    // Get total violation count
    const totalViolations = violations.length;

    // Check if any critical violation exists
    const hasCriticalViolation = tabSwitchCount >= 3 || windowBlurCount >= 5;

    return {
        // State
        violations,
        tabSwitchCount,
        copyAttemptCount,
        windowBlurCount,
        totalViolations,
        isTabActive,
        isWindowFocused,
        hasCriticalViolation,

        // Actions
        startMonitoring,
        stopMonitoring,
        clearViolations,

        // Check if monitoring is active
        isMonitoring: interviewStartedRef.current
    };
};

export default useActivityMonitor;
