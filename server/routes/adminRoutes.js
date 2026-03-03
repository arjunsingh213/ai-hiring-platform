const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const googleSheetService = require('../services/googleSheetService');
const Interview = require('../models/Interview');
const User = require('../models/User');
const {
    generateAdminToken,
    adminAuth,
    auditLog,
    adminRateLimiter,
    requirePermission
} = require('../middleware/adminAuth');

const AIUsage = require('../models/AIUsage');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const Resume = require('../models/Resume');
const { sendJobInvitationEmail } = require('../utils/email');
const aiUsageService = require('../services/ai/aiUsageService');

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

// ==================== DASHBOARD METRICS ====================

/**
 * GET /api/admin/dashboard/stats
 * Comprehensive dashboard statistics
 */
router.get('/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // User statistics
        const [totalUsers, usersByRole, usersThisWeek, activeUsers] = await Promise.all([
            User.countDocuments(),
            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ]),
            User.countDocuments({ createdAt: { $gte: startOfWeek } }),
            User.countDocuments({ lastActive: { $gte: startOfWeek } })
        ]);

        // Interview statistics
        const [interviewStats, interviewsToday, avgScore, flaggedCount] = await Promise.all([
            Interview.aggregate([
                {
                    $group: {
                        _id: '$adminReview.status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            Interview.countDocuments({ createdAt: { $gte: startOfToday } }),
            Interview.aggregate([
                { $match: { $or: [{ 'scoring.overall': { $exists: true } }, { 'scoring.overallScore': { $exists: true } }] } },
                { $group: { _id: null, avgScore: { $avg: { $ifNull: ['$scoring.overallScore', '$scoring.overall'] } } } }
            ]),
            Interview.countDocuments({
                'proctoring.flags': { $elemMatch: { severity: 'high' } }
            })
        ]);

        // Priority distribution
        const priorityStats = await Interview.aggregate([
            { $match: { 'adminReview.status': 'pending_review' } },
            {
                $group: {
                    _id: '$adminReview.priorityLevel',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Approval rate calculation
        const approvedCount = interviewStats.find(s => s._id === 'approved')?.count || 0;
        const rejectedCount = interviewStats.find(s => s._id === 'rejected')?.count || 0;
        const pendingCount = interviewStats.find(s => s._id === 'pending_review')?.count || 0;
        const totalReviewed = approvedCount + rejectedCount;
        const approvalRate = totalReviewed > 0 ? Math.round((approvedCount / totalReviewed) * 100) : 0;

        // User growth comparison (this week vs last week)
        const lastWeekStart = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
        const usersLastWeek = await User.countDocuments({
            createdAt: { $gte: lastWeekStart, $lt: startOfWeek }
        });
        const userGrowth = usersLastWeek > 0
            ? Math.round(((usersThisWeek - usersLastWeek) / usersLastWeek) * 100)
            : (usersThisWeek > 0 ? 100 : 0);

        const jobseekers = usersByRole.find(r => r._id === 'jobseeker')?.count || 0;
        const recruiters = usersByRole.find(r => r._id === 'recruiter')?.count || 0;

        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    jobseekers,
                    recruiters,
                    newThisWeek: usersThisWeek,
                    activeThisWeek: activeUsers,
                    growthPercent: userGrowth
                },
                interviews: {
                    pending: pendingCount,
                    approved: approvedCount,
                    rejected: rejectedCount,
                    todayCount: interviewsToday,
                    avgScore: avgScore[0]?.avgScore ? Math.round(avgScore[0].avgScore) : 0,
                    approvalRate,
                    byPriority: priorityStats
                },
                flags: {
                    critical: priorityStats.find(p => p._id === 'critical')?.count || 0,
                    high: flaggedCount,
                    total: priorityStats.reduce((sum, p) => sum + (p.count || 0), 0)
                }
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard statistics'
        });
    }
});

/**
 * GET /api/admin/dashboard/activity
 * Recent activity feed
 */
router.get('/dashboard/activity', adminAuth, async (req, res) => {
    try {
        const { limit = 30 } = req.query;

        // Recent admin actions
        const recentActions = await AuditLog.find()
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .populate('adminId', 'name email')
            .lean();

        // Recent interviews submitted (pending review)
        const recentInterviews = await Interview.find({
            'adminReview.status': 'pending_review'
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('userId', 'profile.name email')
            .select('userId interviewType createdAt adminReview.priorityLevel scoring.overall')
            .lean();

        // Recent user signups
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('profile.name email role createdAt')
            .lean();

        // Flagged interviews needing attention
        const flaggedInterviews = await Interview.find({
            'adminReview.status': 'pending_review',
            $or: [
                { 'adminReview.priorityLevel': 'critical' },
                { 'proctoring.flags': { $elemMatch: { severity: 'high' } } }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'profile.name email')
            .select('userId interviewType createdAt adminReview proctoring.flags')
            .lean();

        res.json({
            success: true,
            data: {
                recentActions: recentActions.map(action => ({
                    id: action._id,
                    action: action.action,
                    admin: action.adminId?.name || 'System',
                    target: action.targetType,
                    timestamp: action.timestamp,
                    details: action.reason || action.metadata
                })),
                recentInterviews: recentInterviews.map(interview => ({
                    id: interview._id,
                    candidate: interview.userId?.profile?.name || interview.userId?.email || 'Candidate',
                    type: interview.interviewType,
                    priority: interview.adminReview?.priorityLevel || 'normal',
                    score: interview.scoring?.overallScore || interview.scoring?.overall,
                    submittedAt: interview.createdAt
                })),
                recentUsers: recentUsers.map(user => ({
                    id: user._id,
                    name: user.profile?.name || 'Not set',
                    email: user.email,
                    role: user.role,
                    joinedAt: user.createdAt
                })),
                flaggedInterviews: flaggedInterviews.map(interview => ({
                    id: interview._id,
                    candidate: interview.userId?.profile?.name || interview.userId?.email,
                    flagCount: interview.proctoring?.flags?.length || 0,
                    priority: interview.adminReview?.priorityLevel,
                    submittedAt: interview.createdAt
                }))
            }
        });
    } catch (error) {
        console.error('Dashboard activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity feed'
        });
    }
});

/**
 * GET /api/admin/dashboard/trends
 * Analytics trends for charts (last 30 days)
 */
router.get('/dashboard/trends', adminAuth, async (req, res) => {
    try {
        const daysAgo = 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        // Daily interview submissions
        const interviewTrends = await Interview.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    total: { $sum: 1 },
                    approved: {
                        $sum: { $cond: [{ $eq: ['$adminReview.status', 'approved'] }, 1, 0] }
                    },
                    rejected: {
                        $sum: { $cond: [{ $eq: ['$adminReview.status', 'rejected'] }, 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$adminReview.status', 'pending_review'] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Daily user signups
        const userTrends = await User.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    jobseekers: {
                        $sum: { $cond: [{ $eq: ['$role', 'jobseeker'] }, 1, 0] }
                    },
                    recruiters: {
                        $sum: { $cond: [{ $eq: ['$role', 'recruiter'] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in missing dates with zeros
        const dateRange = [];
        for (let i = daysAgo; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dateRange.push(date.toISOString().split('T')[0]);
        }

        const interviewData = dateRange.map(date => {
            const found = interviewTrends.find(t => t._id === date);
            return {
                date,
                total: found?.total || 0,
                approved: found?.approved || 0,
                rejected: found?.rejected || 0,
                pending: found?.pending || 0
            };
        });

        const userData = dateRange.map(date => {
            const found = userTrends.find(t => t._id === date);
            return {
                date,
                total: found?.count || 0,
                jobseekers: found?.jobseekers || 0,
                recruiters: found?.recruiters || 0
            };
        });

        res.json({
            success: true,
            data: {
                interviews: interviewData,
                users: userData
            }
        });
    } catch (error) {
        console.error('Dashboard trends error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trends'
        });
    }
});

/**
 * GET /api/admin/users/export-sheet
 * Download the Google Sheets user sync data as CSV
 */
router.get('/users/export-sheet', adminAuth, requirePermission('view_users'), async (req, res) => {
    try {
        const csvData = await googleSheetService.exportSheetAsCSV();

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="Froscel_Users_Export.csv"');

        res.send(csvData);
    } catch (error) {
        console.error('Export sheet error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export sheet data'
        });
    }
});

// ==================== AI MONITORING ====================

/**
 * GET /api/admin/ai/stats
 * Get comprehensive AI usage statistics
 */
router.get('/ai/stats', adminAuth, requirePermission('view_audit_logs'), async (req, res) => {
    try {
        const stats = await aiUsageService.getGlobalStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('AI stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI statistics'
        });
    }
});

/**
 * GET /api/admin/ai/activity
 * Get recent AI activity logs with filters
 */
router.get('/ai/activity', adminAuth, requirePermission('view_audit_logs'), async (req, res) => {
    try {
        const { limit = 20, model, purpose, status, userId } = req.query;

        const query = {};
        if (model) query.model = { $regex: model, $options: 'i' };
        if (purpose) query.purpose = purpose;
        if (status) query.status = status;
        if (userId) query.userId = userId;

        const logs = await AIUsage.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .populate('userId', 'profile.name email')
            .lean();

        res.json({
            success: true,
            data: {
                logs
            }
        });
    } catch (error) {
        console.error('AI activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI activity'
        });
    }
});

/**
 * GET /api/admin/interviews/pending
 * Get all interviews pending review
 */
router.get('/interviews/pending', adminAuth, requirePermission('view_interviews'), async (req, res) => {
    try {
        const { page = 1, limit = 20, priority, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const query = {
            status: { $in: ['pending_review', 'completed'] },
            'adminReview.status': 'pending_review'
        };

        // When filtering for critical/flagged, also include high proctoring risk
        if (priority === 'critical') {
            // Show interviews that are either:
            // 1. Marked as critical priority
            // 2. Have high proctoring risk level
            // 3. Have multiple proctoring flags
            query.$or = [
                { 'adminReview.priorityLevel': 'critical' },
                { 'proctoring.riskLevel': 'high' },
                { 'proctoring.totalFlags': { $gte: 3 } }
            ];
        } else if (priority) {
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
 * POST /api/admin/interviews/:id/undo-decision
 * Undo/reset a previous admin decision and return to pending_review
 */
router.post('/interviews/:id/undo-decision', adminAuth, requirePermission('approve_interviews'), async (req, res) => {
    try {
        const { reason } = req.body;

        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        // Store previous value for audit log
        const previousValue = {
            status: interview.adminReview?.status,
            finalScore: interview.adminReview?.finalScore,
            cheatingConfirmed: interview.adminReview?.cheatingConfirmed
        };

        // Reset to pending review
        interview.adminReview.status = 'pending_review';
        interview.adminReview.reviewedBy = null;
        interview.adminReview.reviewedAt = null;
        interview.adminReview.cheatingConfirmed = false;
        interview.adminReview.cheatingDetails = null;
        interview.adminReview.scoreAdjusted = false;
        interview.adminReview.adminNotes = reason ? `[Decision undone] ${reason}` : '[Decision undone by admin]';
        interview.status = 'pending_review';
        interview.passed = false;
        interview.resultVisibleToCandidate = false;

        await interview.save();

        await auditLog(req, 'undo_decision', 'interview', interview._id, {
            previousValue,
            newValue: { status: 'pending_review' },
            reason: reason || 'Decision reset by admin',
            metadata: {
                undoneBy: req.admin.name || req.admin.email
            }
        });

        res.json({
            success: true,
            message: 'Decision undone - interview returned to pending review'
        });
    } catch (error) {
        console.error('Undo decision error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to undo decision'
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

        // Update user's platform interview status
        if (interview.interviewType === 'combined' || !interview.jobId) {
            await User.findByIdAndUpdate(interview.userId, {
                'platformInterview.status': 'failed',
                'platformInterview.lastAttemptAt': new Date(),
                // Disable direct retry until cooldown if needed? 
                // For now, allow retry button to show in UI
                'platformInterview.canRetry': true
            });
        }

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
                .select('profile email role platformInterview aiTalentPassport accountStatus createdAt lastActive')
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
 * GET /api/admin/users/:id/resume
 * Get user's resume data
 */
router.get('/users/:id/resume', adminAuth, requirePermission('view_users'), async (req, res) => {
    try {
        const Resume = require('../models/Resume');
        const resume = await Resume.findOne({ userId: req.params.id }).lean();

        if (!resume) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found for this user'
            });
        }

        res.json({
            success: true,
            data: resume
        });
    } catch (error) {
        console.error('Fetch resume error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch resume'
        });
    }
});

/**
 * GET /api/admin/users/:id/resume/download
 * Download user's resume file
 */
router.get('/users/:id/resume/download', adminAuth, requirePermission('view_users'), async (req, res) => {
    try {
        const Resume = require('../models/Resume');
        const resume = await Resume.findOne({ userId: req.params.id });

        if (!resume || !resume.fileUrl) {
            return res.status(404).json({
                success: false,
                error: 'Resume file not found'
            });
        }

        res.redirect(resume.fileUrl);
    } catch (error) {
        console.error('Download resume error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download resume'
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

        // Background: Sync to Google Sheets
        googleSheetService.syncUser(user).catch(err => {
            console.error('Failed to background sync suspended user to sheets:', err);
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

        // Background: Sync to Google Sheets
        googleSheetService.syncUser(user).catch(err => {
            console.error('Failed to background sync unsuspended user to sheets:', err);
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

        // Background: Sync to Google Sheets
        googleSheetService.syncUser(user);

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

        // Background: Sync to Google Sheets
        googleSheetService.syncUser(user);

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

/**
 * POST /api/admin/users/:id/update-atp
 * Update user's ATP score manually
 */
router.post('/users/:id/update-atp', adminAuth, requirePermission('adjust_scores'), async (req, res) => {
    try {
        const { newScore, reason } = req.body;
        const { id } = req.params;

        if (newScore === undefined || newScore < 0 || newScore > 100) {
            return res.status(400).json({
                success: false,
                error: 'Invalid score. Must be between 0 and 100.'
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Reason for ATP update is required.'
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const previousScore = user.aiTalentPassport?.talentScore || 0;

        // Initialize aiTalentPassport if it doesn't exist
        if (!user.aiTalentPassport) {
            user.aiTalentPassport = {
                talentScore: 0,
                skills: [],
                lastUpdated: new Date()
            };
        }

        user.aiTalentPassport.talentScore = newScore;
        user.aiTalentPassport.lastUpdated = new Date();

        await user.save();

        // Log the action
        await auditLog(req, 'update_atp', 'user', user._id, {
            previousValue: { talentScore: previousScore },
            newValue: { talentScore: newScore },
            reason,
            metadata: {
                targetEmail: user.email,
                targetName: user.profile?.name
            }
        });

        // Background: Sync to Google Sheets
        googleSheetService.syncUser(user);

        res.json({
            success: true,
            message: 'ATP score updated successfully',
            data: {
                talentScore: newScore
            }
        });
    } catch (error) {
        console.error('Update ATP error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update ATP score'
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

/**
 * PUT /api/admin/:id
 * Update admin details (super_admin only)
 */
router.put('/:id', adminAuth, requirePermission('manage_admins'), async (req, res) => {
    try {
        const { name, role, permissions } = req.body;
        const targetAdmin = await Admin.findById(req.params.id);

        if (!targetAdmin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found'
            });
        }

        // Prevent modifying own role
        if (req.admin._id.toString() === req.params.id && role && role !== targetAdmin.role) {
            return res.status(400).json({
                success: false,
                error: 'Cannot modify your own role'
            });
        }

        const updates = {};
        if (name) updates.name = name;
        if (role) {
            updates.role = role;
            updates.permissions = permissions || Admin.getDefaultPermissions(role);
        } else if (permissions) {
            updates.permissions = permissions;
        }

        const updatedAdmin = await Admin.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        ).select('email name role isActive lastLogin createdAt');

        await auditLog(req, 'update_admin', 'admin', targetAdmin._id, {
            previousValue: { name: targetAdmin.name, role: targetAdmin.role },
            newValue: updates,
            metadata: { targetEmail: targetAdmin.email }
        });

        res.json({
            success: true,
            message: 'Admin updated',
            data: updatedAdmin
        });
    } catch (error) {
        console.error('Update admin error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update admin'
        });
    }
});

/**
 * POST /api/admin/:id/toggle-status
 * Activate or deactivate admin (super_admin only)
 */
router.post('/:id/toggle-status', adminAuth, requirePermission('manage_admins'), async (req, res) => {
    try {
        const targetAdmin = await Admin.findById(req.params.id);

        if (!targetAdmin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found'
            });
        }

        // Prevent deactivating yourself
        if (req.admin._id.toString() === req.params.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot deactivate your own account'
            });
        }

        targetAdmin.isActive = !targetAdmin.isActive;
        await targetAdmin.save();

        await auditLog(req, targetAdmin.isActive ? 'activate_admin' : 'deactivate_admin', 'admin', targetAdmin._id, {
            newValue: { isActive: targetAdmin.isActive },
            metadata: { targetEmail: targetAdmin.email }
        });

        res.json({
            success: true,
            message: `Admin ${targetAdmin.isActive ? 'activated' : 'deactivated'}`,
            data: { isActive: targetAdmin.isActive }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to toggle admin status'
        });
    }
});

// ==================== CANDIDATE INVITATIONS ====================

/**
 * POST /api/admin/jobs/:jobId/invite/:userId
 * Send a professional job invitation email to a suitable candidate
 */
router.post('/jobs/:jobId/invite/:userId', adminAuth, requirePermission('view_users'), async (req, res) => {
    try {
        const { jobId, userId } = req.params;
        const job = await Job.findById(jobId);
        const candidate = await User.findById(userId);

        if (!job || !candidate) {
            return res.status(404).json({
                success: false,
                error: 'Job or Candidate not found.'
            });
        }

        // 1. Send an industry-standard email
        await sendJobInvitationEmail(candidate, job);

        // 2. Add an in-app Notification for the candidate
        const notification = new Notification({
            userId: candidate._id,
            type: 'job_recommendation',
            title: `You are invited to apply for ${job.title}`,
            message: `Froscel has identified you as a great fit for ${job.title} at ${job.company?.name || 'our platform'}! Review the details and apply while openings remain.`,
            relatedEntity: {
                entityType: 'job',
                entityId: job._id
            },
            actionUrl: `/jobseeker/jobs?id=${job._id}`,
            actionText: 'View Job'
        });
        await notification.save();

        // 3. Log Audit
        await auditLog(req, 'invite_candidate', 'user', candidate._id, {
            reason: 'Invited based on strong profile match',
            metadata: { targetEmail: candidate.email, jobToken: job.title }
        });

        return res.json({
            success: true,
            message: `Invitation successfully sent to ${candidate.profile?.name || candidate.email}.`
        });

    } catch (error) {
        console.error('Job invitation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to dispatch the job invitation.'
        });
    }
});

/**
 * POST /api/admin/:id/force-reset-password
 * Force password reset for admin (super_admin only)
 */
router.post('/:id/force-reset-password', adminAuth, requirePermission('manage_admins'), async (req, res) => {
    try {
        const targetAdmin = await Admin.findById(req.params.id);

        if (!targetAdmin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found'
            });
        }

        // Generate temporary password
        const tempPassword = `Reset${Date.now()}!`;
        targetAdmin.password = tempPassword;
        targetAdmin.mustResetPassword = true;
        await targetAdmin.save();

        await auditLog(req, 'force_reset_password', 'admin', targetAdmin._id, {
            metadata: { targetEmail: targetAdmin.email }
        });

        res.json({
            success: true,
            message: 'Password reset initiated',
            data: { tempPassword } // In production, send via secure channel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to reset password'
        });
    }
});

/**
 * DELETE /api/admin/:id
 * Delete admin account (super_admin only)
 */
router.delete('/:id', adminAuth, requirePermission('manage_admins'), async (req, res) => {
    try {
        const targetAdmin = await Admin.findById(req.params.id);

        if (!targetAdmin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found'
            });
        }

        // Prevent deleting yourself
        if (req.admin._id.toString() === req.params.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }

        // Prevent deleting last super_admin
        if (targetAdmin.role === 'super_admin') {
            const superAdminCount = await Admin.countDocuments({ role: 'super_admin' });
            if (superAdminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete the last super admin'
                });
            }
        }

        await Admin.findByIdAndDelete(req.params.id);

        await auditLog(req, 'delete_admin', 'admin', targetAdmin._id, {
            metadata: { targetEmail: targetAdmin.email, deletedRole: targetAdmin.role }
        });

        res.json({
            success: true,
            message: 'Admin deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete admin'
        });
    }
});

/**
 * GET /api/admin/:id/activity
 * Get specific admin's activity log
 */
router.get('/:id/activity', adminAuth, requirePermission('manage_admins'), async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const logs = await AuditLog.find({ adminId: req.params.id })
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await AuditLog.countDocuments({ adminId: req.params.id });

        res.json({
            success: true,
            data: {
                logs,
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
            error: 'Failed to fetch admin activity'
        });
    }
});

// ==================== JOB APPLICATION REVIEW ====================

const { sendEmail } = require('../services/emailService');

/**
 * Compute AI fit score by comparing resume skills/domain with job requirements.
 * Returns { fitScore (0-100), fitLabel, fitColor }
 */
function computeFitScore(user, resume, job) {
    const jobSkills = (job.requirements?.skills || []).map(s => s.toLowerCase().trim());
    const resumeSkills = (resume?.parsedData?.skills || user?.jobSeekerProfile?.skills || []).map(s => s.toLowerCase().trim());
    const userDomain = (user?.jobSeekerProfile?.domain || user?.jobSeekerProfile?.desiredRole || '').toLowerCase();
    const jobDomain = (job.domain || job.title || '').toLowerCase();

    if (jobSkills.length === 0) {
        return { fitScore: 50, fitLabel: 'No Requirements Set', fitColor: '#94a3b8' };
    }

    // Skill match: what fraction of required skills does the candidate have?
    const matchedSkills = jobSkills.filter(js =>
        resumeSkills.some(rs => rs.includes(js) || js.includes(rs))
    );
    const skillMatch = matchedSkills.length / jobSkills.length;

    // Domain relevance: simple keyword overlap between user domain and job title/domain
    const domainWords = jobDomain.split(/[\s\-_,]+/).filter(w => w.length > 2);
    const userDomainWords = userDomain.split(/[\s\-_,]+/).filter(w => w.length > 2);
    const domainOverlap = domainWords.length > 0
        ? domainWords.filter(dw => userDomainWords.some(uw => uw.includes(dw) || dw.includes(uw))).length / domainWords.length
        : 0;

    const fitScore = Math.round((skillMatch * 0.65 + domainOverlap * 0.35) * 100);

    let fitLabel, fitColor;
    if (fitScore >= 70) { fitLabel = 'Strong Match'; fitColor = '#10b981'; }
    else if (fitScore >= 40) { fitLabel = 'Partial Match'; fitColor = '#f59e0b'; }
    else { fitLabel = 'Weak Match'; fitColor = '#ef4444'; }

    return { fitScore, fitLabel, fitColor, matchedSkills, totalRequired: jobSkills.length };
}

/**
 * GET /api/admin/applications
 * List all job applications pending admin review, with AI fit scoring
 */
router.get('/applications', adminAuth, async (req, res) => {
    try {
        const { status = 'applied', page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        // 1. Find all jobs that have applicants with the requested status
        const jobs = await Job.find({
            'applicants.status': status
        }).populate({
            path: 'applicants.userId',
            select: 'profile email jobSeekerProfile aiTalentPassport'
        });

        // 2. Flatten into a raw list of applications *without* processing fit scores or DB lookups yet
        let rawApplications = [];

        for (const job of jobs) {
            const matchingApplicants = job.applicants.filter(a => a.status === status && a.userId);
            for (const applicant of matchingApplicants) {
                rawApplications.push({
                    job,
                    applicant,
                    appliedAt: applicant.appliedAt
                });
            }
        }

        // 3. Sort by applied date (newest first)
        rawApplications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

        const total = rawApplications.length;

        // 4. Extract just the page we need
        const paginatedRawApps = rawApplications.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        // 5. Bulk fetch resumes for just this page
        const userIdsForPage = paginatedRawApps.map(app => app.applicant.userId._id);
        const resumes = await Resume.find({ userId: { $in: userIdsForPage } });

        // Build a lookup map of userId -> resume
        const resumeMap = {};
        resumes.forEach(resume => {
            resumeMap[resume.userId.toString()] = resume;
        });

        // 6. Process only the paginated subset
        const applications = paginatedRawApps.map(({ job, applicant }) => {
            const userStrId = applicant.userId._id.toString();
            const resume = resumeMap[userStrId] || null;

            const fit = computeFitScore(applicant.userId, resume, job);

            return {
                jobId: job._id,
                jobTitle: job.title,
                jobCompany: job.company?.name || 'N/A',
                jobDomain: job.domain || 'General',
                jobSkills: job.requirements?.skills || [],
                userId: applicant.userId._id,
                userName: applicant.userId.profile?.name || 'Unknown',
                userEmail: applicant.userId.email,
                userPhoto: applicant.userId.profile?.photo,
                userDomain: applicant.userId.jobSeekerProfile?.domain || applicant.userId.jobSeekerProfile?.desiredRole || 'N/A',
                userSkills: resume?.parsedData?.skills || applicant.userId.jobSeekerProfile?.skills || [],
                atpScore: applicant.userId.aiTalentPassport?.talentScore || 0,
                hasResume: !!resume,
                resumeFileName: resume?.fileName || null,
                appliedAt: applicant.appliedAt,
                status: applicant.status,
                fitScore: fit.fitScore,
                fitLabel: fit.fitLabel,
                fitColor: fit.fitColor,
                matchedSkills: fit.matchedSkills || [],
                totalRequired: fit.totalRequired || 0
            };
        });

        res.json({
            success: true,
            data: {
                applications,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            }
        });
    } catch (error) {
        console.error('Fetch applications error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch applications' });
    }
});

/**
 * POST /api/admin/applications/:jobId/:userId/approve
 * Approve a candidate's application — sends email + in-app notification
 */
router.post('/applications/:jobId/:userId/approve', adminAuth, async (req, res) => {
    try {
        const { jobId, userId } = req.params;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

        const applicant = job.applicants.find(a => a.userId.toString() === userId);
        if (!applicant) return res.status(404).json({ success: false, error: 'Applicant not found' });
        if (applicant.status !== 'applied') {
            return res.status(400).json({ success: false, error: `Applicant already has status: ${applicant.status}` });
        }

        // Update status to interviewing
        applicant.status = 'interviewing';
        await job.save();

        // Get user info for notification/email
        const user = await User.findById(userId);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Attempt to send notifications and audit log, but don't fail the request if they fail
        try {
            // Create in-app notification
            await Notification.create({
                userId,
                type: 'application_status',
                title: 'Application Approved!',
                message: `Your application for "${job.title}" at ${job.company?.name || 'the company'} has been approved! You can now proceed to the interview.`,
                relatedEntity: { entityType: 'job', entityId: job._id },
                actionUrl: '/jobseeker/jobs',
                actionText: 'View Jobs',
                priority: 'high'
            });

            // Send email
            if (user?.email) {
                const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 32px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f9fafb; padding: 32px; }
        .detail-card { background: white; border-radius: 10px; padding: 20px; margin: 16px 0; border: 1px solid #e5e7eb; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; }
        .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Application Approved!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>${user.profile?.name || 'there'}</strong>,</p>
            <p>Great news! Your application for <strong>${job.title}</strong> at <strong>${job.company?.name || 'the company'}</strong> has been approved.</p>
            <div class="detail-card">
                <p><strong>Next Step:</strong> You can now take the job-specific interview. Log in to your dashboard to get started.</p>
            </div>
            <center style="margin: 24px 0;">
                <a href="${frontendUrl}/jobseeker/jobs" class="cta-button">
                    View Jobs →
                </a>
            </center>
            <p>Best of luck!<br/>The AI Hiring Platform Team</p>
        </div>
        <div class="footer">
            <p>This email was sent by AI Hiring Platform.</p>
        </div>
    </div>
</body>
</html>`.trim();

                await sendEmail({
                    to: user.email,
                    subject: `Application Approved — ${job.title}`,
                    text: `Your application for ${job.title} has been approved! Log in to proceed to the interview.`,
                    html
                });
            }

            // Audit log
            await auditLog(req, 'approve_application', 'job', job._id, {
                userId, jobTitle: job.title
            });
        } catch (setupError) {
            console.error('Failed to send approval notifications/email:', setupError);
            // Non-fatal error since DB update succeeded
        }

        res.json({
            success: true,
            message: 'Application approved. Candidate has been notified.'
        });
    } catch (error) {
        console.error('Approve application error:', error);
        res.status(500).json({ success: false, error: 'Failed to approve application' });
    }
});

/**
 * POST /api/admin/applications/:jobId/:userId/reject
 * Reject a candidate's application — sends email + in-app notification
 */
router.post('/applications/:jobId/:userId/reject', adminAuth, async (req, res) => {
    try {
        const { jobId, userId } = req.params;
        const { reason } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

        const applicant = job.applicants.find(a => a.userId.toString() === userId);
        if (!applicant) return res.status(404).json({ success: false, error: 'Applicant not found' });
        if (applicant.status !== 'applied') {
            return res.status(400).json({ success: false, error: `Applicant already has status: ${applicant.status}` });
        }

        // Update status
        applicant.status = 'rejected';
        applicant.rejectionReason = reason || 'Application did not meet requirements for this role.';
        await job.save();

        // Get user info
        const user = await User.findById(userId);

        // Attempt to send notifications and audit log, but don't fail the request if they fail
        try {
            // In-app notification
            await Notification.create({
                userId,
                type: 'application_status',
                title: 'Application Update',
                message: `Your application for "${job.title}" has been reviewed. Unfortunately, we are moving forward with other candidates at this time.`,
                relatedEntity: { entityType: 'job', entityId: job._id },
                actionUrl: '/jobseeker/jobs',
                actionText: 'Browse More Jobs',
                priority: 'medium'
            });

            // Send email
            if (user?.email) {
                const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 32px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f9fafb; padding: 32px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; }
        .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Application Update</h1>
        </div>
        <div class="content">
            <p>Hi <strong>${user.profile?.name || 'there'}</strong>,</p>
            <p>Thank you for applying for <strong>${job.title}</strong> at <strong>${job.company?.name || 'the company'}</strong>.</p>
            <p>After careful review, we've decided to move forward with other candidates for this position. We encourage you to continue exploring other opportunities on our platform.</p>
            <center style="margin: 24px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/jobseeker/jobs" class="cta-button">
                    Browse More Jobs →
                </a>
            </center>
            <p>Best regards,<br/>The AI Hiring Platform Team</p>
        </div>
        <div class="footer">
            <p>This email was sent by AI Hiring Platform.</p>
        </div>
    </div>
</body>
</html>`.trim();

                await sendEmail({
                    to: user.email,
                    subject: `Application Update — ${job.title}`,
                    text: `Thank you for applying for ${job.title}. After review, we've decided to move forward with other candidates.`,
                    html
                });
            }

            // Audit log
            await auditLog(req, 'reject_application', 'job', job._id, {
                userId, jobTitle: job.title, reason
            });
        } catch (setupError) {
            console.error('Failed to send rejection notifications/email:', setupError);
            // Non-fatal error since DB update succeeded
        }

        res.json({
            success: true,
            message: 'Application rejected. Candidate has been notified.'
        });
    } catch (error) {
        console.error('Reject application error:', error);
        res.status(500).json({ success: false, error: 'Failed to reject application' });
    }
});

/**
 * GET /api/admin/applications/stats
 * Quick stats for applications
 */
router.get('/applications/stats', adminAuth, async (req, res) => {
    try {
        const jobs = await Job.find({
            'applicants.0': { $exists: true }
        });

        let pending = 0, approved = 0, rejected = 0;
        for (const job of jobs) {
            for (const app of job.applicants) {
                if (app.status === 'applied') pending++;
                else if (app.status === 'interviewing' || app.status === 'shortlisted' || app.status === 'hired') approved++;
                else if (app.status === 'rejected') rejected++;
            }
        }

        res.json({
            success: true,
            data: { pending, approved, rejected, total: pending + approved + rejected }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

// ==================== ADMIN JOBS MANAGEMENT ====================

/**
 * GET /api/admin/jobs
 * Get all posted jobs across the platform with pagination and filters
 */
router.get('/jobs', adminAuth, requirePermission('view_interviews'), async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const query = {};

        if (status && status !== 'all') query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { 'company.name': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const [jobs, total] = await Promise.all([
            Job.find(query)
                .populate('recruiterId', 'profile.name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Job.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                jobs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Fetch admin jobs error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
    }
});

/**
 * PUT /api/admin/jobs/:id
 * Update job details
 */
router.put('/jobs/:id', adminAuth, requirePermission('approve_interviews'), async (req, res) => {
    try {
        const updates = req.body;

        // Prevent changing recruiter ownership entirely without caution
        if (updates.recruiterId) delete updates.recruiterId;

        const job = await Job.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        await auditLog(req, 'admin_update_job', 'job', job._id, { updates });

        res.json({ success: true, data: job });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ success: false, error: 'Failed to update job' });
    }
});

/**
 * DELETE /api/admin/jobs/:id
 * Instead of hard delete, mark it closed.
 */
router.delete('/jobs/:id', adminAuth, requirePermission('approve_interviews'), async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        job.status = 'closed';
        await job.save();

        await auditLog(req, 'admin_close_job', 'job', job._id, { action: 'closed_by_admin' });

        res.json({ success: true, message: 'Job has been marked as closed.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to close job.' });
    }
});

module.exports = router;
