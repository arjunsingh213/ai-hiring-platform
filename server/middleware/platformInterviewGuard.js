/**
 * Platform Interview Guard Middleware
 * Blocks access to job-related features if platform interview is not passed
 */

const User = require('../models/User');

/**
 * Middleware to check if user has passed platform interview
 * Blocks job applications and job-specific interviews if not passed
 */
const requirePlatformInterview = async (req, res, next) => {
    try {
        const userId = req.userId || req.body.userId || req.query.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const user = await User.findById(userId).select('role platformInterview isOnboardingComplete interviewStatus jobSeekerProfile.interviewScore');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Recruiters don't need platform interview
        if (user.role === 'recruiter') {
            return next();
        }

        let interviewStatus = user.platformInterview?.status || 'pending';

        // BACKWARD COMPATIBILITY: Check if user completed onboarding before this feature
        // Also handle 'in_progress' status - user might have a completed interview while status says in_progress
        if (interviewStatus === 'pending' || interviewStatus === 'in_progress' || !interviewStatus) {
            if (user.isOnboardingComplete ||
                user.interviewStatus?.completed ||
                user.jobSeekerProfile?.interviewScore >= 60) {
                // User has completed onboarding or has a passing interview score, allow them through
                console.log(`[MIDDLEWARE COMPAT] User ${userId} allowed - completed onboarding/interview (status was: ${interviewStatus})`);
                return next();
            }
        }

        // PILOT TESTING: Allow access if interview is completed, passed, failed, or pending_review
        // The core requirement is that they ATTENDED it once.
        if (['passed', 'failed', 'pending_review', 'completed'].includes(interviewStatus)) {
            return next();
        }

        // Even if status is skipped or pending, if onboarding complete is true, allow through
        if (user.isOnboardingComplete || user.interviewStatus?.completed) {
            return next();
        }

        // Only block if strictly required and not even attempted
        return res.status(403).json({
            success: false,
            error: 'Platform interview required',
            code: 'INTERVIEW_REQUIRED',
            message: 'You must complete the platform interview once before applying for jobs.',
            interviewStatus: interviewStatus
        });

    } catch (error) {
        console.error('Platform interview guard error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify platform interview status'
        });
    }
};

/**
 * Soft check - doesn't block, just adds status to request
 * Useful for pages that need to show different UI based on status
 */
const checkPlatformInterview = async (req, res, next) => {
    try {
        const userId = req.userId || req.body.userId || req.query.userId;

        if (userId) {
            const user = await User.findById(userId).select('platformInterview');
            req.platformInterviewStatus = user?.platformInterview?.status || 'pending';
            req.platformInterviewPassed = req.platformInterviewStatus === 'passed';
        } else {
            req.platformInterviewStatus = 'unknown';
            req.platformInterviewPassed = false;
        }

        next();
    } catch (error) {
        console.error('Platform interview check error:', error);
        req.platformInterviewStatus = 'unknown';
        req.platformInterviewPassed = false;
        next();
    }
};

module.exports = {
    requirePlatformInterview,
    checkPlatformInterview
};
