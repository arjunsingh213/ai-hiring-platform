import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { sectionReveal, buttonMicro, container, item } from '../animations/animations';
import styles from './CTA.module.css';

const CTA = () => {
    return (
        <section className={styles.cta} aria-labelledby="cta-heading">
            <div className={styles.container}>
                <motion.div
                    className={styles.content}
                    variants={sectionReveal}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <motion.div
                        className={styles.text}
                        variants={container}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                    >
                        <motion.h2
                            id="cta-heading"
                            className={styles.title}
                            variants={item}
                        >
                            Ready to transform<br />
                            your hiring process?
                        </motion.h2>
                        <motion.p
                            className={styles.subtitle}
                            variants={item}
                        >
                            Join thousands of companies using AI Interview to find
                            the best talent. Start your free trial today.
                        </motion.p>
                        <motion.div
                            className={styles.buttons}
                            variants={item}
                        >
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
                                    Schedule Demo
                                </Link>
                            </motion.div>
                        </motion.div>
                        <p className={styles.note}>
                            No credit card required • Free 14-day trial • Cancel anytime
                        </p>
                    </motion.div>

                    {/* Decorative elements */}
                    <div className={styles.decorativeOrb1} aria-hidden="true" />
                    <div className={styles.decorativeOrb2} aria-hidden="true" />
                </motion.div>
            </div>
        </section>
    );
};

export default CTA;
