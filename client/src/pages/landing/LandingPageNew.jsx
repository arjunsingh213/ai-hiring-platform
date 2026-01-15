import React, { useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Proof from './components/Proof';
import CTA from './components/CTA';
import Footer from './components/Footer';
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
            </main>
            <Footer />
        </div>
    );
};

export default LandingPageNew;
