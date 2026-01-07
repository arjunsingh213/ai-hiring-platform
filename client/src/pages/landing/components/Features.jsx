import React from 'react';
import { motion } from 'framer-motion';
import { container, item, cardHover, sectionReveal } from '../animations/animations';
import styles from './Features.module.css';

// Import assets from existing landing assets folder
import passportImg from '../../landing/assets/passport-snapshot-1200x800.webp';
import codeIdeImg from '../../landing/assets/code-ide-1400x900.webp';
import workSampleImg from '../../landing/assets/work-sample-800x600.webp';
import recruiterReportImg from '../../landing/assets/recruiter-report-1200x700.webp';

const features = [
    {
        icon: '🎯',
        title: 'AI Talent Passport',
        description: 'Candidates build verified skill portfolios through AI assessments. Recruiters access portable credentials with confidence.',
        image: passportImg,
        color: '#0090FF'
    },
    {
        icon: '🛡️',
        title: 'Advanced Proctoring',
        description: 'AI monitors face presence, detects multiple people, tracks tab switching, and records violations with timestamps for review.',
        image: workSampleImg,
        color: '#10B981'
    },
    {
        icon: '💻',
        title: 'Live Code Evaluation',
        description: 'In-browser Monaco Editor with real execution in 9+ languages including Python, Java, C++, Go, and TypeScript.',
        image: codeIdeImg,
        color: '#6366F1'
    },
    {
        icon: '🤖',
        title: 'Adaptive AI Interviews',
        description: 'Dynamic questions that adapt to candidate responses. Fair assessments with detailed performance insights for recruiters.',
        image: recruiterReportImg,
        color: '#F59E0B'
    }
];

const Features = () => {
    return (
        <section id="features" className={styles.features} aria-labelledby="features-heading">
            <div className={styles.container}>
                {/* Section Header */}
                <motion.div
                    className={styles.header}
                    variants={sectionReveal}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.2 }}
                >
                    <span className={styles.label}>Features</span>
                    <h2 id="features-heading" className={styles.title}>
                        AI-powered platform to<br />
                        <span className={styles.gradient}>match talent with opportunity</span>
                    </h2>
                    <p className={styles.subtitle}>
                        Whether you're finding your next role or building your dream team,
                        our AI-driven platform creates fair, efficient, and verified connections.
                    </p>
                </motion.div>

                {/* Feature Cards */}
                <motion.div
                    className={styles.grid}
                    variants={container}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.1 }}
                >
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            className={styles.card}
                            variants={item}
                            initial="rest"
                            whileHover="hover"
                        >
                            <motion.div
                                className={styles.cardInner}
                                variants={cardHover}
                            >
                                <div
                                    className={styles.iconWrapper}
                                    style={{ background: `${feature.color}15` }}
                                >
                                    <span className={styles.icon}>{feature.icon}</span>
                                </div>
                                <h3 className={styles.cardTitle}>{feature.title}</h3>
                                <p className={styles.cardDescription}>{feature.description}</p>
                                <div className={styles.imagePreview}>
                                    <img
                                        src={feature.image}
                                        alt={`${feature.title} - Platform screenshot`}
                                        loading="lazy"
                                    />
                                </div>
                            </motion.div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default Features;
