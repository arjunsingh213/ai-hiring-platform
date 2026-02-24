const express = require('express');
const router = express.Router();
const UserActivity = require('../models/UserActivity');
const User = require('../models/User');
const { userAuth } = require('../middleware/userAuth');
const { adminAuth } = require('../middleware/adminAuth');

/**
 * POST /api/activity/log
 * Log user activity (frontend reporting)
 */
router.post('/log', userAuth, async (req, res) => {
    try {
        const { action, feature, page, duration, metadata } = req.body;

        const activity = new UserActivity({
            userId: req.user._id,
            action,
            feature,
            page,
            duration: duration || 0,
            metadata,
            timestamp: new Date()
        });

        await activity.save();

        // Update user's lastActive and totalTimeSpent if it's a heartbeat or meaningful action
        const updateData = { lastActive: new Date() };
        if (duration && duration > 0) {
            updateData.$inc = { totalTimeSpent: duration };
        }

        await User.findByIdAndUpdate(req.user._id, updateData);

        res.json({ success: true });
    } catch (error) {
        console.error('Activity logging error:', error);
        res.status(500).json({ success: false, error: 'Failed to log activity' });
    }
});

/**
 * GET /api/admin/activity/:userId
 * Get activity log for a specific user (admin only)
 */
router.get('/admin/:userId', adminAuth, async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;

        const activities = await UserActivity.find({ userId: req.params.userId })
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await UserActivity.countDocuments({ userId: req.params.userId });

        res.json({
            success: true,
            data: {
                activities,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Fetch activity error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activity' });
    }
});

module.exports = router;
