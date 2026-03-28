import React, { useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Code2,
    Database,
    Layers,
    LineChart,
    Rocket,
    Smartphone,
    Video,
    TerminalSquare,
    BrainCircuit,
    ShieldCheck,
    ArrowRight
} from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import styles from './InterviewRoomLanding.module.css';

const JOB_TYPES = {
    'frontend-engineer': {
        title: 'AI Interview for Frontend Engineers',
        shortTitle: 'Frontend Engineer',
        description: 'Evaluate React, Vue, Angular, and CSS mastery with live code challenges, real-time rendering previews, and AI-powered behavioral analysis.',
        skills: ['React', 'TypeScript', 'CSS', 'Performance', 'A11y'],
        icon: Code2,
        color: '#3B82F6' // blue-500
    },
    'backend-engineer': {
        title: 'AI Interview for Backend Engineers',
        shortTitle: 'Backend Engineer',
        description: 'Assess API design, database optimization, system architecture, and server-side logic with real code execution in Node.js, Python, Java, and Go.',
        skills: ['Node.js', 'Python', 'SQL', 'System Design', 'Microservices'],
        icon: Database,
        color: '#10B981' // emerald-500
    },
    'fullstack-developer': {
        title: 'AI Interview for Full Stack Developers',
        shortTitle: 'Full Stack Developer',
        description: 'End-to-end skill evaluation covering frontend frameworks, backend APIs, database design, DevOps pipelines, and deployment strategies.',
        skills: ['React', 'Node.js', 'MongoDB', 'Docker', 'CI/CD'],
        icon: Layers,
        color: '#8B5CF6' // violet-500
    },
    'data-scientist': {
        title: 'AI Interview for Data Scientists',
        shortTitle: 'Data Scientist',
        description: 'Evaluate statistical modeling, ML pipeline design, Python data libraries, and ability to communicate insights from complex datasets.',
        skills: ['Python', 'TensorFlow', 'SQL', 'Statistics', 'Data Viz'],
        icon: LineChart,
        color: '#F59E0B' // amber-500
    },
    'devops-engineer': {
        title: 'AI Interview for DevOps Engineers',
        shortTitle: 'DevOps Engineer',
        description: 'Assess infrastructure-as-code proficiency, CI/CD pipeline design, container orchestration, and cloud platform expertise.',
        skills: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'Linux'],
        icon: Rocket,
        color: '#EF4444' // red-500
    },
    'mobile-developer': {
        title: 'AI Interview for Mobile Developers',
        shortTitle: 'Mobile Developer',
        description: 'Evaluate native and cross-platform mobile development skills including React Native, Flutter, Swift, and Kotlin with real device testing scenarios.',
        skills: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Architecture'],
        icon: Smartphone,
        color: '#06B6D4' // cyan-500
    },
};

const ALL_TYPES = Object.entries(JOB_TYPES);

const InterviewRoomLanding = () => {
    const location = useLocation();

    // Extract job type from URL path
    const jobType = useMemo(() => {
        const segments = location.pathname.split('/').filter(Boolean);
        if (segments.length >= 2 && segments[0] === 'interview-room') {
            return segments[1];
        }
        return null;
    }, [location.pathname]);
    const data = jobType ? JOB_TYPES[jobType] : null;

    // Scroll to top
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [jobType]);

    // SEO Meta Tags
    useEffect(() => {
        if (data) {
            document.title = `${data.title} | Froscel AI Hiring Platform`;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.setAttribute('content', data.description);
            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical) canonical.setAttribute('href', `https://froscel.com/interview-room/${jobType}`);
        } else {
            document.title = 'AI-Powered Interview Rooms | Froscel';
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.setAttribute('content', 'Enterprise-grade AI interview rooms for every engineering role. Live code execution, AI scoring, and bias-free assessments.');
            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical) canonical.setAttribute('href', 'https://froscel.com/interview-room');
        }
    }, [data, jobType]);

    // Force dark theme
    useEffect(() => {
        const previousTheme = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.style.backgroundColor = 'black';
        return () => {
            if (previousTheme) document.documentElement.setAttribute('data-theme', previousTheme);
            document.body.style.backgroundColor = '';
        };
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
    };

    // --- Individual Job Role Page ---
    if (data) {
        const IconComponent = data.icon;
        return (
            <div className={styles.page}>
                <Header />
                <main className={styles.mainContent}>
                    {/* Hero Section */}
                    <section className={styles.heroDetailed}>
                        <div className={styles.heroBackground}></div>
                        <motion.div
                            className={styles.heroContent}
                            initial="hidden"
                            animate="show"
                            variants={containerVariants}
                        >
                            <motion.div variants={itemVariants} className={styles.iconWrapper} style={{ backgroundColor: `${data.color}15`, color: data.color }}>
                                <IconComponent size={32} strokeWidth={1.5} />
                            </motion.div>
                            <motion.h1 variants={itemVariants} className={styles.heroTitle}>
                                {data.title.split('Interview for').map((part, i) => (
                                    i === 1 ? <span key={i}><br /><span className={styles.textGradient}>Interview for{part}</span></span> : <span key={i}>{part}</span>
                                ))}
                            </motion.h1>
                            <motion.p variants={itemVariants} className={styles.heroSubtitle}>
                                {data.description}
                            </motion.p>

                            <motion.div variants={itemVariants} className={styles.skillTagsRow}>
                                {data.skills.map(skill => (
                                    <span key={skill} className={styles.skillPill}>{skill}</span>
                                ))}
                            </motion.div>

                            <motion.div variants={itemVariants} className={styles.ctaGroup}>
                                <Link to="/signup" className={styles.btnPrimary}>
                                    Start Free Interview
                                    <ArrowRight size={18} />
                                </Link>
                                <Link to="/interview-room" className={styles.btnSecondary}>
                                    View All Roles
                                </Link>
                            </motion.div>
                        </motion.div>
                    </section>

                    {/* Features Section */}
                    <section className={styles.platformFeatures}>
                        <div className={styles.sectionHeader}>
                            <h2>Included in Every Interview</h2>
                            <p>Enterprise-grade infrastructure for technical assessments.</p>
                        </div>

                        <div className={styles.featureCardsContainer}>
                            <motion.div className={styles.featCard} whileHover={{ y: -4 }}>
                                <div className={styles.featIcon}><Video size={24} /></div>
                                <h3>WebRTC Video</h3>
                                <p>Secure, low-latency encrypted video calls with SFU architecture tailored for engineering panels.</p>
                            </motion.div>
                            <motion.div className={styles.featCard} whileHover={{ y: -4 }}>
                                <div className={styles.featIcon}><TerminalSquare size={24} /></div>
                                <h3>Live Code Engine</h3>
                                <p>Monaco-powered IDE with instant execution capabilities across 9+ modern programming languages.</p>
                            </motion.div>
                            <motion.div className={styles.featCard} whileHover={{ y: -4 }}>
                                <div className={styles.featIcon}><BrainCircuit size={24} /></div>
                                <h3>AI Co-Interviewer</h3>
                                <p>Context-aware follow-ups, objective, bias-free real-time scoring, and detailed talent extraction.</p>
                            </motion.div>
                            <motion.div className={styles.featCard} whileHover={{ y: -4 }}>
                                <div className={styles.featIcon}><ShieldCheck size={24} /></div>
                                <h3>Advanced Proctoring</h3>
                                <p>Passive integrity tracking, tab monitoring, and anomaly detection ensuring fully fair assessments.</p>
                            </motion.div>
                        </div>
                    </section>
                </main>
                <Footer />
            </div>
        );
    }

    // --- Main Directory Page ---
    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.mainContent}>
                <section className={styles.heroMain}>
                    <div className={styles.heroGlow}></div>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className={styles.heroCenter}
                    >
                        <span className={styles.eyebrow}>AI-Powered Evaluation</span>
                        <h1 className={styles.mainTitle}>
                            Technical Interviews,<br />
                            <span className={styles.textGradient}>Engineered for Scale.</span>
                        </h1>
                        <p className={styles.mainSubtitle}>
                            Select a role to explore enterprise-grade interview rooms.
                            Built with live code execution, objective AI scoring, and verifiable talent passports.
                        </p>
                    </motion.div>
                </section>

                <section className={styles.rolesGridSection}>
                    <motion.div
                        className={styles.rolesGridContainer}
                        initial="hidden"
                        animate="show"
                        variants={containerVariants}
                    >
                        {ALL_TYPES.map(([key, role]) => {
                            const IconComp = role.icon;
                            return (
                                <motion.div key={key} variants={itemVariants}>
                                    <Link to={`/interview-room/${key}`} className={styles.directoryCard}>
                                        <div className={styles.cardHeader}>
                                            <div className={styles.cardIconBox} style={{ color: role.color, backgroundColor: `${role.color}10` }}>
                                                <IconComp size={28} strokeWidth={1.5} />
                                            </div>
                                            <div className={styles.cardArrow}>
                                                <ArrowRight size={20} />
                                            </div>
                                        </div>
                                        <div className={styles.cardBody}>
                                            <h2 className={styles.cardTitle}>{role.shortTitle}</h2>
                                            <p className={styles.cardDesc}>{role.description}</p>
                                        </div>
                                        <div className={styles.cardFooter}>
                                            {role.skills.slice(0, 3).map(skill => (
                                                <span key={skill} className={styles.miniSkill}>{skill}</span>
                                            ))}
                                            {role.skills.length > 3 && (
                                                <span className={styles.miniSkill}>+{role.skills.length - 3}</span>
                                            )}
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default InterviewRoomLanding;
