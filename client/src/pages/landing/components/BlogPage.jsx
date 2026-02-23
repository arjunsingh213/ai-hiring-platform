import React from 'react';
import { Link } from 'react-router-dom';
import styles from './BlogPage.module.css';

const BLOG_POSTS = [
    {
        slug: 'why-ai-interviews-reduce-hiring-bias',
        title: 'Why AI Interviews Reduce Hiring Bias by 73%',
        excerpt: 'Standardized AI-generated questions and objective scoring remove unconscious human bias from the interview process. Here\'s the data behind the shift.',
        date: '2026-02-20',
        category: 'AI & Ethics',
        readTime: '5 min',
    },
    {
        slug: 'live-code-evaluation-vs-take-home-tests',
        title: 'Live Code Evaluation vs Take-Home Tests: Which Is Better?',
        excerpt: 'We compared completion rates, candidate satisfaction, and predictive accuracy across 1,000+ technical assessments. The results may surprise you.',
        date: '2026-02-15',
        category: 'Hiring Strategy',
        readTime: '7 min',
    },
    {
        slug: 'what-is-ai-talent-passport',
        title: 'What Is an AI Talent Passport? The Future of Verified Credentials',
        excerpt: 'Resumes are outdated. Learn how AI-verified skill passports are replacing traditional CVs and what it means for candidates and recruiters.',
        date: '2026-02-10',
        category: 'Product',
        readTime: '4 min',
    },
    {
        slug: 'building-fair-proctoring-systems',
        title: 'Building Fair Proctoring Systems Without Invading Privacy',
        excerpt: 'On-device AI, minimal data collection, and transparent violation logging. How Froscel built proctoring that candidates actually trust.',
        date: '2026-02-05',
        category: 'Engineering',
        readTime: '6 min',
    },
    {
        slug: 'how-webrtc-powers-enterprise-interviews',
        title: 'How WebRTC Powers Enterprise-Grade Video Interviews',
        excerpt: 'From peer-to-peer to SFU architecture — a technical deep dive into building secure, low-latency video interview infrastructure at scale.',
        date: '2026-01-28',
        category: 'Engineering',
        readTime: '8 min',
    },
    {
        slug: 'hiring-metrics-that-matter-2026',
        title: 'The Only 5 Hiring Metrics That Matter in 2026',
        excerpt: 'Time-to-hire is dead. Quality-of-hire, candidate NPS, and three other metrics are what top engineering teams are tracking now.',
        date: '2026-01-20',
        category: 'Hiring Strategy',
        readTime: '5 min',
    },
];

const BlogPage = () => {
    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <Link to="/" className={styles.backLink}>← Back to Froscel</Link>
                <h1 className={styles.title}>Froscel Blog</h1>
                <p className={styles.subtitle}>
                    Insights on AI-powered hiring, technical interviews, and building world-class engineering teams.
                </p>
            </section>

            <section className={styles.posts}>
                <div className={styles.grid}>
                    {BLOG_POSTS.map((post) => (
                        <article key={post.slug} className={styles.postCard}>
                            <div className={styles.meta}>
                                <span className={styles.category}>{post.category}</span>
                                <span className={styles.readTime}>{post.readTime}</span>
                            </div>
                            <h2 className={styles.postTitle}>{post.title}</h2>
                            <p className={styles.excerpt}>{post.excerpt}</p>
                            <div className={styles.footer}>
                                <time className={styles.date}>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                                <span className={styles.readMore}>Coming Soon →</span>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.ctaSection}>
                <h2>Want to see Froscel in action?</h2>
                <p>Join the free beta and experience AI-powered hiring firsthand.</p>
                <Link to="/signup" className={styles.primaryBtn}>Get Started Free →</Link>
            </section>
        </main>
    );
};

export default BlogPage;
