import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingLoader({ onComplete }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const words = ["Assess", "Verify", "Hire"];
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Handle words cycling
  useEffect(() => {
    const wordInterval = setInterval(() => {
      setWordIndex(prev => {
        if (prev < words.length - 1) return prev + 1;
        clearInterval(wordInterval);
        return prev;
      });
    }, 900);
    return () => clearInterval(wordInterval);
  }, []);

  // Handle counter using requestAnimationFrame
  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (time) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      
      let currentProgress = (elapsed / 2700) * 100;
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        
        setTimeout(() => {
          onCompleteRef.current();
        }, 400);
      } else {
        setProgress(currentProgress);
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[9999] bg-black text-white flex flex-col justify-between"
    >
      {/* Top Left Label */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute top-8 left-8 md:top-12 md:left-12 text-xs md:text-sm text-white/50 uppercase tracking-[0.3em] font-body"
      >
        Froscel AI Platform
      </motion.div>

      {/* Center Rotating Words */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={wordIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl font-heading italic text-white/80"
          >
            {words[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Bottom Right Counter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute bottom-8 right-8 md:bottom-12 md:right-12 text-6xl md:text-8xl lg:text-9xl font-heading italic text-white tabular-nums"
      >
        {Math.round(progress).toString().padStart(3, '0')}
      </motion.div>

      {/* Bottom Edge Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
        <motion.div
          className="h-full origin-left"
          style={{ 
            background: 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
            boxShadow: '0 0 8px rgba(255,255,255,0.3)',
            scaleX: progress / 100 
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}
