import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <div className="fixed top-8 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
            <motion.nav 
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-[95%] max-w-7xl liquid-glass-strong rounded-full px-8 py-3.5 flex items-center justify-between border border-white/10 shadow-2xl backdrop-blur-2xl pointer-events-auto"
            >
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
                    <Link to="/jobs" className="text-[14px] lg:text-[15px] font-medium transition-colors !text-white">Jobs</Link>
                    <Link to="/interview-room" className="text-[14px] lg:text-[15px] font-medium transition-colors !text-white">Interview Room</Link>
                    <Link to="/blog" className="text-[14px] lg:text-[15px] font-medium transition-colors !text-white">Blog</Link>
                    <Link to="/glossary" className="text-[14px] lg:text-[15px] font-medium transition-colors !text-white">Glossary</Link>
                    <Link to="/#contact" className="text-[14px] lg:text-[15px] font-medium transition-colors !text-white">Contact</Link>
                </div>

                {/* CTA */}
                <div className="flex-1 flex items-center justify-end gap-6">
                    <Link to="/signup" className="hidden sm:block text-[15px] font-medium transition-colors !text-white hover:text-white/80">
                        Sign up
                    </Link>
                    <Link to="/login" className="login-btn-landing bg-white !text-black px-7 py-2.5 rounded-full text-[15px] font-bold hover:bg-white/90 transition-colors shadow-lg">
                        Sign In
                    </Link>
                </div>
            </motion.nav>
        </div>
    );
};

export default Header;
