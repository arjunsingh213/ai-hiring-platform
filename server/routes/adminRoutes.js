const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const Interview = require('../models/Interview');
const User = require('../models/User');
const {
    generateAdminToken,
    adminAuth,
    requirePermission,
    auditLog,
    adminRateLimiter
} = require('../middleware/adminAuth');

// ==================== AUTHENTICATION ====================

/**
 * POST /api/admin/login
 * Admin login
 */
router.post('/login', adminRateLimiter(5, 60000), async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Find admin with password
        const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check if account is locked
        if (admin.isLocked()) {
            const lockTime = Math.ceil((admin.lockUntil - Date.now()) / 60000);
            return res.status(423).json({
                success: false,
                error: `Account is locked. Try again in ${lockTime} minutes.`,
                code: 'ACCOUNT_LOCKED'
            });
        }

        // Verify password
        const isMatch = await admin.comparePassword(password);

        if (!isMatch) {
            await admin.incrementLoginAttempts();
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check if active
        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated'
            });
        }

        // Reset login attempts on successful login
        await Admin.findByIdAndUpdate(admin._id, {
            $set: {
                loginAttempts: 0,
                lastLogin: new Date(),
                lastActivity: new Date()
            },
            $unset: { lockUntil: 1 }
        });

        // Generate token
        const token = generateAdminToken(admin);

        // Log the login
        await AuditLog.log({
            adminId: admin._id,
            adminEmail: admin.email,
            action: 'admin_login',
            targetType: 'system',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({
            success: true,
            data: {
                token,
                admin: {
                    id: admin._id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                    permissions: admin.permissions,
                    mustResetPassword: admin.mustResetPassword
                }
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

/**
 * POST /api/admin/logout
 * Admin logout
 */
router.post('/logout', adminAuth, async (req, res) => {
    try {
        await auditLog(req, 'admin_logout', 'system', null);

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

/**
 * POST /api/admin/reset-password
 * Reset password (for first login)
 */
router.post('/reset-password', adminAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 8 characters'
            });
        }

        const admin = await Admin.findById(req.admin._id).select('+password');

        // Verify current password
        const isMatch = await admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Update password
        admin.password = newPassword;
        admin.mustResetPassword = false;
        await admin.save();

        await auditLog(req, 'password_reset', 'admin', admin._id);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Password reset failed'
        });
    }
});

/**
 * GET /api/admin/me
 * Get current admin info
 */
router.get('/me', adminAuth, async (req, res) => {
    res.json({
        success: true,
        data: {
            id: req.admin._id,
            email: req.admin.email,
            name: req.admin.name,
            role: req.admin.role,
            permissions: req.admin.permissions,
            mustResetPassword: req.admin.mustResetPassword
        }
    });
});

// ==================== INTERVIEW REVIEW QUEUE ====================

/**
 * GET /api/admin/interviews/pending
 * Get all interviews pending review
 */
router.get('/interviews/pending', adminAuth, requirePermission('view_interviews'), async (req, res) => {
    try {
        const { page = 1, limit = 20, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const query = {
            status: 'pending_review',
            'adminReview.status': 'pending_review'
        };

        if (priority) {
            query['adminReview.priorityLevel'] = priority;
        }

        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const [interviews, total] = await Promise.all([
            Interview.find(query)
                .populate('userId', 'profile.name email jobSeekerProfile.desiredRole')
                .populate('jobId', 'title company.name')
                .select('userId jobId interviewType scoring proctoring adminReview videoRecording createdAt')
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .lean(),
            Interview.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                interviews,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get pending interviews error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pending interviews'
        });
    }
});

/**
 * GET /api/admin/interviews/stats
 * Get interview review statistics
 */
router.get('/interviews/stats', adminAuth, requirePermission('view_interviews'), async (req, res) => {
    try {
        const stats = await Interview.aggregate([
            {
                $group: {
                    _id: '$adminReview.status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const priorityStats = await Interview.aggregate([
            { $match: { status: 'pending_review' } },
            {
                $group: {
                    _id: '$adminReview.priorityLevel',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                byStatus: stats,
                byPriority: priorityStats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

/**
 * GET /api/admin/interviews/:id
 * Get full interview details for review
 */
router.get('/interviews/:id', adminAuth, requirePermission('view_interviews'), async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id)
            .populate('userId', 'profile email jobSeekerProfile platformInterview interviewStatus resume createdAt')
            .populate('jobId', 'title description company requirements')
            .populate('adminReview.reviewedBy', 'name email')
            .lean();

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        // Fetch user's resume if available
        let resumeData = null;
        if (interview.userId) {
            const Resume = require('../models/Resume');
            resumeData = await Resume.findOne({ userId: interview.userId._id })
                .select('fileName fileUrl parsedData uploadedAt')
                .lean();
        }

        // Add resume to interview response
        interview.userResume = resumeData;

        await auditLog(req, 'view_interview', 'interview', interview._id);

        res.json({
            success: true,
            data: interview
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch interview'
        });
    }
});

/**
 * GET /api/admin/interviews/:id/video
 * Get interview video with cheating markers
 */
router.get('/interviews/:id/video', adminAuth, requirePermission('view_interviews'), async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id)
            .select('videoRecording proctoring duration')
            .lean();

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        res.json({
            success: true,
            data: {
                video: interview.videoRecording,
                proctoring: interview.proctoring,
                duration: interview.duration
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch video'
        });
    }
});

// ==================== CHEATING REVIEW ====================

/**
 * POST /api/admin/interviews/:id/confirm-cheating
 * Confirm cheating detected
 */
router.post('/interviews/:id/confirm-cheating', adminAuth, requirePermission('approve_interviews'), async (req, res) => {
    try {
        const { details, notes } = req.body;

        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        const previousValue = {
            status: interview.adminReview.status,
            cheatingConfirmed: interview.adminReview.cheatingConfirmed
        };

        interview.adminReview.status = 'cheating_confirmed';
        interview.adminReview.cheatingConfirmed = true;
        interview.adminReview.cheatingDetails = details;
        interview.adminReview.adminNotes = notes;
        interview.adminReview.reviewedBy = req.admin._id;
        interview.adminReview.reviewedAt = new Date();
        interview.status = 'approved'; // Marked as reviewed
        interview.passed = false;
        interview.resultVisibleToCandidate = true;

        await interview.save();

        await auditLog(req, 'confirm_cheating', 'interview', interview._id, {
            previousValue,
            newValue: { status: 'cheating_confirmed', cheatingConfirmed: true },
            reason: details,
            metadata: {
                cheatingFlagsCount: interview.proctoring?.totalFlags,
                riskLevel: interview.proctoring?.riskLevel
            }
        });

        res.json({
            success: true,
            message: 'Cheating confirmed and recorded'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to confirm cheating'
        });
    }
});

/**
 * POST /api/admin/interviews/:id/dismiss-flags
 * Dismiss cheating flags as false positive
 */
router.post('/interviews/:id/dismiss-flags', adminAuth, requirePermission('approve_interviews'), async (req, res) => {
    try {
        const { reason } = req.body;

        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        const previousFlags = interview.proctoring?.totalFlags;

        interview.adminReview.adminNotes = `Flags dismissed: ${reason}`;
        interview.adminReview.cheatingConfirmed = false;
        interview.proctoring.riskLevel = 'low';

        await interview.save();

        await auditLog(req, 'dismiss_cheating_flags', 'interview', interview._id, {
            previousValue: { flagsCount: previousFlags },
            reason,
            metadata: { originalFlagsCount: previousFlags }
        });

        res.json({
            success: true,
            message: 'Cheating flags dismissed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to dismiss flags'
        });
    }
});

// ==================== EVALUATION ACTIONS ====================

/**
 * POST /api/admin/interviews/:id/approve
 * Approve interview result
 */
router.post('/interviews/:id/approve', adminAuth, requirePermission('approve_interviews'), async (req, res) => {
    try {
        const { notes } = req.body;

        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        const previousValue = {
            status: interview.adminReview.status,
            passed: interview.passed
        };

        // Use AI score as final score (no adjustment)
        const finalScore = interview.scoring?.overallScore || interview.adminReview.aiScore;
        const passed = finalScore >= 60; // Pass threshold

        interview.adminReview.status = 'approved';
        interview.adminReview.finalScore = finalScore;
        interview.adminReview.adminNotes = notes;
        interview.adminReview.reviewedBy = req.admin._id;
        interview.adminReview.reviewedAt = new Date();
        interview.status = 'approved';
        interview.passed = passed;
        interview.resultVisibleToCandidate = true;

        await interview.save();

        // Update user's platform interview status
        if (interview.interviewType === 'combined' || !interview.jobId) {
            await User.findByIdAndUpdate(interview.userId, {
                'platformInterview.status': passed ? 'passed' : 'failed',
                'platformInterview.score': finalScore,
                'platformInterview.completedAt': new Date()
            });
        }

        await auditLog(req, 'approve_interview', 'interview', interview._id, {
            previousValue,
            newValue: { status: 'approved', passed, finalScore },
            reason: notes,
            metadata: { interviewScore: finalScore }
        });

        res.json({
            success: true,
            message: 'Interview approved',
            data: { passed, finalScore }
        });
    } catch (error) {
        console.error('Approve interview error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve interview'
        });
    }
});

/**
 * POST /api/admin/interviews/:id/reject
 * Reject interview
 */
router.post('/interviews/:id/reject', adminAuth, requirePermission('reject_interviews'), async (req, res) => {
    try {
        const { reason, notes } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason is required'
            });
        }

        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        const previousValue = { status: interview.adminReview.status };

        interview.adminReview.status = 'rejected';
        interview.adminReview.adminNotes = `Rejection reason: ${reason}. ${notes || ''}`;
        interview.adminReview.reviewedBy = req.admin._id;
        interview.adminReview.reviewedAt = new Date();
        interview.status = 'approved'; // Marked as reviewed
        interview.passed = false;
        interview.resultVisibleToCandidate = true;

        await interview.save();

        await auditLog(req, 'reject_interview', 'interview', interview._id, {
            previousValue,
            newValue: { status: 'rejected' },
            reason
        });

        res.json({
            success: true,
            message: 'Interview rejected'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to reject interview'
        });
    }
});

/**
 * POST /api/admin/interviews/:id/adjust-score
 * Adjust interview score
 */
router.post('/interviews/:id/adjust-score', adminAuth, requirePermission('adjust_scores'), async (req, res) => {
    try {
        const { newScore, reason } = req.body;

        if (newScore === undefined || newScore < 0 || newScore > 100) {
            return res.status(400).json({
                success: false,
                error: 'Valid score (0-100) is required'
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Reason for adjustment is required'
            });
        }

        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        const previousScore = interview.adminReview.finalScore || interview.scoring?.overallScore;

        interview.adminReview.aiScore = interview.scoring?.overallScore; // Preserve original
        interview.adminReview.finalScore = newScore;
        interview.adminReview.scoreAdjusted = true;
        interview.adminReview.scoreAdjustmentReason = reason;

        await interview.save();

        await auditLog(req, 'adjust_score', 'interview', interview._id, {
            previousValue: { score: previousScore },
            newValue: { score: newScore },
            reason,
            metadata: {
                interviewScore: previousScore,
                adjustedScore: newScore
            }
        });

        res.json({
            success: true,
            message: 'Score adjusted',
            data: { previousScore, newScore }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to adjust score'
        });
    }
});

/**
 * POST /api/admin/interviews/:id/allow-reattempt
 * Allow candidate to reattempt interview
 */
router.post('/interviews/:id/allow-reattempt', adminAuth, requirePermission('allow_reattempts'), async (req, res) => {
    try {
        const { reason } = req.body;

        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        interview.adminReview.status = 'reattempt_allowed';
        interview.adminReview.adminNotes = `Reattempt allowed: ${reason}`;
        interview.adminReview.reviewedBy = req.admin._id;
        interview.adminReview.reviewedAt = new Date();
        interview.status = 'approved';
        interview.resultVisibleToCandidate = true;

        await interview.save();

        // Reset user's platform interview to allow retry
        await User.findByIdAndUpdate(interview.userId, {
            'platformInterview.status': 'pending',
            'platformInterview.canRetry': true,
            'platformInterview.retryAfter': null
        });

        await auditLog(req, 'allow_reattempt', 'interview', interview._id, {
            reason,
            newValue: { status: 'reattempt_allowed' }
        });

        res.json({
            success: true,
            message: 'Reattempt allowed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to allow reattempt'
        });
    }
});

// ==================== USER CONTROL ====================

/**
 * GET /api/admin/users
 * List users with filters
 */
router.get('/users', adminAuth, requirePermission('view_users'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            role,
            search,
            isSuspended
        } = req.query;

        const query = {};

        if (role) query.role = role;
        if (isSuspended !== undefined) query['accountStatus.isSuspended'] = isSuspended === 'true';
        if (search) {
            query.$or = [
                { 'profile.name': { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .select('profile email role platformInterview accountStatus createdAt lastActive')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .lean(),
            User.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});

/**
 * GET /api/admin/users/:id
 * Get user details
 */
router.get('/users/:id', adminAuth, requirePermission('view_users'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -oauth')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get user's interview history
        const interviews = await Interview.find({ userId: user._id })
            .select('interviewType status scoring adminReview createdAt')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        await auditLog(req, 'view_user', 'user', user._id, {
            metadata: { targetEmail: user.email }
        });

        res.json({
            success: true,
            data: { user, interviews }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user'
        });
    }
});

/**
 * POST /api/admin/users/:id/suspend
 * Suspend a user
 */
router.post('/users/:id/suspend', adminAuth, requirePermission('suspend_users'), async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Suspension reason is required'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        user.accountStatus = user.accountStatus || {};
        user.accountStatus.isSuspended = true;
        user.accountStatus.suspendedAt = new Date();
        user.accountStatus.suspendedBy = req.admin._id;
        user.accountStatus.suspensionReason = reason;

        await user.save();

        await auditLog(req, 'suspend_user', 'user', user._id, {
            reason,
            newValue: { isSuspended: true },
            metadata: { targetEmail: user.email }
        });

        res.json({
            success: true,
            message: 'User suspended'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to suspend user'
        });
    }
});

/**
 * POST /api/admin/users/:id/unsuspend
 * Unsuspend a user
 */
router.post('/users/:id/unsuspend', adminAuth, requirePermission('suspend_users'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        user.accountStatus = user.accountStatus || {};
        user.accountStatus.isSuspended = false;
        user.accountStatus.suspendedAt = null;
        user.accountStatus.suspendedBy = null;
        user.accountStatus.suspensionReason = null;

        await user.save();

        await auditLog(req, 'unsuspend_user', 'user', user._id, {
            newValue: { isSuspended: false },
            metadata: { targetEmail: user.email }
        });

        res.json({
            success: true,
            message: 'User unsuspended'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to unsuspend user'
        });
    }
});

/**
 * POST /api/admin/users/:id/reset-eligibility
 * Reset interview eligibility
 */
router.post('/users/:id/reset-eligibility', adminAuth, requirePermission('allow_reattempts'), async (req, res) => {
    try {
        const { reason } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const previousStatus = user.platformInterview?.status;

        user.platformInterview = user.platformInterview || {};
        user.platformInterview.status = 'pending';
        user.platformInterview.canRetry = true;
        user.platformInterview.retryAfter = null;

        await user.save();

        await auditLog(req, 'reset_interview_eligibility', 'user', user._id, {
            previousValue: { status: previousStatus },
            newValue: { status: 'pending', canRetry: true },
            reason,
            metadata: { targetEmail: user.email }
        });

        res.json({
            success: true,
            message: 'Interview eligibility reset'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to reset eligibility'
        });
    }
});

/**
 * POST /api/admin/users/:id/mark-offender
 * Mark as repeat offender
 */
router.post('/users/:id/mark-offender', adminAuth, requirePermission('suspend_users'), async (req, res) => {
    try {
        const { reason } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        user.accountStatus = user.accountStatus || {};
        user.accountStatus.isRepeatOffender = true;
        user.accountStatus.offenderMarkedAt = new Date();

        await user.save();

        await auditLog(req, 'mark_repeat_offender', 'user', user._id, {
            reason,
            newValue: { isRepeatOffender: true },
            metadata: { targetEmail: user.email }
        });

        res.json({
            success: true,
            message: 'Marked as repeat offender'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to mark offender'
        });
    }
});

// ==================== AUDIT LOGS ====================

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
router.get('/audit-logs', adminAuth, requirePermission('view_audit_logs'), async (req, res) => {
    try {
        const result = await AuditLog.getLogs(req.query);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs'
        });
    }
});

// ==================== ADMIN MANAGEMENT ====================

/**
 * POST /api/admin/create
 * Create new admin (super_admin only)
 */
router.post('/create', adminAuth, requirePermission('manage_admins'), async (req, res) => {
    try {
        const { email, name, role, password } = req.body;

        if (!email || !name || !role) {
            return res.status(400).json({
                success: false,
                error: 'Email, name, and role are required'
            });
        }

        // Check if admin exists
        const existing = await Admin.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Admin with this email already exists'
            });
        }

        const permissions = Admin.getDefaultPermissions(role);
        const tempPassword = password || `Admin${Date.now()}!`;

        const admin = new Admin({
            email: email.toLowerCase(),
            password: tempPassword,
            name,
            role,
            permissions,
            isActive: true,
            mustResetPassword: true,
            createdBy: req.admin._id
        });

        await admin.save();

        await auditLog(req, 'create_admin', 'admin', admin._id, {
            newValue: { email, role },
            metadata: { targetEmail: email }
        });

        res.json({
            success: true,
            message: 'Admin created',
            data: {
                id: admin._id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                tempPassword // Should be sent via secure channel
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create admin'
        });
    }
});

/**
 * GET /api/admin/list
 * List all admins (super_admin only)
 */
router.get('/list', adminAuth, requirePermission('manage_admins'), async (req, res) => {
    try {
        const admins = await Admin.find()
            .select('email name role isActive lastLogin createdAt')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: admins
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch admins'
        });
    }
});

module.exports = router;
