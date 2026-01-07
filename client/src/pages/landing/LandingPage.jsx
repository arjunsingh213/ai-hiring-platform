import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Typed from 'typed.js';
import './LandingPage.css';

// Import assets
import heroDashboard from './assets/hero-dashboard-1600x900.webp';
import passportSnapshot from './assets/passport-snapshot-1200x800.webp';
import recruiterReport from './assets/recruiter-report-1200x700.webp';
import codeIde from './assets/code-ide-1400x900.webp';
import workSample from './assets/work-sample-800x600.webp';
import avatar1 from './assets/avatars-set-1-256x256.webp';
import avatar2 from './assets/avatars-set-2-256x256.webp';
import avatar3 from './assets/avatars-set-3-256x256.webp';
import avatar4 from './assets/avatars-set-4-256x256.webp';
import avatar5 from './assets/avatars-set-5-256x256.webp';

gsap.registerPlugin(ScrollTrigger);

const LandingPage = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const typedRef = useRef(null);
    const heroRef = useRef(null);
    const dashboardRef = useRef(null);

    // Force light theme on landing page
    useEffect(() => {
        const previousTheme = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', 'light');

        return () => {
            if (previousTheme) {
                document.documentElement.setAttribute('data-theme', previousTheme);
            }
        };
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Typed.js initialization
    useEffect(() => {
        const typed = new Typed(typedRef.current, {
            strings: [
                'AI-powered interviews',
                'Verified talent profiles',
                'Smart job matching',
                'Faster hiring process'
            ],
            typeSpeed: 80,
            backSpeed: 50,
            backDelay: 2000,
            loop: true,
            smartBackspace: true,
        });

        return () => typed.destroy();
    }, []);

    // GSAP animations
    useEffect(() => {
        // Initial state for reveal-up elements
        gsap.set('.reveal-up', {
            opacity: 0,
            y: 60,
        });

        // Dashboard 3D perspective animation - Pixaai style
        if (dashboardRef.current) {
            // Set initial state with CSS variables for perspective
            gsap.set(dashboardRef.current, {
                transformPerspective: 1200,
                rotateX: 70,
                scale: 0.8,
                y: 50,
            });

            // Animate on scroll - straightens the tilted dashboard
            gsap.to(dashboardRef.current, {
                rotateX: 0,
                scale: 1,
                y: 0,
                ease: 'none',
                scrollTrigger: {
                    trigger: heroRef.current,
                    start: window.innerWidth > 1024 ? 'top 95%' : 'top 70%',
                    end: 'bottom bottom',
                    scrub: 1,
                }
            });
        }

        // Reveal animations for each section
        const sections = document.querySelectorAll('section');
        sections.forEach((section) => {
            const revealElements = section.querySelectorAll('.reveal-up');

            gsap.to(revealElements, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.15,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: section,
                    start: 'top 80%',
                    end: 'top 50%',
                    toggleActions: 'play none none reverse',
                }
            });
        });

        return () => {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        };
    }, []);

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMobileMenuOpen(false);
    };

    return (
        <div className="landing-page">
            {/* Navigation */}
            <header className={`landing-nav ${scrolled ? 'nav-scrolled' : ''}`}>
                <div className="nav-container">
                    <Link to="/" className="nav-logo">
                        <span className="logo-text">HireAI</span>
                    </Link>

                    <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                        <a onClick={() => scrollToSection('hero')} className="nav-link">Home</a>
                        <a onClick={() => scrollToSection('features')} className="nav-link">Features</a>
                        <a onClick={() => scrollToSection('benefits')} className="nav-link">Benefits</a>
                        <a onClick={() => scrollToSection('how-it-works')} className="nav-link">How It Works</a>

                        <div className="nav-actions">
                            <Link to="/login" className="nav-link login-link">Sign In</Link>
                            <Link to="/onboarding/role-selection" className="btn-get-started">
                                <span>Get Started</span>
                                <i className="bi bi-arrow-right"></i>
                            </Link>
                        </div>
                    </nav>

                    <button
                        className="mobile-menu-btn"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <i className={`bi ${mobileMenuOpen ? 'bi-x' : 'bi-list'}`}></i>
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section id="hero" className="hero-section" ref={heroRef}>
                <div className="purple-bg-grad hero-grad-1"></div>
                <div className="purple-bg-grad hero-grad-2"></div>

                <div className="hero-content">
                    <h1 className="reveal-up hero-title">
                        <span className="hero-title-bold">Revolutionize Your Hiring</span>
                        <br />
                        <span className="hero-title-light">with AI-Powered Interviews</span>
                    </h1>

                    <p className="reveal-up hero-subtitle">
                        <span ref={typedRef}></span>
                    </p>

                    <p className="reveal-up hero-description">
                        The all-in-one AI platform for job seekers and recruiters. Automated interviews,
                        verified talent profiles, and smart matching to find the perfect fit.
                    </p>

                    <div className="reveal-up hero-cta">
                        <Link to="/onboarding/role-selection" className="btn-primary-lg">
                            <span>Start Free</span>
                            <i className="bi bi-arrow-right"></i>
                        </Link>
                        <button onClick={() => scrollToSection('how-it-works')} className="btn-outline-lg">
                            <i className="bi bi-play-circle"></i>
                            <span>See How It Works</span>
                        </button>
                    </div>

                    {/* Social Proof */}
                    <div className="reveal-up social-proof">
                        <div className="avatar-stack">
                            <img src={avatar1} alt="User" className="avatar" />
                            <img src={avatar2} alt="User" className="avatar" />
                            <img src={avatar3} alt="User" className="avatar" />
                            <img src={avatar4} alt="User" className="avatar" />
                            <img src={avatar5} alt="User" className="avatar" />
                        </div>
                        <div className="social-proof-text">
                            <span className="count">10,000+</span>
                            <span className="label">professionals trust HireAI</span>
                        </div>
                    </div>
                </div>

                {/* Hero Dashboard Preview */}
                <div className="reveal-up dashboard-container">
                    <div className="animated-border dashboard-wrapper" ref={dashboardRef}>
                        <img
                            src={heroDashboard}
                            alt="HireAI Platform Dashboard"
                            className="dashboard-image"
                        />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="section-container">
                    <div className="reveal-up section-header">
                        <h2 className="section-title">
                            <span className="title-bold">Experience the Power</span>
                            <br />
                            <span className="title-light">of AI-Driven Hiring</span>
                        </h2>
                        <p className="section-subtitle">
                            Everything you need to streamline your hiring process or land your dream job
                        </p>
                    </div>

                    <div className="features-grid">
                        <div className="reveal-up feature-card">
                            <div className="feature-image">
                                <img src={codeIde} alt="AI Interviews" />
                            </div>
                            <h3>AI-Powered Interviews</h3>
                            <p>
                                Intelligent interviews that adapt to each candidate's background.
                                Technical, HR, and behavioral assessments powered by advanced AI.
                            </p>
                            <a href="#" className="feature-link">
                                <span>Learn more</span>
                                <i className="bi bi-arrow-right"></i>
                            </a>
                        </div>

                        <div className="reveal-up feature-card">
                            <div className="feature-image">
                                <img src={passportSnapshot} alt="AI Talent Passport" />
                            </div>
                            <h3>AI Talent Passport</h3>
                            <p>
                                Your verified digital credential showcasing skills, interview scores,
                                and achievements. Stand out to recruiters with proof of competence.
                            </p>
                            <a href="#" className="feature-link">
                                <span>Learn more</span>
                                <i className="bi bi-arrow-right"></i>
                            </a>
                        </div>

                        <div className="reveal-up feature-card">
                            <div className="feature-image">
                                <img src={recruiterReport} alt="Recruiter Tools" />
                            </div>
                            <h3>Recruiter Dashboard</h3>
                            <p>
                                Powerful analytics, candidate scoring, and AI-matched talent.
                                Reduce time-to-hire by 80% with intelligent automation.
                            </p>
                            <a href="#" className="feature-link">
                                <span>Learn more</span>
                                <i className="bi bi-arrow-right"></i>
                            </a>
                        </div>
                    </div>

                    {/* Wide Feature Card */}
                    <div className="reveal-up feature-card-wide">
                        <div className="wide-card-content">
                            <h3>Smart Job Matching</h3>
                            <p>
                                Our AI analyzes your skills, experience, and interview performance
                                to recommend the perfect roles. No more endless scrolling—get matched
                                with opportunities that fit you.
                            </p>
                            <Link to="/onboarding/role-selection" className="feature-link">
                                <span>Start matching</span>
                                <i className="bi bi-arrow-right"></i>
                            </Link>
                        </div>
                        <div className="wide-card-image">
                            <img src={workSample} alt="Job Matching" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section id="benefits" className="benefits-section">
                <div className="section-container">
                    <div className="benefits-layout">
                        <div className="benefits-sticky">
                            <h2 className="reveal-up benefits-title">
                                Why Choose HireAI?
                            </h2>
                            <p className="reveal-up benefits-subtitle">
                                Join thousands of professionals transforming their careers and hiring processes
                            </p>
                            <Link to="/onboarding/role-selection" className="reveal-up btn-outline-dark">
                                Get Started Free
                            </Link>
                        </div>

                        <div className="benefits-list">
                            <div className="reveal-up benefit-item">
                                <div className="benefit-icon">
                                    <i className="bi bi-robot"></i>
                                </div>
                                <div className="benefit-content">
                                    <h4>AI Interview Engine</h4>
                                    <p>
                                        Advanced AI generates personalized questions based on your resume
                                        and role requirements. Real-time evaluation and instant feedback.
                                    </p>
                                </div>
                            </div>

                            <div className="reveal-up benefit-item">
                                <div className="benefit-icon">
                                    <i className="bi bi-shield-check"></i>
                                </div>
                                <div className="benefit-content">
                                    <h4>Verified Profiles</h4>
                                    <p>
                                        Every candidate is verified through AI proctoring and skill assessments.
                                        Build trust with authentic, verified credentials.
                                    </p>
                                </div>
                            </div>

                            <div className="reveal-up benefit-item">
                                <div className="benefit-icon">
                                    <i className="bi bi-graph-up-arrow"></i>
                                </div>
                                <div className="benefit-content">
                                    <h4>Data-Driven Insights</h4>
                                    <p>
                                        Comprehensive analytics on interview performance, skill gaps,
                                        and improvement areas. Make informed hiring decisions.
                                    </p>
                                </div>
                            </div>

                            <div className="reveal-up benefit-item">
                                <div className="benefit-icon">
                                    <i className="bi bi-lightning-charge"></i>
                                </div>
                                <div className="benefit-content">
                                    <h4>80% Faster Hiring</h4>
                                    <p>
                                        Automate screening, interviews, and evaluations.
                                        Reduce time-to-hire from weeks to days with AI efficiency.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="how-it-works-section">
                <div className="section-container">
                    <div className="reveal-up section-header">
                        <h2 className="section-title">
                            <span className="title-bold">How It Works</span>
                        </h2>
                        <p className="section-subtitle">
                            Get started in minutes with our streamlined process
                        </p>
                    </div>

                    <div className="steps-grid">
                        <div className="reveal-up step-card">
                            <div className="step-number">01</div>
                            <h3>Create Your Profile</h3>
                            <p>Upload your resume and let AI extract your skills, experience, and qualifications automatically.</p>
                        </div>
                        <div className="reveal-up step-card">
                            <div className="step-number">02</div>
                            <h3>Complete AI Interview</h3>
                            <p>Take a personalized AI interview that evaluates your technical and soft skills in real-time.</p>
                        </div>
                        <div className="reveal-up step-card">
                            <div className="step-number">03</div>
                            <h3>Get Your Talent Passport</h3>
                            <p>Receive your verified AI Talent Passport with scores and credentials to share with recruiters.</p>
                        </div>
                        <div className="reveal-up step-card">
                            <div className="step-number">04</div>
                            <h3>Get Matched & Hired</h3>
                            <p>Our AI matches you with perfect opportunities. Apply, interview, and get hired faster.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="purple-bg-grad cta-grad"></div>
                <div className="section-container">
                    <div className="reveal-up cta-content">
                        <h2>Ready to Transform Your Hiring?</h2>
                        <p>Join 10,000+ professionals using AI to make better hiring decisions</p>
                        <div className="cta-buttons">
                            <Link to="/onboarding/role-selection" className="btn-primary-lg">
                                <span>Start Free Today</span>
                                <i className="bi bi-arrow-right"></i>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-container">
                    <div className="footer-main">
                        <div className="footer-brand">
                            <span className="logo-text">HireAI</span>
                            <p>Revolutionizing hiring with AI-powered interviews and verified talent profiles.</p>
                        </div>
                        <div className="footer-links-grid">
                            <div className="footer-column">
                                <h5>Platform</h5>
                                <a href="#features">Features</a>
                                <a href="#benefits">Benefits</a>
                                <a href="#how-it-works">How It Works</a>
                            </div>
                            <div className="footer-column">
                                <h5>Company</h5>
                                <a href="#">About Us</a>
                                <a href="#">Careers</a>
                                <a href="#">Contact</a>
                            </div>
                            <div className="footer-column">
                                <h5>Legal</h5>
                                <a href="#">Privacy Policy</a>
                                <a href="#">Terms of Service</a>
                                <a href="#">Cookie Policy</a>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; 2024 HireAI. All rights reserved.</p>
                        <div className="footer-social">
                            <a href="#"><i className="bi bi-linkedin"></i></a>
                            <a href="#"><i className="bi bi-twitter-x"></i></a>
                            <a href="#"><i className="bi bi-github"></i></a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
