const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Helper function to get frontend URL
const getFrontendUrl = () => {
    return process.env.CLIENT_URL || 'http://localhost:5173';
};

// ==================== GOOGLE OAUTH ====================

// Initiate Google OAuth
// GET /api/auth/google?role=jobseeker|recruiter
router.get('/google', (req, res, next) => {
    const role = req.query.role || 'jobseeker';

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: role // Pass role through OAuth state
    })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${getFrontendUrl()}/login?error=oauth_failed`,
        session: false
    }),
    (req, res) => {
        try {
            // Generate JWT token
            const token = generateToken(req.user);

            // Determine redirect URL based on onboarding status
            let redirectUrl;
            if (!req.user.isOnboardingComplete) {
                if (req.user.role === 'jobseeker') {
                    redirectUrl = `${getFrontendUrl()}/onboarding/jobseeker`;
                } else if (req.user.role === 'recruiter') {
                    redirectUrl = `${getFrontendUrl()}/onboarding/recruiter`;
                } else {
                    redirectUrl = `${getFrontendUrl()}/onboarding/role-selection`;
                }
            } else {
                // User is onboarded - redirect to their dashboard
                redirectUrl = req.user.role === 'recruiter'
                    ? `${getFrontendUrl()}/recruiter/home`
                    : `${getFrontendUrl()}/jobseeker/home`;
            }

            // Redirect with token in query params (frontend will store it)
            res.redirect(`${redirectUrl}?token=${token}&userId=${req.user._id}`);
        } catch (error) {
            console.error('OAuth callback error:', error);
            res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
        }
    }
);

// ==================== PLACEHOLDER ROUTES ====================
// These will show "Coming Soon" on frontend

// Facebook OAuth (placeholder)
router.get('/facebook', (req, res) => {
    res.status(501).json({
        success: false,
        error: 'Facebook OAuth coming soon',
        message: 'This feature is not yet implemented'
    });
});

// GitHub OAuth (placeholder)
router.get('/github', (req, res) => {
    res.status(501).json({
        success: false,
        error: 'GitHub OAuth coming soon',
        message: 'This feature is not yet implemented'
    });
});

// LinkedIn OAuth (placeholder)
router.get('/linkedin', (req, res) => {
    res.status(501).json({
        success: false,
        error: 'LinkedIn OAuth coming soon',
        message: 'This feature is not yet implemented'
    });
});

module.exports = router;
