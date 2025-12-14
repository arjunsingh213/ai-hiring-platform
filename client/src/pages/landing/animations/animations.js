// animations/animations.js
// Exact production-ready framer-motion constants, variants and small helpers.
// Use these constants and variants in all landing components to replicate the Framer video pacing.

import { useScroll, useTransform } from "framer-motion";

/* Easing and timing constants (do NOT change) */
export const EASE_OUT = [0.22, 1, 0.36, 1];     // soft cubic-bezier for natural easing
export const EASE_IN_OUT = [0.2, 0.8, 0.2, 1];

export const TIMINGS = {
    short: 0.28,
    medium: 0.5,
    long: 0.66,
    hero: 0.72
};

export const STAGGER = {
    containerDelay: 0,
    staggerChildren: 0.08
};

/* Container + item (staggered list) */
export const container = {
    hidden: { opacity: 0, y: 8 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            delayChildren: STAGGER.containerDelay,
            staggerChildren: STAGGER.staggerChildren,
            when: "beforeChildren",
            ease: EASE_OUT
        }
    }
};

export const item = {
    hidden: { opacity: 0, y: 18 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: TIMINGS.medium,
            ease: EASE_OUT
        }
    }
};

/* Hero copy reveal */
export const heroCopy = {
    hidden: { opacity: 0, y: 22 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: TIMINGS.hero, ease: EASE_OUT, delay: 0.06 }
    }
};

/* Hero visual (screenshot) */
export const heroVisual = {
    hidden: { opacity: 0, scale: 0.98 },
    show: {
        opacity: 1,
        scale: 1,
        transition: { duration: TIMINGS.hero, ease: EASE_IN_OUT, delay: 0.12 }
    },
    hover: {
        scale: 1.02,
        transition: { duration: TIMINGS.short, ease: EASE_OUT }
    }
};

/* Header reveal */
export const headerVariant = {
    hidden: { opacity: 0, y: -10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } }
};

/* Button micro interactions (use via spread) */
export const buttonMicro = {
    whileHover: { scale: 1.02, transition: { duration: 0.14, ease: EASE_OUT } },
    whileTap: { scale: 0.985 }
};

/* Section reveal */
export const sectionReveal = {
    hidden: { opacity: 0, y: 30 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: TIMINGS.long, ease: EASE_OUT }
    }
};

/* Card hover */
export const cardHover = {
    rest: { scale: 1, y: 0 },
    hover: {
        scale: 1.02,
        y: -4,
        transition: { duration: TIMINGS.short, ease: EASE_OUT }
    }
};

/* Fade in */
export const fadeIn = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { duration: TIMINGS.medium, ease: EASE_OUT }
    }
};

/* Parallax helper hook */
export function useHeroParallax() {
    // Use in hero component to get a small parallax transform.
    // map scrollY [0, 400] to translateY [0, -40] and opacity [1, 0.94]
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 400], [0, -40]);
    const opacity = useTransform(scrollY, [0, 400], [1, 0.94]);
    return { y, opacity };
}

/* Scroll progress hook */
export function useScrollProgress() {
    const { scrollYProgress } = useScroll();
    return scrollYProgress;
}
