import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { heroCopy, buttonMicro } from '../animations/animations';
import styles from './Hero.module.css';

// Import assets from existing landing assets folder
import heroDashboardImg from '../../landing/assets/hero-dashboard-1600x900.webp';

// Register GSAP plugin
gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
    const heroRef = useRef(null);
    const dashboardRef = useRef(null);

    // GSAP Pixaai-style animation
    useEffect(() => {
        if (dashboardRef.current && heroRef.current) {
            // Set initial state - tilted perspective like Pixaai
            gsap.set(dashboardRef.current, {
                transformPerspective: 1200,
                rotateX: 70,
                scale: 0.8,
                y: 50,
                transformOrigin: 'bottom center',
            });

            // Animate on scroll - straightens the tilted dashboard
            gsap.to(dashboardRef.current, {
                rotateX: 0,
                scale: 1,
                y: 0,
                ease: 'none',
                scrollTrigger: {
                    trigger: heroRef.current,
                    start: window.innerWidth > 1024 ? 'top 95%' : 'top 70%',
                    end: 'bottom bottom',
                    scrub: 1,
                }
            });
        }

        return () => {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        };
    }, []);

    return (
        <section className={styles.hero} ref={heroRef} aria-labelledby="hero-heading">
            <div className={styles.container}>
                {/* Hero Copy */}
                <motion.div
                    className={styles.heroContent}
                    variants={heroCopy}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                >
                    <span className={styles.badge}>AI-Powered Hiring Infrastructure</span>
                    <h1 id="hero-heading" className={styles.title}>
                        Skills meet<br />
                        <span className={styles.gradient}>opportunity</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Deploy enterprise-grade video interviews, build verified Talent Passports, and scale your technical hiring with intelligent, bias-free infrastructure.
                    </p>
                    <div className={styles.cta}>
                        <motion.div {...buttonMicro}>
                            <Link to="/signup" className={styles.primaryBtn}>
                                Get Started Free
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Link>
                        </motion.div>
                        <motion.div {...buttonMicro}>
                            <Link to="/demo" className={styles.secondaryBtn}>
                                Watch Demo
                            </Link>
                        </motion.div>
                    </div>
                    <div className={styles.stats}>
                        <div className={styles.stat}>
                            <span className={styles.statNumber}>Beta Launch</span>
                            <span className={styles.statLabel}>Early Access Available</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNumber}>9+ Languages</span>
                            <span className={styles.statLabel}>Live Code Evaluation</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNumber}>AI-Powered</span>
                            <span className={styles.statLabel}>Cheating Detection</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Dashboard Preview - Pixaai Style with 3D Perspective Animation */}
            <div className={styles.dashboardContainer}>
                <div className={styles.dashboardGradient} aria-hidden="true" />
                <div
                    className={styles.dashboardWrapper}
                    ref={dashboardRef}
                >
                    <div className={styles.animatedBorder}>
                        <img
                            src={heroDashboardImg}
                            alt="AI Interview platform dashboard showing candidate evaluations and talent passports"
                            className={styles.dashboardImage}
                            loading="eager"
                        />
                    </div>
                </div>
            </div>

            {/* Background gradient orbs */}
            <div className={styles.bgOrb1} aria-hidden="true" />
            <div className={styles.bgOrb2} aria-hidden="true" />
        </section>
    );
};

export default Hero;
