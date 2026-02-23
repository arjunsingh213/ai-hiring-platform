import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Features.module.css';

// Import assets from existing landing assets folder
import passportImg from '../../landing/assets/passport-snapshot-1200x800.webp';
import codeIdeImg from '../../landing/assets/code-ide-1400x900.webp';
import workSampleImg from '../../landing/assets/work-sample-800x600.webp';
import recruiterReportImg from '../../landing/assets/recruiter-report-1200x700.webp';

const features = [
    {
        id: 'interview-room',
        title: 'Froscel Interview Room™',
        description: 'Enterprise-grade AI-powered video interviews. Secure WebRTC, live code editors, AI co-interviewer, and post-interview intelligence reports. You maintain full control.',
        image: recruiterReportImg, // Using existing asset for now, can be updated later
        color: '#E11D48',
        metric: {
            value: 'SFU',
            label: 'Architecture',
            trend: [20, 40, 60, 80, 90, 95, 98, 100]
        }
    },
    {
        id: 'passport',
        title: 'AI Talent Passport',
        description: 'Candidates build verified skill portfolios through AI assessments. Recruiters access portable credentials with confidence.',
        image: passportImg,
        color: '#0090FF',
        metric: {
            value: '98%',
            label: 'Match Accuracy',
            trend: [20, 40, 35, 50, 45, 60, 55, 70]
        }
    },
    {
        id: 'proctoring',
        title: 'Advanced Proctoring',
        description: 'AI monitors face presence, detects multiple people, tracks tab switching, and records violations with timestamps.',
        image: workSampleImg,
        color: '#10B981',
        metric: {
            value: '0.2s',
            label: 'Threat Detection',
            trend: [60, 50, 55, 40, 45, 30, 35, 20]
        }
    },
    {
        id: 'code',
        title: 'Live Code Evaluation',
        description: 'In-browser Monaco Editor with real execution in 9+ languages including Python, Java, C++, Go, and TypeScript.',
        image: codeIdeImg,
        color: '#6366F1',
        metric: {
            value: '94/100',
            label: 'Code Quality',
            trend: [30, 45, 40, 60, 55, 75, 70, 85]
        }
    },
    {
        id: 'interview',
        title: 'Adaptive AI Interviews',
        description: 'Dynamic questions that adapt to candidate responses. Fair assessments with detailed performance insights.',
        image: recruiterReportImg,
        color: '#F59E0B',
        metric: {
            value: '12ms',
            label: 'Response Latency',
            trend: [50, 45, 48, 30, 25, 15, 10, 12]
        }
    }
];

const FeatureSlider = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % features.length);
    }, []);

    useEffect(() => {
        if (isPaused) return;
        const interval = setInterval(nextSlide, 4500);
        return () => clearInterval(interval);
    }, [isPaused, nextSlide]);

    const activeFeature = features[currentIndex];

    // Spline-like calm easing
    const transition = {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1]
    };

    return (
        <div
            className={styles.windowContainer}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* macOS Window Frame */}
            <div className={styles.macOSFrame}>
                <div className={styles.trafficLights}>
                    <div className={styles.red}></div>
                    <div className={styles.yellow}></div>
                    <div className={styles.green}></div>
                </div>
                <div className={styles.windowTitle}>Feature Insights — Preview</div>
            </div>

            {/* Main Content Area */}
            <div className={styles.windowBody}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeFeature.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={transition}
                        className={styles.slideContent}
                    >
                        {/* Edge-to-Edge Background Image */}
                        <div className={styles.heroImageWrapper}>
                            <img src={activeFeature.image} alt={activeFeature.title} className={styles.heroImage} />
                            <div className={styles.imageOverlay}></div>
                        </div>

                        {/* Floating Info Overlays */}
                        <div className={styles.contentOverlay}>
                            {/* Center: Feature Info */}
                            <div className={styles.centerOverlay}>
                                <div className={styles.badge} style={{ color: activeFeature.color, borderColor: `${activeFeature.color}40`, backgroundColor: `${activeFeature.color}15` }}>
                                    Feature Overview
                                </div>
                                <h3 className={styles.featureTitle}>{activeFeature.title}</h3>
                                <p className={styles.featureDesc}>{activeFeature.description}</p>
                            </div>

                            {/* Bottom Right: Metrics */}
                            <div className={styles.bottomOverlay}>
                                <div className={styles.metricBlock}>
                                    <div className={styles.metricHeader}>
                                        <span className={styles.metricLabel}>{activeFeature.metric.label}</span>
                                        <span className={styles.metricValue}>{activeFeature.metric.value}</span>
                                    </div>
                                    <div className={styles.trendLineWrapper}>
                                        <svg viewBox="0 0 100 30" className={styles.trendSvg}>
                                            <motion.path
                                                d={`M ${activeFeature.metric.trend.map((v, i) => `${i * 14.28},${30 - (v / 100) * 30}`).join(' L ')}`}
                                                fill="none"
                                                stroke={activeFeature.color}
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{ duration: 1, delay: 0.2 }}
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
                {features.map((_, idx) => (
                    <button
                        key={idx}
                        className={`${styles.dot} ${idx === currentIndex ? styles.activeDot : ''}`}
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`Slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

const Features = () => {
    return (
        <section id="features" className={styles.features}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <span className={styles.label}>Advanced Capabilities</span>
                    <h2 className={styles.title}>
                        Enterprise-grade <span className={styles.gradient}>Recruitment Intelligence</span>
                    </h2>
                    <p className={styles.subtitle}>
                        Proprietary AI models precision-tuned for identifying elite engineering talent
                        and building high-performance teams.
                    </p>
                </div>

                <FeatureSlider />
            </div>
        </section>
    );
};

export default Features;
