import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Code2, Database, Layers, TerminalSquare, Briefcase, MapPin, Clock, Loader2 } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import api from '../../../services/api';
import styles from './InterviewRoomLanding.module.css'; // Reusing the same premium dark styles

const getRoleStyling = (title = '', domain = '') => {
    const text = (title + ' ' + domain).toLowerCase();
    if (text.includes('frontend') || text.includes('ui') || text.includes('react')) return { icon: Code2, color: '#3B82F6' };
    if (text.includes('data') || text.includes('ml') || text.includes('machine learning') || text.includes('ai')) return { icon: Database, color: '#10B981' };
    if (text.includes('design') || text.includes('product') || text.includes('ux')) return { icon: Layers, color: '#8B5CF6' };
    if (text.includes('backend') || text.includes('system') || text.includes('cloud')) return { icon: TerminalSquare, color: '#EF4444' };
    return { icon: Briefcase, color: '#F59E0B' }; // default amber
};

const PublicJobsPage = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Scroll to top
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Fetch live jobs
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await api.get('/jobs');
                if (response.success && response.data) {
                    setJobs(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch jobs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    // SEO Meta Tags
    useEffect(() => {
        document.title = 'Careers | Froscel AI Hiring Platform';
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', 'Explore our open positions and join the team building the world\'s most advanced AI-powered technical hiring platform.');
    }, []);

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
                        <span className={styles.eyebrow}>Join The Mission</span>
                        <h1 className={styles.mainTitle}>
                            Build the Future of<br />
                            <span className={styles.textGradient}>Technical Hiring.</span>
                        </h1>
                        <p className={styles.mainSubtitle}>
                            We are looking for exceptional engineers, designers, and operators to help us 
                            replace obsolete coding interviews with predictive artificial intelligence.
                        </p>
                    </motion.div>
                </section>

                <section className={styles.rolesGridSection}>
                    <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 mb-12">
                        <h2 className="text-2xl md:text-3xl font-heading italic text-white tracking-tight">Open Roles</h2>
                    </div>
                    
                    {loading ? (
                        <div className="w-full flex items-center justify-center py-24">
                            <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                        </div>
                    ) : (
                        <motion.div
                            className={styles.rolesGridContainer}
                            initial="hidden"
                            animate="show"
                            variants={containerVariants}
                        >
                            {jobs.map((job) => {
                                const { icon: IconComp, color } = getRoleStyling(job.title, job.domain);
                                const companyName = job.recruiterId?.profile?.company?.name || job.company?.name || 'Company';
                                const location = job.jobDetails?.location || 'Remote';
                                const type = job.jobDetails?.type || 'Full-time';
                                // Simple text extraction for description
                                const plainDesc = job.description 
                                    ? job.description.replace(/<[^>]+>/g, '').substring(0, 120) + '...'
                                    : 'Join our cutting-edge team to build the future of AI-powered technical hiring.';

                                return (
                                    <motion.div key={job._id} variants={itemVariants} className="relative group">
                                        <div className={`${styles.directoryCard} pb-20`}> {/* Extra padding for button */}
                                            <div className={styles.cardHeader}>
                                                <div className={styles.cardIconBox} style={{ color: color, backgroundColor: `${color}10` }}>
                                                    <IconComp size={28} strokeWidth={1.5} />
                                                </div>
                                                <div className={styles.cardArrow}>
                                                    <ArrowRight size={20} />
                                                </div>
                                            </div>
                                            <div className={styles.cardBody}>
                                                <h2 className={styles.cardTitle}>{job.title}</h2>
                                                <p className={styles.cardDesc}>{plainDesc}</p>
                                            </div>
                                            <div className={styles.cardFooter}>
                                                <span className={styles.miniSkill}><Briefcase size={12} className="inline mr-1" /> {companyName}</span>
                                                <span className={styles.miniSkill}><MapPin size={12} className="inline mr-1" /> {location}</span>
                                                <span className={styles.miniSkill}><Clock size={12} className="inline mr-1" /> {type}</span>
                                            </div>
                                            
                                            {/* Explicit Apply Button routing through JobShareRedirect to handle auth/routing purely natively */}
                                            <div className="absolute bottom-6 left-6 right-6 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                                                <Link 
                                                    to={`/jobs/${job._id}`}
                                                    className="w-full block text-center py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors shadow-lg"
                                                >
                                                    Apply Now
                                                </Link>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            
                            {jobs.length === 0 && !loading && (
                                <div className="w-full col-span-full py-24 text-center border border-white/5 rounded-2xl bg-white/5">
                                    <p className="text-white/60 font-body">No open roles available right now. Check back later!</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default PublicJobsPage;
