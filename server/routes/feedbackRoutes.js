const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { userAuth } = require('../middleware/userAuth');
const { adminAuth } = require('../middleware/adminAuth');

/**
 * @route   POST /api/feedback
 * @desc    Submit feedback for a feature
 * @access  Private
 */
router.post('/', userAuth, async (req, res) => {
    try {
        const { featureId, rating, insights, comment } = req.body;

        if (!featureId || !rating) {
            return res.status(400).json({
                success: false,
                error: 'Please provide featureId and rating'
            });
        }

        const feedback = new Feedback({
            userId: req.userId,
            featureId,
            rating,
            insights: insights || [],
            comment,
            userRole: req.user.role
        });

        await feedback.save();

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully'
        });
    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/feedback
 * @desc    Get all feedback (Admin only)
 * @access  Private/Admin
 */
router.get('/', adminAuth, async (req, res) => {
    try {
        // If the user wants to see it on the admin page, I should check if user is admin.
        if (req.admin.role !== 'admin' && req.admin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const { featureId } = req.query;
        const query = featureId ? { featureId } : {};

        const feedbacks = await Feedback.find(query)
            .populate('userId', 'email profile')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: feedbacks
        });
    } catch (error) {
        console.error('Fetch feedback error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/feedback/stats
 * @desc    Get feedback statistics (Admin only)
 * @access  Private/Admin
 */
router.get('/stats', adminAuth, async (req, res) => {
    try {
        if (req.admin.role !== 'admin' && req.admin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const stats = await Feedback.aggregate([
            {
                $group: {
                    _id: '$featureId',
                    averageRating: { $avg: '$rating' },
                    count: { $sum: 1 },
                    insights: { $push: '$insights' }
                }
            }
        ]);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Fetch feedback stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
