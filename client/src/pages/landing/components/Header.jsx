import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { headerVariant, buttonMicro, EASE_OUT } from '../animations/animations';
import styles from './Header.module.css';

const Header = () => {
    return (
        <motion.header
            className={styles.header}
            variants={headerVariant}
            initial="hidden"
            animate="show"
        >
            <div className={styles.container}>
                {/* Logo */}
                <Link to="/" className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                            <rect width="32" height="32" rx="8" fill="url(#logoGradient)" />
                            <path d="M9 16L14 21L23 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <defs>
                                <linearGradient id="logoGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#0090FF" />
                                    <stop offset="1" stopColor="#4CC8FF" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <span className={styles.logoText}>AI Interview</span>
                </Link>

                {/* Navigation */}
                <nav className={styles.nav} aria-label="Main navigation">
                    <Link to="/jobs" className={styles.navLink}>Jobs</Link>
                    <a href="#features" className={styles.navLink}>Features</a>
                    <a href="#proof" className={styles.navLink}>Why Us</a>
                </nav>

                {/* Auth Buttons */}
                <div className={styles.authButtons}>
                    <Link to="/login" className={styles.loginBtn}>Log in</Link>
                    <motion.div {...buttonMicro}>
                        <Link to="/signup" className={styles.signupBtn}>
                            Get Started
                        </Link>
                    </motion.div>
                </div>
            </div>
        </motion.header>
    );
};

export default Header;
