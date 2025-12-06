const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { getIO } = require('../config/socket');

// Send message
router.post('/', async (req, res) => {
    try {
        const message = new Message(req.body);
        await message.save();

        // Emit real-time message via Socket.io
        const io = getIO();
        io.to(message.recipientId.toString()).emit('receive_message', message);

        res.status(201).json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get conversation between two users
router.get('/conversation/:userId1/:userId2', async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;

        const messages = await Message.find({
            $or: [
                { senderId: userId1, recipientId: userId2 },
                { senderId: userId2, recipientId: userId1 }
            ]
        }).sort({ createdAt: 1 });

        res.json({ success: true, data: messages, count: messages.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all conversations for a user
router.get('/conversations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const messages = await Message.find({
            $or: [{ senderId: userId }, { recipientId: userId }]
        })
            .populate('senderId recipientId')
            .sort({ createdAt: -1 });

        // Group by conversation
        const conversations = {};
        messages.forEach(msg => {
            const otherUserId = msg.senderId._id.toString() === userId
                ? msg.recipientId._id.toString()
                : msg.senderId._id.toString();

            if (!conversations[otherUserId]) {
                conversations[otherUserId] = {
                    user: msg.senderId._id.toString() === userId ? msg.recipientId : msg.senderId,
                    lastMessage: msg,
                    unreadCount: 0
                };
            }

            if (!msg.read && msg.recipientId._id.toString() === userId) {
                conversations[otherUserId].unreadCount++;
            }
        });

        res.json({ success: true, data: Object.values(conversations) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark message as read
router.put('/:id/read', async (req, res) => {
    try {
        const message = await Message.findByIdAndUpdate(
            req.params.id,
            { read: true, readAt: new Date() },
            { new: true }
        );
        res.json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Search users for new conversation
router.get('/search-users/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const User = require('../models/User');

        const users = await User.find({
            $or: [
                { 'profile.name': { $regex: query, $options: 'i' } },
                { 'profile.company': { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        })
            .select('profile email role')
            .limit(10);

        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
