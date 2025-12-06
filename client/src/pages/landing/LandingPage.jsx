import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
                <div className="container nav-container">
                    <div className="nav-logo">
                        <span className="logo-gradient">AI Interview</span>
                    </div>
                    <div className="nav-links">
                        <a onClick={() => scrollToSection('home')} className="nav-link">Home</a>
                        <a onClick={() => scrollToSection('about')} className="nav-link">About</a>
                        <a onClick={() => scrollToSection('services')} className="nav-link">Services</a>
                        <Link to="/role-selection" className="btn btn-primary btn-sm">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="home" className="hero">
                <div className="hero-background">
                    <div className="gradient-orb orb-1"></div>
                    <div className="gradient-orb orb-2"></div>
                    <div className="gradient-orb orb-3"></div>
                </div>
                <div className="container hero-content">
                    <div className="hero-text animate-fade-in">
                        <h1 className="hero-title">
                            Crack AI Interviews.<br />
                            Get Noticed.<br />
                            <span className="gradient-text">Get Hired.</span>
                        </h1>
                        <p className="hero-subtitle">
                            AI-powered interview platform connecting top talent with leading recruiters.
                            Practice with intelligent AI, get verified, and land your dream job.
                        </p>
                        <div className="hero-cta">
                            <Link to="/role-selection" className="btn btn-primary btn-lg">
                                Get Started
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Link>
                            <button onClick={() => scrollToSection('services')} className="btn btn-outline btn-lg">
                                Explore Services
                            </button>
                        </div>
                        <div className="hero-stats">
                            <div className="stat">
                                <div className="stat-number">10K+</div>
                                <div className="stat-label">Job Seekers</div>
                            </div>
                            <div className="stat">
                                <div className="stat-number">500+</div>
                                <div className="stat-label">Recruiters</div>
                            </div>
                            <div className="stat">
                                <div className="stat-number">95%</div>
                                <div className="stat-label">Success Rate</div>
                            </div>
                        </div>
                    </div>
                    <div className="hero-visual animate-slide-in">
                        <div className="visual-card card-glass">
                            <div className="visual-header">
                                <div className="visual-dot"></div>
                                <div className="visual-dot"></div>
                                <div className="visual-dot"></div>
                            </div>
                            <div className="visual-content">
                                <div className="code-line">
                                    <span className="code-keyword">const</span> interview = <span className="code-string">"AI-Powered"</span>;
                                </div>
                                <div className="code-line">
                                    <span className="code-keyword">const</span> result = <span className="code-function">crackInterview</span>();
                                </div>
                                <div className="code-line">
                                    <span className="code-comment">// Get hired faster ⚡</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="about">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">About Our Platform</h2>
                        <p className="section-subtitle">Revolutionizing the hiring process with AI technology</p>
                    </div>
                    <div className="about-grid">
                        <div className="about-card card">
                            <div className="about-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3>AI-Powered Interview Engine</h3>
                            <p>Advanced AI generates personalized interview questions based on your resume and experience, providing real-time evaluation and feedback.</p>
                        </div>
                        <div className="about-card card">
                            <div className="about-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3>Smart Resume Parsing</h3>
                            <p>Our AI automatically extracts skills, experience, and qualifications from your resume to create a comprehensive profile.</p>
                        </div>
                        <div className="about-card card">
                            <div className="about-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3>Two-Sided Marketplace</h3>
                            <p>Connect job seekers with recruiters in a verified ecosystem. Faster hiring with AI-matched candidates and verified profiles.</p>
                        </div>
                        <div className="about-card card">
                            <div className="about-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                    <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3>Verified Profiles</h3>
                            <p>AI authenticity checks ensure genuine candidates and companies. Build trust with verified credentials and interview scores.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section id="services" className="services">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Platform Features</h2>
                        <p className="section-subtitle">Everything you need to succeed in your job search or hiring process</p>
                    </div>
                    <div className="services-grid">
                        <div className="service-card card-glass">
                            <div className="service-number">01</div>
                            <h3>AI Resume Parsing</h3>
                            <p>Upload your resume and let our AI extract skills, experience, and qualifications automatically. Get instant insights and suggestions.</p>
                            <ul className="service-features">
                                <li>PDF & DOCX support</li>
                                <li>Skill extraction</li>
                                <li>Experience analysis</li>
                                <li>AI recommendations</li>
                            </ul>
                        </div>
                        <div className="service-card card-glass">
                            <div className="service-number">02</div>
                            <h3>AI Interview: Technical + HR</h3>
                            <p>Practice with our AI interviewer. Get real-time questions based on your resume, with instant feedback and scoring.</p>
                            <ul className="service-features">
                                <li>Video interview</li>
                                <li>Real-time evaluation</li>
                                <li>Proctoring system</li>
                                <li>Detailed feedback</li>
                            </ul>
                        </div>
                        <div className="service-card card-glass">
                            <div className="service-number">03</div>
                            <h3>Job Matching & Recommendations</h3>
                            <p>AI-powered job recommendations based on your skills, experience, and interview performance. Find the perfect match.</p>
                            <ul className="service-features">
                                <li>Smart matching</li>
                                <li>Personalized alerts</li>
                                <li>One-click apply</li>
                                <li>Application tracking</li>
                            </ul>
                        </div>
                        <div className="service-card card-glass">
                            <div className="service-number">04</div>
                            <h3>Recruiter Dashboard</h3>
                            <p>Powerful tools for recruiters to find, evaluate, and hire top talent. AI-assisted candidate search and interview management.</p>
                            <ul className="service-features">
                                <li>Candidate search</li>
                                <li>Interview scores</li>
                                <li>Applicant tracking</li>
                                <li>Analytics dashboard</li>
                            </ul>
                        </div>
                        <div className="service-card card-glass">
                            <div className="service-number">05</div>
                            <h3>Real-time Notifications</h3>
                            <p>Stay updated with job alerts, interview reminders, and application status changes. Never miss an opportunity.</p>
                            <ul className="service-features">
                                <li>Job alerts</li>
                                <li>Interview reminders</li>
                                <li>Status updates</li>
                                <li>Motivational tips</li>
                            </ul>
                        </div>
                        <div className="service-card card-glass">
                            <div className="service-number">06</div>
                            <h3>Job Application Analytics</h3>
                            <p>Track your application progress, interview performance, and get insights to improve your success rate.</p>
                            <ul className="service-features">
                                <li>Application tracking</li>
                                <li>Performance metrics</li>
                                <li>Success insights</li>
                                <li>Improvement tips</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta">
                <div className="container cta-content">
                    <h2>Ready to Transform Your Career?</h2>
                    <p>Join thousands of job seekers and recruiters using AI to make better hiring decisions.</p>
                    <Link to="/role-selection" className="btn btn-primary btn-lg">
                        Get Started Now
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="container footer-content">
                    <div className="footer-section">
                        <h4 className="logo-gradient">AI Interview</h4>
                        <p>Revolutionizing hiring with AI technology.</p>
                    </div>
                    <div className="footer-section">
                        <h5>Platform</h5>
                        <a href="#home">Home</a>
                        <a href="#about">About</a>
                        <a href="#services">Services</a>
                    </div>
                    <div className="footer-section">
                        <h5>Support</h5>
                        <a href="#">Help Center</a>
                        <a href="#">Privacy Policy</a>
                        <a href="#">Terms of Service</a>
                    </div>
                    <div className="footer-section">
                        <h5>Connect</h5>
                        <a href="#">LinkedIn</a>
                        <a href="#">Twitter</a>
                        <a href="#">GitHub</a>
                    </div>
                </div>
                <div className="footer-bottom">
                    <div className="container">
                        <p>&copy; 2024 AI Interview Platform. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
