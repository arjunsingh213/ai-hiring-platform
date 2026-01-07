import React from 'react';
import { motion } from 'framer-motion';
import { container, item, sectionReveal } from '../animations/animations';
import styles from './Proof.module.css';

const capabilities = [
    {
        icon: '🛡️',
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
        icon: '💻',
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
        icon: '🤖',
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
        icon: '🎯',
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
                                        <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor">
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
