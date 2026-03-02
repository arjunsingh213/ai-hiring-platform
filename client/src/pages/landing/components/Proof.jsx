import React from 'react';
import { motion } from 'framer-motion';
import { container, item, sectionReveal } from '../animations/animations';
import styles from './Proof.module.css';

const capabilities = [
    {
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>,
        title: 'Secure Proctoring System',
        features: [
            'Real-time face detection',
            'Multiple person detection',
            'Tab switching monitoring',
            'Violation timestamping'
        ],
        color: '#10B981'
    },
    {
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>,
        title: 'Multi-Language Code Execution',
        features: [
            'Monaco Editor integration',
            '9+ programming languages',
            'Judge0 API for execution',
            'Real-time syntax highlighting'
        ],
        color: '#6366F1'
    },
    {
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" /></svg>,
        title: 'AI-Powered Matching',
        features: [
            'Adaptive interview questions',
            'Dynamic response analysis',
            'Skill-based assessments',
            'Performance insights'
        ],
        color: '#0090FF'
    },
    {
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
        title: 'Portable Skill Credentials',
        features: [
            'Verified talent passports',
            'Blockchain-ready design',
            'Cross-platform portability',
            'Tamper-proof records'
        ],
        color: '#F59E0B'
    }
];

const Proof = () => {
    return (
        <section id="proof" className={styles.proof} aria-labelledby="proof-heading">
            <div className={styles.container}>
                {/* Section Header */}
                <motion.div
                    className={styles.header}
                    variants={sectionReveal}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.2 }}
                >
                    <span className={styles.label}>Platform Capabilities</span>
                    <h2 id="proof-heading" className={styles.title}>
                        Built with cutting-edge<br />
                        <span className={styles.gradient}>AI technology</span>
                    </h2>
                    <p className={styles.subtitle}>
                        Real features, real technology. No fluff, just powerful tools for modern hiring.
                    </p>
                </motion.div>

                {/* Capabilities Grid */}
                <motion.div
                    className={styles.capabilitiesGrid}
                    variants={container}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.1 }}
                >
                    {capabilities.map((capability) => (
                        <motion.div
                            key={capability.title}
                            className={styles.capabilityCard}
                            variants={item}
                        >
                            <div
                                className={styles.capabilityIcon}
                                style={{ background: `${capability.color}15` }}
                            >
                                <span>{capability.icon}</span>
                            </div>
                            <h3 className={styles.capabilityTitle}>{capability.title}</h3>
                            <ul className={styles.featureList}>
                                {capability.features.map((feature, index) => (
                                    <li key={index} className={styles.featureItem}>
                                        <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default Proof;
