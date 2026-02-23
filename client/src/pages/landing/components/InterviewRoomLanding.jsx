import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './InterviewRoomLanding.module.css';

const JOB_TYPES = {
    'frontend-engineer': {
        title: 'AI Interview for Frontend Engineers',
        description: 'Evaluate React, Vue, Angular, and CSS mastery with live code challenges, real-time rendering previews, and AI-powered behavioral analysis.',
        skills: ['React', 'TypeScript', 'CSS Architecture', 'Performance Optimization', 'A11y'],
        icon: '🎨',
    },
    'backend-engineer': {
        title: 'AI Interview for Backend Engineers',
        description: 'Assess API design, database optimization, system architecture, and server-side logic with real code execution in Node.js, Python, Java, and Go.',
        skills: ['Node.js', 'Python', 'SQL', 'System Design', 'Microservices'],
        icon: '⚙️',
    },
    'fullstack-developer': {
        title: 'AI Interview for Full Stack Developers',
        description: 'End-to-end skill evaluation covering frontend frameworks, backend APIs, database design, DevOps pipelines, and deployment strategies.',
        skills: ['React', 'Node.js', 'MongoDB', 'Docker', 'CI/CD'],
        icon: '🔗',
    },
    'data-scientist': {
        title: 'AI Interview for Data Scientists',
        description: 'Evaluate statistical modeling, ML pipeline design, Python data libraries, and ability to communicate insights from complex datasets.',
        skills: ['Python', 'TensorFlow', 'SQL', 'Statistics', 'Data Visualization'],
        icon: '📊',
    },
    'devops-engineer': {
        title: 'AI Interview for DevOps Engineers',
        description: 'Assess infrastructure-as-code proficiency, CI/CD pipeline design, container orchestration, and cloud platform expertise.',
        skills: ['Docker', 'Kubernetes', 'AWS/GCP', 'Terraform', 'Linux'],
        icon: '🚀',
    },
    'mobile-developer': {
        title: 'AI Interview for Mobile Developers',
        description: 'Evaluate native and cross-platform mobile development skills including React Native, Flutter, Swift, and Kotlin with real device testing scenarios.',
        skills: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'App Architecture'],
        icon: '📱',
    },
};

const ALL_TYPES = Object.entries(JOB_TYPES);

const InterviewRoomLanding = () => {
    const { jobType } = useParams();
    const data = jobType ? JOB_TYPES[jobType] : null;

    // Individual job type page
    if (data) {
        return (
            <main className={styles.page}>
                <section className={styles.hero}>
                    <span className={styles.icon}>{data.icon}</span>
                    <h1 className={styles.title}>{data.title}</h1>
                    <p className={styles.description}>{data.description}</p>
                    <div className={styles.skills}>
                        {data.skills.map((skill) => (
                            <span key={skill} className={styles.skillTag}>{skill}</span>
                        ))}
                    </div>
                    <div className={styles.cta}>
                        <Link to="/signup" className={styles.primaryBtn}>Start Free Interview</Link>
                        <Link to="/" className={styles.secondaryBtn}>← Back to Home</Link>
                    </div>
                </section>

                <section className={styles.features}>
                    <h2>What's Included in Every Froscel Interview</h2>
                    <div className={styles.featureGrid}>
                        <div className={styles.featureCard}>
                            <h3>🎥 Secure WebRTC Video</h3>
                            <p>Enterprise-grade encrypted video calls with SFU architecture for panel interviews.</p>
                        </div>
                        <div className={styles.featureCard}>
                            <h3>💻 Live Code Editor</h3>
                            <p>Monaco Editor with real-time execution in 9+ languages including Python, Java, and Go.</p>
                        </div>
                        <div className={styles.featureCard}>
                            <h3>🤖 AI Co-Interviewer</h3>
                            <p>Adaptive follow-up questions, real-time scoring, and post-interview intelligence reports.</p>
                        </div>
                        <div className={styles.featureCard}>
                            <h3>🛡️ Advanced Proctoring</h3>
                            <p>Face detection, tab monitoring, and violation timestamping for fair assessments.</p>
                        </div>
                    </div>
                </section>

                <section className={styles.otherRoles}>
                    <h2>Explore Other Roles</h2>
                    <div className={styles.roleGrid}>
                        {ALL_TYPES.filter(([key]) => key !== jobType).map(([key, role]) => (
                            <Link key={key} to={`/interview-room/${key}`} className={styles.roleCard}>
                                <span>{role.icon}</span>
                                <span>{role.title.replace('AI Interview for ', '')}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        );
    }

    // Index page listing all job types
    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <h1 className={styles.title}>AI-Powered Technical Interviews</h1>
                <p className={styles.description}>
                    Enterprise-grade interview rooms tailored for every engineering role. Live code execution, AI scoring, and bias-free assessments.
                </p>
            </section>
            <section className={styles.allRoles}>
                <div className={styles.roleGrid}>
                    {ALL_TYPES.map(([key, role]) => (
                        <Link key={key} to={`/interview-room/${key}`} className={styles.roleCardLarge}>
                            <span className={styles.roleIcon}>{role.icon}</span>
                            <h2>{role.title}</h2>
                            <p>{role.description}</p>
                            <div className={styles.skills}>
                                {role.skills.slice(0, 3).map((s) => (
                                    <span key={s} className={styles.skillTag}>{s}</span>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </main>
    );
};

export default InterviewRoomLanding;
