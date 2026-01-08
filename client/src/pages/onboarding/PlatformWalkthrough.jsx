import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './PlatformWalkthrough.css';

const slides = [
    {
        id: 1,
        title: "Welcome to AI Hiring Platform",
        description: "Your profile is all set! Let's take a quick tour to help you land your dream job faster.",
        icon: "🚀",
        color: "#4F46E5"
    },
    {
        id: 2,
        title: "AI-Powered Resume Analysis",
        description: "Our advanced AI constantly analyzes your resume against thousands of active job openings to find your perfect match.",
        icon: "📄",
        color: "#059669"
    },
    {
        id: 3,
        title: "Practice with AI Interviews",
        description: "Take unlimited mock interviews. Get real-time feedback on your answers, body language, and technical skills to improve your score.",
        icon: "🤖",
        color: "#7C3AED"
    },
    {
        id: 4,
        title: "Get Highlighted to Recruiters",
        description: "Top performers in AI interviews get a 'Verified' badge and are highlighted to top recruiters. Start your journey now!",
        icon: "⭐",
        color: "#D97706"
    }
];

const PlatformWalkthrough = ({ onComplete }) => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(curr => curr + 1);
        } else {
            handleComplete();
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(curr => curr - 1);
        }
    };

    const handleComplete = () => {
        if (onComplete) {
            onComplete();
        } else {
            navigate('/jobseeker/home');
        }
    };

    return (
        <div className="walkthrough-container">
            <div className="walkthrough-card">
                <div className="walkthrough-progress">
                    {slides.map((_, index) => (
                        <div
                            key={index}
                            className={`progress-dot ${index <= currentSlide ? 'active' : ''}`}
                        />
                    ))}
                </div>

                <div className="slide-content-wrapper">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="slide-content"
                        >
                            <div
                                className="slide-icon-wrapper"
                                style={{ backgroundColor: `${slides[currentSlide].color}20` }}
                            >
                                <span className="slide-icon" style={{ color: slides[currentSlide].color }}>
                                    {slides[currentSlide].icon}
                                </span>
                            </div>
                            <h2>{slides[currentSlide].title}</h2>
                            <p>{slides[currentSlide].description}</p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="walkthrough-actions">
                    <button
                        className="btn-text"
                        onClick={handleComplete}
                        style={{ visibility: currentSlide === slides.length - 1 ? 'hidden' : 'visible' }}
                    >
                        Skip Tour
                    </button>

                    <div className="action-buttons-right">
                        {currentSlide > 0 && (
                            <button className="btn-secondary" onClick={prevSlide}>
                                Back
                            </button>
                        )}
                        <button className="btn-primary" onClick={nextSlide}>
                            {currentSlide === slides.length - 1 ? "Go to Dashboard" : "Next"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlatformWalkthrough;
