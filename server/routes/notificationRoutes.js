const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { isValidObjectId, validateQueryObjectId, validateBodyObjectId, validateObjectId } = require('../utils/validateObjectId');
// Get user's notifications (paginated)
router.get('/', validateQueryObjectId('userId'), async (req, res) => {
    try {
        const { userId, page = 1, limit = 20, unreadOnly = false } = req.query;

        const query = { userId };
        if (unreadOnly === 'true') {
            query.read = false;
        }

        const notifications = await Notification.find(query)
            .populate('sender', 'profile.name profile.photo profile.headline')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const totalCount = await Notification.countDocuments(query);

        res.json({
            notifications,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: parseInt(page),
            totalCount
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get unread count
router.get('/unread-count', validateQueryObjectId('userId'), async (req, res) => {
    try {
        const { userId } = req.query;

        const count = await Notification.countDocuments({
            userId,
            read: false
        });

        res.json({ count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count', count: 0 });
    }
});

// Mark notification as read
router.put('/:id/read', validateObjectId('id'), async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByIdAndUpdate(
            id,
            {
                read: true,
                readAt: new Date()
            },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ notification });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.put('/mark-all-read', validateBodyObjectId('userId'), async (req, res) => {
    try {
        const { userId } = req.body;

        await Notification.updateMany(
            { userId, read: false },
            {
                read: true,
                readAt: new Date()
            }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

// Delete notification
router.delete('/:id', validateObjectId('id'), async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByIdAndDelete(id);

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Create notification (helper endpoint for testing)
router.post('/create', async (req, res) => {
    try {
        const notification = await Notification.create(req.body);
        res.status(201).json({ notification });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// Trigger daily interview reminder job (admin/cron endpoint)
router.post('/trigger-interview-reminders', async (req, res) => {
    try {
        const { runDailyReminderJob } = require('../jobs/dailyInterviewReminder');
        const result = await runDailyReminderJob();

        res.json({
            success: true,
            message: 'Daily reminder job executed',
            result
        });
    } catch (error) {
        console.error('Error triggering reminder job:', error);
        res.status(500).json({ error: 'Failed to run reminder job' });
    }
});

module.exports = router;
