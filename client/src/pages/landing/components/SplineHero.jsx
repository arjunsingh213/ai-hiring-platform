import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import styles from './SplineHero.module.css';

// Lazy load Spline to improve initial page load
const Spline = lazy(() => import('@splinetool/react-spline'));

/**
 * SplineHero - 3D animated hero section using Spline
 * 
 * Features:
 * - Lazy loaded for performance
 * - Fallback loading animation
 * - Error boundary handling
 * - Responsive sizing
 * - Mouse-tracking tilt effect
 * 
 * To use:
 * 1. Create your scene at spline.design
 * 2. Export as "Web Content" and get the scene URL
 * 3. Replace SPLINE_SCENE_URL with your URL
 * 
 * Scene should end with /scene.splinecode
 */

// Default Spline scene URL (can be overridden via props)
const SPLINE_SCENE_URL = '/scene.splinecode';

// Tilt configuration
const TILT_MAX = 15; // Maximum tilt in degrees
const TILT_SCALE = 1.02; // Scale on hover
const TILT_SPEED = 400; // Transition speed in ms

const SplineHero = ({ sceneUrl = SPLINE_SCENE_URL, className = '' }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const containerRef = useRef(null);
    const [tiltStyle, setTiltStyle] = useState({
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: `transform ${TILT_SPEED}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`
    });

    // Handle mouse move for tilt effect
    const handleMouseMove = useCallback((e) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate mouse position relative to center (-1 to 1)
        const mouseX = (e.clientX - centerX) / (rect.width / 2);
        const mouseY = (e.clientY - centerY) / (rect.height / 2);

        // Calculate tilt angles (inverted for natural feel)
        const tiltX = -mouseY * TILT_MAX;
        const tiltY = mouseX * TILT_MAX;

        setTiltStyle({
            transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${TILT_SCALE}, ${TILT_SCALE}, ${TILT_SCALE})`,
            transition: `transform 100ms ease-out`
        });
    }, []);

    // Reset tilt on mouse leave
    const handleMouseLeave = useCallback(() => {
        setTiltStyle({
            transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
            transition: `transform ${TILT_SPEED}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`
        });
    }, []);

    // Handle spline load complete
    const handleLoad = (spline) => {
        setIsLoaded(true);
        console.log('Spline scene loaded successfully');
    };

    // Handle load error
    const handleError = (error) => {
        console.error('Spline load error:', error);
        setHasError(true);
    };

    // Fallback loading component
    const LoadingFallback = () => (
        <div className={styles.loadingContainer}>
            <div className={styles.loadingOrb}>
                <div className={styles.orbCore}></div>
                <div className={styles.orbRing}></div>
                <div className={styles.orbRing} style={{ animationDelay: '0.2s' }}></div>
                <div className={styles.orbRing} style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className={styles.loadingText}>Loading 3D Experience...</p>
        </div>
    );

    // Error fallback - shows a CSS animated version
    const ErrorFallback = () => (
        <div className={styles.errorFallback}>
            <div className={styles.neuralNetwork}>
                {/* Central brain node */}
                <div className={styles.brainNode}>
                    <span className={styles.brainIcon}>🧠</span>
                </div>

                {/* Orbiting nodes */}
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className={styles.orbitNode}
                        style={{
                            '--orbit-delay': `${i * 0.5}s`,
                            '--orbit-distance': `${80 + (i % 3) * 30}px`
                        }}
                    >
                        <span className={styles.nodeIcon}>
                            {['📄', '🎥', '💼', '✅', '⭐', '🎯'][i]}
                        </span>
                    </div>
                ))}

                {/* Connection lines */}
                <svg className={styles.connections} viewBox="0 0 300 300">
                    <circle cx="150" cy="150" r="60" className={styles.connectionRing} />
                    <circle cx="150" cy="150" r="100" className={styles.connectionRing} style={{ animationDelay: '0.3s' }} />
                    <circle cx="150" cy="150" r="140" className={styles.connectionRing} style={{ animationDelay: '0.6s' }} />
                </svg>
            </div>
        </div>
    );

    // Show CSS fallback only on error
    if (hasError) {
        return (
            <div className={`${styles.splineContainer} ${className}`}>
                <ErrorFallback />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`${styles.splineContainer} ${className} ${isLoaded ? styles.loaded : ''}`}
            style={tiltStyle}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <Suspense fallback={<LoadingFallback />}>
                <Spline
                    scene={sceneUrl}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={styles.splineCanvas}
                />
            </Suspense>

            {/* Gradient overlay for text readability */}
            <div className={styles.gradientOverlay}></div>
        </div>
    );
};

export default SplineHero;

