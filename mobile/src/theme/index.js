/**
 * Froscel Mobile - Theme Configuration
 * Premium enterprise SaaS design tokens
 */

export const Colors = {
    light: {
        primary: '#6366F1',
        primaryLight: '#818CF8',
        primaryDark: '#4F46E5',

        background: '#FFFFFF',
        backgroundSecondary: '#F8FAFC',
        backgroundTertiary: '#F1F5F9',

        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',

        text: '#0F172A',
        textSecondary: '#64748B',
        textTertiary: '#94A3B8',
        textInverse: '#FFFFFF',

        border: '#E2E8F0',
        borderLight: '#F1F5F9',

        success: '#10B981',
        successLight: '#D1FAE5',
        warning: '#F59E0B',
        warningLight: '#FEF3C7',
        danger: '#EF4444',
        dangerLight: '#FEE2E2',
        info: '#3B82F6',
        infoLight: '#DBEAFE',

        skeleton: '#E2E8F0',
        overlay: 'rgba(15, 23, 42, 0.5)',
    },
    dark: {
        primary: '#818CF8',
        primaryLight: '#A5B4FC',
        primaryDark: '#6366F1',

        background: '#0F172A',
        backgroundSecondary: '#1E293B',
        backgroundTertiary: '#334155',

        surface: '#1E293B',
        surfaceElevated: '#334155',

        text: '#F8FAFC',
        textSecondary: '#94A3B8',
        textTertiary: '#64748B',
        textInverse: '#0F172A',

        border: '#334155',
        borderLight: '#475569',

        success: '#34D399',
        successLight: '#064E3B',
        warning: '#FBBF24',
        warningLight: '#78350F',
        danger: '#F87171',
        dangerLight: '#7F1D1D',
        info: '#60A5FA',
        infoLight: '#1E3A8A',

        skeleton: '#334155',
        overlay: 'rgba(0, 0, 0, 0.7)',
    },
};

export const Typography = {
    h1: {
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 34,
    },
    h2: {
        fontSize: 24,
        fontWeight: '700',
        lineHeight: 30,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 26,
    },
    body: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
    },
    bodyMedium: {
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 24,
    },
    caption: {
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
    },
    small: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 16,
    },
    button: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 20,
    },
    buttonSmall: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 18,
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const BorderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
};

export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
};

export const Animations = {
    screenTransition: 250,
    buttonPress: 100,
    fadeIn: 200,
    staggerDelay: 80,
    scoreRingDuration: 900,
    questionFade: 300,
    modalSlide: 200,
    toastEntry: 200,
};

export default {
    Colors,
    Typography,
    Spacing,
    BorderRadius,
    Shadows,
    Animations,
};
