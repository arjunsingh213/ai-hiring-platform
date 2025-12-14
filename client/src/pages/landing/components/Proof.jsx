import React from 'react';
import { motion } from 'framer-motion';
import { container, item, sectionReveal, TIMINGS, EASE_OUT } from '../animations/animations';
import styles from './Proof.module.css';

// Import avatar assets from existing landing assets folder
import avatar1 from '../../landing/assets/avatars-set-1-256x256.webp';
import avatar2 from '../../landing/assets/avatars-set-2-256x256.webp';
import avatar3 from '../../landing/assets/avatars-set-3-256x256.webp';

const testimonials = [
    {
        quote: "The AI Talent Passport completely transformed our hiring process. We now focus on skills, not just credentials.",
        author: "Sarah Chen",
        role: "Head of Engineering",
        company: "TechCorp Inc.",
        avatar: avatar1
    },
    {
        quote: "We reduced our time-to-hire by 60% while improving the quality of candidates. A game-changer for our team.",
        author: "Marcus Johnson",
        role: "VP of Talent",
        company: "Innovate Labs",
        avatar: avatar2
    },
    {
        quote: "The adaptive interview system catches things traditional interviews miss. Our retention rate improved significantly.",
        author: "Emily Rodriguez",
        role: "CTO",
        company: "StartupXYZ",
        avatar: avatar3
    }
];

const stats = [
    { number: '85%', label: 'Time Saved', description: 'Faster hiring process' },
    { number: '3x', label: 'Better Matches', description: 'Higher quality candidates' },
    { number: '92%', label: 'Satisfaction', description: 'Recruiter approval rate' },
    { number: '50+', label: 'Languages', description: 'Code evaluation support' }
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
                    <span className={styles.label}>Why AI Interview</span>
                    <h2 id="proof-heading" className={styles.title}>
                        Trusted by leading<br />
                        <span className={styles.gradient}>companies worldwide</span>
                    </h2>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    className={styles.statsGrid}
                    variants={container}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.2 }}
                >
                    {stats.map((stat) => (
                        <motion.div
                            key={stat.label}
                            className={styles.statCard}
                            variants={item}
                        >
                            <span className={styles.statNumber}>{stat.number}</span>
                            <span className={styles.statLabel}>{stat.label}</span>
                            <span className={styles.statDescription}>{stat.description}</span>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Testimonials */}
                <motion.div
                    className={styles.testimonials}
                    variants={container}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.1 }}
                >
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.author}
                            className={styles.testimonialCard}
                            variants={item}
                        >
                            <div className={styles.quoteIcon} aria-hidden="true">"</div>
                            <blockquote className={styles.quote}>
                                {testimonial.quote}
                            </blockquote>
                            <div className={styles.author}>
                                <img
                                    src={testimonial.avatar}
                                    alt={`${testimonial.author} avatar`}
                                    className={styles.avatar}
                                />
                                <div className={styles.authorInfo}>
                                    <span className={styles.authorName}>{testimonial.author}</span>
                                    <span className={styles.authorRole}>
                                        {testimonial.role}, {testimonial.company}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Company Logos (placeholder) */}
                <motion.div
                    className={styles.logos}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: TIMINGS.medium, ease: EASE_OUT }}
                    viewport={{ once: true }}
                >
                    <p className={styles.logoText}>Trusted by innovative teams at</p>
                    <div className={styles.logoGrid} aria-label="Company logos">
                        {['TechCorp', 'InnovateLabs', 'StartupXYZ', 'GlobalTech', 'FutureCo'].map((company) => (
                            <div key={company} className={styles.logoPlaceholder}>
                                {company}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Proof;
