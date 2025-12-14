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
        description: 'Unique skill verification system that creates a portable credential for candidates, showcasing their verified abilities across domains.',
        image: passportImg,
        color: '#0090FF'
    },
    {
        icon: '🎤',
        title: 'Adaptive AI Interviews',
        description: 'Real-time AI-powered interviews that adapt to candidate responses, ensuring fair and comprehensive skill assessment.',
        image: codeIdeImg,
        color: '#10B981'
    },
    {
        icon: '💻',
        title: 'Live Code Evaluation',
        description: 'Integrated coding IDE with AI analysis for technical role evaluations. Real execution in 50+ programming languages.',
        image: workSampleImg,
        color: '#6366F1'
    },
    {
        icon: '📊',
        title: 'Recruiter Dashboard',
        description: 'Comprehensive analytics and pipeline management. View candidate scores, track progress, and make data-driven hiring decisions.',
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
                        Everything you need to<br />
                        <span className={styles.gradient}>hire smarter</span>
                    </h2>
                    <p className={styles.subtitle}>
                        A complete hiring solution powered by AI. From initial screening to final evaluation,
                        we help you find the best talent efficiently.
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
