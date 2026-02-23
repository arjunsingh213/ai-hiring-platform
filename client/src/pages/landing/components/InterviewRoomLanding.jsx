import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './Header';
import Footer from './Footer';
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

    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [jobType]);

    // Force light theme
    useEffect(() => {
        const previousTheme = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', 'light');
        return () => {
            if (previousTheme) document.documentElement.setAttribute('data-theme', previousTheme);
        };
    }, []);

    // Individual job type page
    if (data) {
        return (
            <div className={styles.page}>
                <Header />
                <main>
                    <section className={styles.hero}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <span className={styles.icon}>{data.icon}</span>
                            <h1 className={styles.title}>
                                {data.title.split('Interview for').map((part, i) => (
                                    i === 1 ? <><br /><span className={styles.gradient}>Interview for {part}</span></> : part
                                ))}
                            </h1>
                            <p className={styles.description}>{data.description}</p>
                            <div className={styles.skills}>
                                {data.skills.map((skill) => (
                                    <span key={skill} className={styles.skillTag}>{skill}</span>
                                ))}
                            </div>
                            <div className={styles.cta}>
                                <Link to="/signup" className={styles.primaryBtn}>
                                    Start Free Interview
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '8px' }}>
                                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </Link>
                                <Link to="/" className={styles.secondaryBtn}>← Back to Home</Link>
                            </div>
                        </motion.div>
                    </section>

                    <section className={styles.features}>
                        <h2>What's Included in Every <span className={styles.gradient}>Froscel Interview</span></h2>
                        <div className={styles.featureGrid}>
                            <motion.div className={styles.featureCard} whileHover={{ y: -5 }}>
                                <h3>🎥 Secure WebRTC Video</h3>
                                <p>Enterprise-grade encrypted video calls with SFU architecture for panel interviews.</p>
                            </motion.div>
                            <motion.div className={styles.featureCard} whileHover={{ y: -5 }}>
                                <h3>💻 Live Code Editor</h3>
                                <p>Monaco Editor with real-time execution in 9+ languages including Python, Java, and Go.</p>
                            </motion.div>
                            <motion.div className={styles.featureCard} whileHover={{ y: -5 }}>
                                <h3>🤖 AI Co-Interviewer</h3>
                                <p>Adaptive follow-up questions, real-time scoring, and post-interview intelligence reports.</p>
                            </motion.div>
                            <motion.div className={styles.featureCard} whileHover={{ y: -5 }}>
                                <h3>🛡️ Advanced Proctoring</h3>
                                <p>Face detection, tab monitoring, and violation timestamping for fair assessments.</p>
                            </motion.div>
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
                <Footer />
            </div>
        );
    }

    // Index page listing all job types
    return (
        <div className={styles.page}>
            <Header />
            <main>
                <section className={styles.hero}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className={styles.title}>
                            AI-Powered <br />
                            <span className={styles.gradient}>Technical Interviews</span>
                        </h1>
                        <p className={styles.description}>
                            Enterprise-grade interview rooms tailored for every engineering role. Live code execution, AI scoring, and bias-free assessments.
                        </p>
                    </motion.div>
                </section>
                <section className={styles.allRoles}>
                    <div className={styles.roleGrid}>
                        {ALL_TYPES.map(([key, role], index) => (
                            <motion.div
                                key={key}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link to={`/interview-room/${key}`} className={styles.roleCardLarge}>
                                    <span className={styles.roleIcon}>{role.icon}</span>
                                    <h2>{role.title}</h2>
                                    <p>{role.description}</p>
                                    <div className={styles.skills}>
                                        {role.skills.slice(0, 3).map((s) => (
                                            <span key={s} className={styles.skillTag}>{s}</span>
                                        ))}
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default InterviewRoomLanding;
