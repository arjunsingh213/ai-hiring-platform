const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

// Create notification
router.post('/', async (req, res) => {
    try {
        const notification = new Notification(req.body);
        await notification.save();

        // Emit real-time notification
        const io = getIO();
        io.to(notification.userId.toString()).emit('receive_notification', notification);

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's notifications
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { read, type } = req.query;

        const query = { userId };
        if (read !== undefined) query.read = read === 'true';
        if (type) query.type = type;

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ success: true, data: notifications, count: notifications.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true, readAt: new Date() },
            { new: true }
        );
        res.json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark all as read
router.put('/user/:userId/read-all', async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.params.userId, read: false },
            { read: true, readAt: new Date() }
        );
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get unread count
router.get('/user/:userId/unread-count', async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            userId: req.params.userId,
            read: false
        });
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
