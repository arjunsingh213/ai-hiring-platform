import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Anti-cheat monitoring hook for challenge attempts
 * Tracks tab switches, focus losses, paste attempts, rapid injections,
 * keyboard rhythm, and idle periods
 */
const useAntiCheat = (isActive = false) => {
    const [tabSwitches, setTabSwitches] = useState(0);
    const [focusLosses, setFocusLosses] = useState(0);
    const [pasteAttempts, setPasteAttempts] = useState(0);
    const [rapidInjections, setRapidInjections] = useState(0);
    const [idleGaps, setIdleGaps] = useState([]);
    const [idlePeriods, setIdlePeriods] = useState(0);
    const [totalIdleTime, setTotalIdleTime] = useState(0);
    const [timestamps, setTimestamps] = useState([]);
    const keystrokesRef = useRef([]);
    const lastTextLengthRef = useRef(0);
    const lastActivityRef = useRef(Date.now());
    const idleTimerRef = useRef(null);
    const idleStartRef = useRef(null);

    // Idle threshold: 30 seconds without any activity
    const IDLE_THRESHOLD = 30000;
    // Check interval: every 5 seconds
    const IDLE_CHECK_INTERVAL = 5000;

    const endIdlePeriod = useCallback(() => {
        if (idleStartRef.current) {
            const idleDuration = Date.now() - idleStartRef.current;
            setTotalIdleTime(prev => prev + idleDuration);
            setIdleGaps(prev => [...prev, Math.round(idleDuration / 1000)]);
            idleStartRef.current = null;
        }
    }, [totalIdleTime]);

    useEffect(() => {
        if (!isActive) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitches(prev => prev + 1);
                setTimestamps(prev => [...prev, { event: 'tab_switch', time: new Date() }]);
            }
            lastActivityRef.current = Date.now();
        };

        const handleBlur = () => {
            setFocusLosses(prev => prev + 1);
            setTimestamps(prev => [...prev, { event: 'focus_loss', time: new Date() }]);
            lastActivityRef.current = Date.now();
        };

        const handlePaste = (e) => {
            setPasteAttempts(prev => prev + 1);
            setTimestamps(prev => [...prev, { event: 'paste', time: new Date() }]);
            lastActivityRef.current = Date.now();
        };

        const handleKeyDown = (e) => {
            keystrokesRef.current.push({ key: e.key, timestamp: Date.now() });
            // Keep last 200 keystrokes
            if (keystrokesRef.current.length > 200) {
                keystrokesRef.current = keystrokesRef.current.slice(-200);
            }
            // Reset idle tracking on activity
            endIdlePeriod();
            lastActivityRef.current = Date.now();
        };

        const handleMouseMove = () => {
            endIdlePeriod();
            lastActivityRef.current = Date.now();
        };

        const handleClick = () => {
            endIdlePeriod();
            lastActivityRef.current = Date.now();
        };

        // Idle detection timer
        idleTimerRef.current = setInterval(() => {
            const now = Date.now();
            const timeSinceActivity = now - lastActivityRef.current;

            if (timeSinceActivity >= IDLE_THRESHOLD && !idleStartRef.current) {
                // User went idle
                idleStartRef.current = lastActivityRef.current;
                setIdlePeriods(prev => prev + 1);
                setTimestamps(prev => [...prev, {
                    event: 'idle_start',
                    time: new Date(),
                    idleSince: new Date(lastActivityRef.current)
                }]);
            }
        }, IDLE_CHECK_INTERVAL);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('click', handleClick);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleClick);
            if (idleTimerRef.current) clearInterval(idleTimerRef.current);
        };
    }, [isActive, endIdlePeriod]);

    // Detect rapid text injection (text jumping more than 50 chars at once)
    const checkRapidInjection = useCallback((currentText) => {
        const lengthDiff = Math.abs((currentText?.length || 0) - lastTextLengthRef.current);
        lastTextLengthRef.current = currentText?.length || 0;

        if (lengthDiff > 50) {
            setRapidInjections(prev => prev + 1);
            setTimestamps(prev => [...prev, { event: 'rapid_injection', time: new Date() }]);
        }
    }, []);

    const getAntiCheatReport = useCallback(() => {
        // Finalize any ongoing idle period
        let finalIdleTime = totalIdleTime;
        let finalIdleGaps = [...idleGaps];
        if (idleStartRef.current) {
            const lastGap = Date.now() - idleStartRef.current;
            finalIdleTime += lastGap;
            finalIdleGaps.push(Math.round(lastGap / 1000));
        }

        return {
            tabSwitches,
            focusLosses,
            pasteAttempts,
            rapidInjections,
            idlePeriods,
            idleGaps: finalIdleGaps,
            totalIdleTime: finalIdleTime,
            keyboardRhythm: keystrokesRef.current,
            timestamps
        };
    }, [tabSwitches, focusLosses, pasteAttempts, rapidInjections, idlePeriods, idleGaps, totalIdleTime, timestamps]);

    const reset = useCallback(() => {
        setTabSwitches(0);
        setFocusLosses(0);
        setPasteAttempts(0);
        setRapidInjections(0);
        setIdlePeriods(0);
        setIdleGaps([]);
        setTotalIdleTime(0);
        setTimestamps([]);
        keystrokesRef.current = [];
        lastTextLengthRef.current = 0;
        lastActivityRef.current = Date.now();
        idleStartRef.current = null;
    }, []);

    return {
        tabSwitches,
        focusLosses,
        pasteAttempts,
        rapidInjections,
        idlePeriods,
        idleGaps,
        totalIdleTime,
        checkRapidInjection,
        getAntiCheatReport,
        reset
    };
};

export default useAntiCheat;
