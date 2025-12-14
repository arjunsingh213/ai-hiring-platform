import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { heroCopy, heroVisual, buttonMicro, useHeroParallax } from '../animations/animations';
import styles from './Hero.module.css';

// Import assets from existing landing assets folder
import heroDashboardImg from '../../landing/assets/hero-dashboard-1600x900.webp';

const Hero = () => {
    const { y, opacity } = useHeroParallax();

    return (
        <section className={styles.hero} aria-labelledby="hero-heading">
            <div className={styles.container}>
                {/* Hero Copy */}
                <motion.div
                    className={styles.heroContent}
                    variants={heroCopy}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                >
                    <span className={styles.badge}>AI-Powered Hiring Platform</span>
                    <h1 id="hero-heading" className={styles.title}>
                        Hire on skills,<br />
                        <span className={styles.gradient}>not just CVs</span>
                    </h1>
                    <p className={styles.subtitle}>
                        AI Talent Passport, adaptive interviews, and live code evaluations —
                        all in one platform. Find the best talent in minutes, not months.
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
                            <span className={styles.statNumber}>10,000+</span>
                            <span className={styles.statLabel}>Interviews Completed</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNumber}>85%</span>
                            <span className={styles.statLabel}>Time Saved</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNumber}>500+</span>
                            <span className={styles.statLabel}>Companies Trust Us</span>
                        </div>
                    </div>
                </motion.div>

                {/* Hero Visual */}
                <motion.div
                    className={styles.heroVisual}
                    variants={heroVisual}
                    initial="hidden"
                    whileInView="show"
                    whileHover="hover"
                    viewport={{ once: true }}
                >
                    <motion.div
                        className={styles.imageWrapper}
                        style={{ y, opacity }}
                    >
                        <img
                            src={heroDashboardImg}
                            alt="AI Interview platform dashboard showing candidate evaluations and talent passports"
                            className={styles.heroImage}
                            loading="eager"
                        />
                        {/* Floating cards */}
                        <div className={styles.floatingCard + ' ' + styles.card1}>
                            <div className={styles.cardIcon}>✓</div>
                            <div className={styles.cardText}>
                                <span className={styles.cardTitle}>Interview Complete</span>
                                <span className={styles.cardSubtitle}>Score: 92/100</span>
                            </div>
                        </div>
                        <div className={styles.floatingCard + ' ' + styles.card2}>
                            <div className={styles.cardIcon}>⚡</div>
                            <div className={styles.cardText}>
                                <span className={styles.cardTitle}>AI Talent Passport</span>
                                <span className={styles.cardSubtitle}>Level 5 - Expert</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Background gradient orbs */}
            <div className={styles.bgOrb1} aria-hidden="true" />
            <div className={styles.bgOrb2} aria-hidden="true" />
        </section>
    );
};

export default Hero;
