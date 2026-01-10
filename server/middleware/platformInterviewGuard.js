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

        // Check if passed
        if (interviewStatus === 'passed') {
            return next();
        }

        // Check if failed but can retry
        if (interviewStatus === 'failed') {
            const canRetry = user.platformInterview?.canRetry;
            const retryAfter = user.platformInterview?.retryAfter;

            if (canRetry && retryAfter && new Date() > new Date(retryAfter)) {
                // User can retry, but still can't apply until they pass
                return res.status(403).json({
                    success: false,
                    error: 'Platform interview not passed',
                    code: 'INTERVIEW_RETRY_AVAILABLE',
                    message: 'You can retry your platform interview now. Pass it to apply for jobs.',
                    canRetry: true
                });
            }

            return res.status(403).json({
                success: false,
                error: 'Platform interview not passed',
                code: 'INTERVIEW_FAILED',
                message: `You failed the platform interview. You can retry after ${new Date(retryAfter).toLocaleDateString()}.`,
                canRetry: false,
                retryAfter: retryAfter
            });
        }

        // Pending, skipped, or in_progress
        return res.status(403).json({
            success: false,
            error: 'Platform interview required',
            code: 'INTERVIEW_REQUIRED',
            message: 'You must complete and pass the platform interview before applying for jobs.',
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
