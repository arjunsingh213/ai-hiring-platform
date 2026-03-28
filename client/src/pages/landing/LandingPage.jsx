import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Lenis from 'lenis';
import Hls from 'hls.js';
import { ArrowUpRight, Play, Zap, CheckCircle, BarChart3, Shield } from 'lucide-react';
import LandingLoader from './components/LandingLoader';
import ContactForm from '../../components/ContactForm';
import { TextScrollAnimation } from '../../components/ui/text-scroll-animation';
import { BGPattern } from '../../components/ui/bg-pattern';
import { ShareholderReports as FeatureCarousel } from '../../components/ui/carousel';
import './LandingPage.css';

// ----------------------------------------------------
// BlurText Component
// ----------------------------------------------------
const BlurText = ({ text, className }) => {
  const words = text.split(' ');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div ref={ref} className={className} style={{ display: 'inline-block' }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ filter: 'blur(10px)', opacity: 0, y: 50 }}
          animate={isInView ? { filter: 'blur(0px)', opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.35, delay: i * 0.1 }}
          style={{ display: 'inline-block', marginRight: '0.25em' }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
};

// ----------------------------------------------------
// HLS Video Component
// ----------------------------------------------------
const HlsVideo = ({ src, poster, className, style }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    let hls;
    if (Hls.isSupported() && videoRef.current) {
      hls = new Hls({ enableWorker: false });
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
    } else if (videoRef.current && videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = src;
    }
    return () => {
      if (hls) hls.destroy();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={style}
      poster={poster}
      muted
      playsInline
      loop
      autoPlay
    />
  );
};

// ----------------------------------------------------
// ScrollThesis Component
// ----------------------------------------------------
const ScrollThesis = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Point 1: Fades in (0-0.2), Holds (0.2-0.4), and pushes UP blending into Point 2 (0.4-0.55)
  const opacity1 = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.55], [0, 1, 1, 0]);
  const y1 = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.55], [120, 0, 0, -120]);
  const blur1 = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.55], ["blur(20px)", "blur(0px)", "blur(0px)", "blur(20px)"]);

  // Point 2: Pushes UP blending in exactly as Point 1 leaves (0.4-0.55), Holds (0.55-0.8), fades out by 1.0
  const opacity2 = useTransform(scrollYProgress, [0.4, 0.55, 0.8, 1.0], [0, 1, 1, 0]);
  const y2 = useTransform(scrollYProgress, [0.4, 0.55, 0.8, 1.0], [120, 0, 0, -120]);
  const blur2 = useTransform(scrollYProgress, [0.4, 0.55, 0.8, 1.0], ["blur(20px)", "blur(0px)", "blur(0px)", "blur(20px)"]);

  return (
    <div ref={containerRef} className="relative w-full h-[500vh] bg-black">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center p-6 overflow-hidden">

        {/* Point 1 */}
        <motion.div
          style={{ opacity: opacity1, y: y1, filter: blur1 }}
          className="absolute inset-0 flex items-center justify-center px-4 sm:px-12 md:px-24 max-w-5xl mx-auto pointer-events-none"
        >
          <p className="text-3xl md:text-5xl lg:text-[5rem] text-white/80 font-heading italic text-center leading-[1.1] tracking-tight">
            Every breakthrough product<br />runs on elite engineering.
          </p>
        </motion.div>

        {/* Point 2 */}
        <motion.div
          style={{ opacity: opacity2, y: y2, filter: blur2 }}
          className="absolute inset-0 flex items-center justify-center px-4 sm:px-12 md:px-24 max-w-5xl mx-auto pointer-events-none"
        >
          <p className="text-3xl md:text-5xl lg:text-[5rem] text-white/80 font-heading italic text-center leading-[1.1] tracking-tight">
            <span className="text-white">Froscel</span> conducts the technical interviews<br />and verifies the talent that builds the future.
          </p>
        </motion.div>

      </div>
    </div>
  );
};

// ----------------------------------------------------
// Main Landing Page
// ----------------------------------------------------
const LandingPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const featuresData = [
    {
      id: "ai-interviews",
      quarter: "AI Technical Rounds",
      period: "Automated coding & system design environments",
      imageSrc: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
      isNew: true,
    },
    {
      id: "talent-passport",
      quarter: "Talent Passport",
      period: "Verified skill profiles authenticated by AI",
      imageSrc: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=800&q=80",
    },
    {
      id: "proctoring",
      quarter: "Holographic Proctoring",
      period: "Next-gen fraud detection and behavioral tracking",
      imageSrc: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
    },
    {
      id: "stack-sync",
      quarter: "20+ Tech Stacks",
      period: "Real-time dev environments for any language",
      imageSrc: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
    },
    {
      id: "behavioral",
      quarter: "Behavioral Signals",
      period: "Deep analysis of communication & problem solving",
      imageSrc: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
    },
  ];

  // Vanilla Lenis Initialization
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  // Force dark theme on landing page body to prevent Froscel global light styles from bleeding
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.backgroundColor = 'black';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div className="landing-page-v2 bg-black text-white relative flex flex-col items-center overflow-x-hidden min-h-screen">

      <AnimatePresence mode="wait">
        {isLoading && <LandingLoader onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>

      <div
        className="w-full flex-1 flex flex-col items-center"
        style={{ opacity: isLoading ? 0 : 1, transition: "opacity 0.6s ease-out" }}
      >

        {/* SECTION 1 - NAVBAR */}
        <div className="fixed top-8 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
          <nav className="w-[95%] max-w-7xl liquid-glass-strong rounded-full px-8 py-3.5 flex items-center justify-between border border-white/10 shadow-2xl backdrop-blur-2xl pointer-events-auto">

            {/* Logo */}
            <div className="flex-1 flex justify-start">
              <Link to="/" className="flex items-center gap-2 group">
                <img src="/logo.png" alt="Froscel" className="w-8 h-8 object-contain" />
                <span className="text-xl font-bold tracking-tight text-white group-hover:text-white/90 transition-colors">
                  Froscel
                </span>
              </Link>
            </div>

            {/* Center Links */}
            <div className="hidden lg:flex flex-none items-center justify-center gap-6 xl:gap-8">
              <Link to="/jobs" className="text-[15px] font-medium transition-colors" style={{ color: '#ffffff' }}>Jobs</Link>
              <Link to="/interview-room" className="text-[15px] font-medium transition-colors" style={{ color: '#ffffff' }}>Interview Room</Link>
              <Link to="/blog" className="text-[14px] lg:text-[15px] font-medium transition-colors" style={{ color: '#ffffff' }}>Blog</Link>
              <Link to="/glossary" className="text-[14px] lg:text-[15px] font-medium transition-colors" style={{ color: '#ffffff' }}>Glossary</Link>
              <a href="#pricing" className="text-[14px] lg:text-[15px] font-medium transition-colors" style={{ color: '#ffffff' }}>Contact</a>
            </div>

            {/* CTA */}
            <div className="flex-1 flex items-center justify-end gap-6">
              <Link to="/signup" className="hidden sm:block text-[15px] font-medium transition-colors" style={{ color: '#ffffff' }}>
                Sign up
              </Link>
              <Link to="/login" className="login-btn-landing bg-white px-7 py-2.5 rounded-full text-[15px] font-bold hover:bg-white/90 transition-colors shadow-lg">
                Sign In
              </Link>
            </div>
          </nav>
        </div>

        {/* HERO SECTION */}
        <section className="relative w-full flex flex-col items-center bg-black overflow-hidden pt-32 pb-0">
          {/* Video Background Layer */}
          <div className="absolute inset-0 z-0">
            {/* Main Hero Background Video */}
            <HlsVideo
              src="https://stream.mux.com/v69RSH02ba1kvni8vByDjcOB02Ps900vG7Z6W200M4SAbk.m3u8"
              className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 mix-blend-screen"
            />
          </div>

          <div className="absolute inset-0 z-0 w-full h-[150%] pointer-events-none opacity-50">
            <BGPattern variant="grid" mask="fade-bottom" fill="rgba(255,255,255,0.06)" />
          </div>

          {/* Hero Content */}
          <div className="relative z-20 flex flex-col items-center text-center mt-12 md:mt-24 max-w-5xl px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
              <span className="px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-bold tracking-wider uppercase">NEW</span>
              <span className="text-sm font-medium text-white/80">Introducing AI-powered hiring.</span>
            </motion.div>

            <h1 className="text-7xl md:text-8xl tracking-tight mb-8">
              The Hiring Platform Your <br />
              <span className="opacity-90">Team Deserves</span>
            </h1>

            <p className="text-[17px] text-white/60 mb-12 max-w-2xl font-light font-body leading-relaxed">
              Verified talent. Automated technical rounds. Built by AI, refined by experts. <br /> This is hiring, wildly reimagined.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Link to="/onboarding/role-selection" className="liquid-glass-strong rounded-full px-8 py-4 flex items-center gap-2 font-medium hover:bg-white/5 transition-colors border border-white/10" style={{ color: '#ffffff' }}>
                Start Hiring Free <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 2 - FEATURE CAROUSEL */}
        <div className="w-full bg-black py-12">
          <FeatureCarousel 
            reports={featuresData} 
            title="Core Infrastructure" 
            subtitle="The OS for high-performance engineering teams"
          />
        </div>

        {/* SECTION 3 - SCROLL ANIMATION */}
        <div className="relative w-full z-20 mt-8 md:mt-16">
          <TextScrollAnimation />
        </div>

        {/* SECTION 4 - START SECTION */}
        <section id="solutions" className="w-full min-h-[500px] py-20 px-6 md:px-16 lg:px-24 relative flex items-center justify-center">
          {/* HLS Video Background */}
          <div className="absolute inset-0 z-0">
            <HlsVideo
              src="https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8"
              className="w-full h-full object-cover opacity-40 mix-blend-lighten"
            />
            <div className="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-black to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-black to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="liquid-glass rounded-full px-4 py-1 text-xs font-medium text-white/80 font-body mb-6 border border-white/10">
              How It Works
            </div>
            <h2 className="text-5xl md:text-6xl lg:text-[4.5rem] font-heading italic text-white mb-6 leading-[0.9] tracking-tight">
              You need talent.<br />We find it.
            </h2>
            <p className="text-lg text-white/60 font-body font-light mb-10 leading-relaxed max-w-xl">
              Create your profile. Our AI assesses candidates, verifies skills, and matches you with top talent. All in days, not months.
            </p>
            <Link to="/onboarding/role-selection" className="liquid-glass-strong rounded-full px-8 py-4 flex items-center gap-2 text-white font-medium hover:bg-white/10 transition-colors border border-white/10">
              Start Matching <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* SECTION 5 - FEATURES CHESS */}
        <section id="platform" className="w-full py-16 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto bg-black relative z-10">
          <div className="flex flex-col items-center text-center mb-12">
            <div className="liquid-glass rounded-full px-4 py-1 text-xs font-medium text-white/80 font-body mb-6 border border-white/10">
              Capabilities
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9]">
              Pro features. Zero complexity.
            </h2>
          </div>

          {/* Row 1 */}
          <div className="flex flex-col lg:flex-row items-center gap-16 mb-20">
            <div className="lg:w-1/2 flex flex-col items-start text-left">
              <h3 className="text-3xl md:text-4xl font-heading italic text-white mb-6">Built to match. Designed to perform.</h3>
              <p className="text-white/60 font-body font-light text-base mb-8 max-w-md leading-relaxed">
                Every question is intentional. Our AI assesses your unique background and dynamically generates technical, HR, and behavioral rounds to test exactly what matters.
              </p>
              <button className="liquid-glass-strong rounded-full px-6 py-3 text-white font-medium text-sm border border-white/10 hover:bg-white/5 transition-colors">
                Learn more
              </button>
            </div>
            <div className="lg:w-1/2 w-full h-[400px] liquid-glass rounded-2xl overflow-hidden border border-white/5 relative flex items-center justify-center bg-black">
              {/* Native Video Loop */}
              <video
                src="/focs.mp4"
                autoPlay
                loop
                muted
                playsInline
                loading="lazy"
                className="w-[70%] h-[70%] object-contain mix-blend-screen"
                style={{ transform: "translateZ(0)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent mix-blend-overlay pointer-events-none"></div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="lg:w-1/2 flex flex-col items-start text-left">
              <h3 className="text-3xl md:text-4xl font-heading italic text-white mb-6">Verified Profiles. Automatically.</h3>
              <p className="text-white/60 font-body font-light text-base mb-8 max-w-md leading-relaxed">
                Stand out with an AI Talent Passport. Share your scores, verify your skills, and prove your competence to top recruiters instantly. No manual updates. Ever.
              </p>
              <button className="text-white font-body text-sm hover:text-white/70 transition-colors flex items-center gap-2">
                See how it works <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="lg:w-1/2 w-full h-[400px] liquid-glass rounded-2xl overflow-hidden border border-white/5 relative flex items-center justify-center">
              {/* Fake UI mockup */}
              <div className="w-64 h-80 rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md p-6 flex flex-col items-center gap-6">
                <img
                  src="/verification_badge_3d.png"
                  alt="AI Talent Passport Badge"
                  className="w-32 h-32 object-contain mix-blend-screen drop-shadow-[0_0_25px_rgba(100,50,255,0.4)]"
                />
                <div className="w-3/4 h-4 rounded-full bg-white/20"></div>
                <div className="w-full h-8 rounded-full bg-success/20 border border-success/30 flex items-center justify-center text-[10px] text-success font-bold uppercase tracking-widest">Verified Badge</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6 - FEATURES GRID */}
        <section id="process" className="w-full py-16 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto bg-black relative z-10">
          <div className="flex flex-col items-center text-center mb-12">
            <div className="liquid-glass rounded-full px-4 py-1 text-xs font-medium text-white/80 font-body mb-6 border border-white/10">
              Why Us
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9]">
              The difference is everything.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="liquid-glass rounded-2xl p-8 border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-full liquid-glass-strong flex items-center justify-center mb-6 border border-white/10">
                <Zap className="w-5 h-5 text-white/80" />
              </div>
              <h3 className="text-xl font-heading italic text-white mb-3">Days, Not Months</h3>
              <p className="text-white/60 font-body font-light text-sm leading-relaxed">80% faster hiring timeline. Concept to hire at a pace that redefines fast.</p>
            </div>

            <div className="liquid-glass rounded-2xl p-8 border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-full liquid-glass-strong flex items-center justify-center mb-6 border border-white/10">
                <CheckCircle className="w-5 h-5 text-white/80" />
              </div>
              <h3 className="text-xl font-heading italic text-white mb-3">Obsessively Verified</h3>
              <p className="text-white/60 font-body font-light text-sm leading-relaxed">Every skill tested. Every attribute mapped. Every detail considered and refined.</p>
            </div>

            <div className="liquid-glass rounded-2xl p-8 border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-full liquid-glass-strong flex items-center justify-center mb-6 border border-white/10">
                <BarChart3 className="w-5 h-5 text-white/80" />
              </div>
              <h3 className="text-xl font-heading italic text-white mb-3">Built to Convert</h3>
              <p className="text-white/60 font-body font-light text-sm leading-relaxed">Advanced analytics and insights informed by data for smart hiring decisions.</p>
            </div>

            <div className="liquid-glass rounded-2xl p-8 border border-white/5 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-full liquid-glass-strong flex items-center justify-center mb-6 border border-white/10">
                <Shield className="w-5 h-5 text-white/80" />
              </div>
              <h3 className="text-xl font-heading italic text-white mb-3">Secure by Default</h3>
              <p className="text-white/60 font-body font-light text-sm leading-relaxed">Enterprise-grade protection and fraud-prevention comes standard.</p>
            </div>
          </div>
        </section>

        {/* SECTION 7 - STATS */}
        <section className="w-full relative py-20 flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            <HlsVideo
              src="https://stream.mux.com/NcU3HlHeF7CUL86azTTzpy3Tlb00d6iF3BmCdFslMJYM.m3u8"
              className="w-full h-full object-cover opacity-30 mix-blend-screen"
              style={{ filter: 'saturate(0)' }}
            />
            <div className="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-black to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-black to-transparent" />
          </div>

          <div className="relative z-10 w-full max-w-5xl px-6">
            <div className="liquid-glass rounded-3xl p-12 md:p-16 border border-white/10 bg-black/40 backdrop-blur-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                <div className="flex flex-col gap-2">
                  <span className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white">98%</span>
                  <span className="text-white/60 font-body font-light text-sm uppercase tracking-widest">Satisfaction</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white">80%</span>
                  <span className="text-white/60 font-body font-light text-sm uppercase tracking-widest">Faster Hires</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white">5 days</span>
                  <span className="text-white/60 font-body font-light text-sm uppercase tracking-widest">Avg Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* SECTION 8.5 - CONTACT FORM */}
        <section id="contact" className="w-full py-16 px-6 md:px-16 lg:px-24 max-w-7xl mx-auto flex flex-col items-center justify-center relative z-10">
          <div data-theme="dark" className="w-full max-w-2xl">
            <ContactForm />
          </div>
        </section>

        {/* SECTION 9 - CTA FOOTER */}
        <section id="pricing" className="w-full min-h-[500px] relative flex flex-col items-center justify-center pt-24 pb-8 px-6">
          <div className="absolute inset-0 z-0">
            <HlsVideo
              src="https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8"
              className="w-full h-full object-cover opacity-50 mix-blend-screen"
            />
            <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-black to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-black to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center mb-auto pt-20">
            <h2 className="text-5xl md:text-6xl lg:text-[5.5rem] font-heading italic text-white mb-6 leading-[0.85] tracking-tight">
              Your next team<br />starts here.
            </h2>
            <p className="text-lg text-white/60 font-body font-light mb-10 max-w-md leading-relaxed">
              Start hiring today. See what AI-powered recruitment infrastructure can do for your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/onboarding/role-selection" className="liquid-glass-strong rounded-full px-8 py-4 text-white font-medium hover:bg-white/10 transition-colors border border-white/10 flex items-center justify-center gap-2">
                Start Free Trial <ArrowUpRight className="w-4 h-4" />
              </Link>
              <button className="bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-white/90 transition-colors">
                Book a Demo
              </button>
            </div>
          </div>

          <footer className="relative z-10 w-full max-w-6xl mt-auto pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-white/40 text-xs font-body font-light">
            <p>© 2026 Froscel Platform. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="/#contact" className="hover:text-white transition-colors">Contact</a>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
