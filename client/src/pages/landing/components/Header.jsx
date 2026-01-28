import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

// Import Froscel logo
import froscelLogo from '../../../assets/froscel-logo.png';

const Header = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { label: 'Jobs', href: '/jobs' },
        { label: 'Features', href: '#features' },
        { label: 'Why Us', href: '#proof' },
        { label: 'Contact', href: '#contact' },
    ];

    return (
        <motion.header
            className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            <div className={styles.container}>
                {/* Logo */}
                <Link to="/" className={styles.logo}>
                    <img
                        src={froscelLogo}
                        alt="Froscel Logo"
                        className={styles.logoIcon}
                    />
                    <span className={styles.logoText}>Froscel</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            className={styles.navLink}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                {/* Auth Buttons */}
                <div className={styles.auth}>
                    <Link to="/login" className={styles.loginBtn}>
                        Log in
                    </Link>
                    <Link to="/signup" className={styles.signupBtn}>
                        Get Started
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className={styles.mobileMenuBtn}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={`${styles.hamburger} ${isMobileMenuOpen ? styles.open : ''}`} />
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <motion.div
                    className={styles.mobileMenu}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {navItems.map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            className={styles.mobileNavLink}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {item.label}
                        </a>
                    ))}
                    <div className={styles.mobileAuth}>
                        <Link to="/login" className={styles.mobileLoginBtn}>
                            Log in
                        </Link>
                        <Link to="/signup" className={styles.mobileSignupBtn}>
                            Get Started
                        </Link>
                    </div>
                </motion.div>
            )}
        </motion.header>
    );
};

export default Header;
