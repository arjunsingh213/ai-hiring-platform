import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Proof from './components/Proof';
import CTA from './components/CTA';
import Footer from './components/Footer';
import ContactForm from '../../components/ContactForm';
import styles from './LandingPageNew.module.css';

/**
 * LandingPageNew - Framer-Motion powered landing page for AI Interview Platform
 * 
 * This is a purely presentational component with no backend calls.
 * All CTAs link to existing routes: /signup, /demo, /jobs
 * 
 * Uses framer-motion for animations with exact timing constants
 * from animations/animations.js
 * 
 * To use this landing page, add a route in App.jsx:
 * import LandingPageNew from './pages/Landing/LandingPageNew';
 * <Route path="/landing" element={<LandingPageNew />} />
 */
const LandingPageNew = () => {
    const navigate = useNavigate();

    // Check if user is logged in and session is still valid (24 hours)
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        const loginTimestamp = localStorage.getItem('loginTimestamp');

        if (token && userId && userRole) {
            // Check if session is still valid (24 hours = 86400000 ms)
            const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
            const now = Date.now();
            const loginTime = parseInt(loginTimestamp, 10) || 0;

            if (now - loginTime < sessionDuration) {
                // Session still valid, redirect to dashboard
                if (userRole === 'jobseeker') {
                    navigate('/jobseeker/home', { replace: true });
                } else if (userRole === 'recruiter') {
                    navigate('/recruiter/home', { replace: true });
                } else if (userRole === 'admin') {
                    navigate('/admin/dashboard', { replace: true });
                }
            } else {
                // Session expired, clear storage
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                localStorage.removeItem('userRole');
                localStorage.removeItem('loginTimestamp');
            }
        }
    }, [navigate]);

    // Force light theme on landing page
    useEffect(() => {
        const previousTheme = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', 'light');

        return () => {
            // Restore previous theme when leaving landing page
            if (previousTheme) {
                document.documentElement.setAttribute('data-theme', previousTheme);
            }
        };
    }, []);

    return (
        <div className={styles.landing}>
            <Header />
            <main>
                <Hero />
                <Features />
                <Proof />
                <CTA />
                <section id="contact" className={styles.section} style={{ padding: '80px 20px', backgroundColor: '#f9fafb' }}>
                    <div className={styles.container} style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', color: '#111827' }}>
                                Get In Touch
                            </h2>
                            <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
                                Have questions? We're here to help.
                            </p>
                        </div>
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <ContactForm />
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default LandingPageNew;

