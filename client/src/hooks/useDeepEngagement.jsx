import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track deep engagement (Time + Scroll + Interactions)
 * @param {Object} config
 * @param {number} config.minTime - Minimum time in ms to wait (dwell time)
 * @param {number} config.scrollThreshold - Scroll percentage (0-1) required
 * @param {number} config.minInteractions - Minimum number of interactions required
 * @param {string} config.featureId - Feature ID for localStorage persistence check
 * @returns {Object} { hasEngaged, trackInteraction, isEligible }
 */
export const useDeepEngagement = ({
    minTime = 30000,
    scrollThreshold = 0.8,
    minInteractions = 1,
    featureId
} = {}) => {
    const [stats, setStats] = useState({
        timeReached: false,
        scrolledDeep: false,
        interactionCount: 0
    });
    const [hasEngaged, setHasEngaged] = useState(false);

    // Check if user has already given feedback
    const [alreadyShown, setAlreadyShown] = useState(() => {
        if (!featureId) return false;
        const userId = localStorage.getItem('userId');
        return !!localStorage.getItem(`feedback_${featureId}_${userId}`);
    });

    // Timer for Dwell Time
    useEffect(() => {
        if (alreadyShown) return;

        const timer = setTimeout(() => {
            setStats(prev => ({ ...prev, timeReached: true }));
        }, minTime);

        return () => clearTimeout(timer);
    }, [minTime, alreadyShown]);

    // Scroll Tracker
    useEffect(() => {
        if (alreadyShown) return;

        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight;
            const winHeight = window.innerHeight;

            // If content is shorter than viewport, consider scrolled
            if (docHeight <= winHeight) {
                setStats(prev => {
                    if (!prev.scrolledDeep) return { ...prev, scrolledDeep: true };
                    return prev;
                });
                return;
            }

            const scrollPercent = (scrollTop + winHeight) / docHeight;
            if (scrollPercent >= scrollThreshold) {
                setStats(prev => {
                    if (!prev.scrolledDeep) return { ...prev, scrolledDeep: true };
                    return prev;
                });
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Initial check
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, [scrollThreshold, alreadyShown]);

    // Interaction Tracker
    const trackInteraction = useCallback(() => {
        if (alreadyShown) return;
        setStats(prev => ({ ...prev, interactionCount: prev.interactionCount + 1 }));
    }, [alreadyShown]);

    // Check Engagement Criteria
    useEffect(() => {
        if (alreadyShown || hasEngaged) return;

        if (stats.timeReached &&
            stats.scrolledDeep &&
            stats.interactionCount >= minInteractions) {
            setHasEngaged(true);
        }
    }, [stats, minInteractions, alreadyShown, hasEngaged]);

    return { hasEngaged, trackInteraction };
};
