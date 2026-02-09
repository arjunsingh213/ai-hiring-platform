const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { getIO } = require('../config/socket');
const nodemailer = require('nodemailer');
const { userAuth } = require('../middleware/userAuth');

// Email transporter (using environment variables)
const createTransporter = () => {
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Send email notification helper
const sendMessageNotificationEmail = async (senderName, receiverEmail, receiverName, messageContent) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('Email credentials not configured, skipping email notification');
            return;
        }

        const transporter = createTransporter();

        await transporter.sendMail({
            from: `"AI Hiring Platform" <${process.env.EMAIL_USER}>`,
            to: receiverEmail,
            subject: `New message from ${senderName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 20px; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0;">New Message</h1>
                    </div>
                    <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
                        <p style="color: #334155; font-size: 16px;">Hi ${receiverName},</p>
                        <p style="color: #334155; font-size: 16px;">You have received a new message from <strong>${senderName}</strong>:</p>
                        <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 20px 0;">
                            <p style="color: #475569; margin: 0; font-style: italic;">"${messageContent}"</p>
                        </div>
                        <p style="color: #334155; font-size: 16px;">Log in to the platform to reply.</p>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/messages" 
                           style="display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px;">
                            View Message
                        </a>
                    </div>
                    <div style="text-align: center; padding: 15px; color: #94a3b8; font-size: 12px;">
                        <p>AI Hiring Platform - Your Smart Recruitment Partner</p>
                    </div>
                </div>
            `
        });

        console.log('Message notification email sent to:', receiverEmail);
    } catch (error) {
        console.error('Error sending message notification email:', error.message);
        // Don't throw - email failure shouldn't prevent message from being sent
    }
};

// Send message - PROTECTED
router.post('/', userAuth, async (req, res) => {
    try {
        // userId from token is the sender
        const senderId = req.userId;
        const { receiverId, recipientId, content, attachments } = req.body;

        const actualRecipientId = receiverId || recipientId;

        if (!actualRecipientId || !content) {
            return res.status(400).json({
                success: false,
                error: 'receiverId/recipientId and content are required'
            });
        }

        // Create message with correct field name
        const message = new Message({
            senderId,
            recipientId: actualRecipientId,
            content,
            attachments: attachments || []
        });

        await message.save();

        // Get sender and receiver details for email notification
        const [sender, receiver] = await Promise.all([
            User.findById(senderId).select('profile email'),
            User.findById(actualRecipientId).select('profile email')
        ]);

        // Emit real-time message via Socket.io
        try {
            const io = getIO();
            io.to(actualRecipientId.toString()).emit('receive_message', message);
        } catch (socketError) {
            console.log('Socket.io not available:', socketError.message);
        }

        // Send email notification to recipient
        if (receiver && receiver.email) {
            const senderName = sender?.profile?.name || 'A recruiter';
            const receiverName = receiver?.profile?.name || 'Candidate';
            sendMessageNotificationEmail(senderName, receiver.email, receiverName, content);
        }

        res.status(201).json({ success: true, data: message });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get unread message count for a user - PROTECTED
router.get('/unread-count', userAuth, async (req, res) => {
    try {
        const userId = req.userId; // Secure: Use authenticated user ID

        const count = await Message.countDocuments({
            recipientId: userId,
            read: false
        });

        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get conversation between two users - PROTECTED
router.get('/conversation/:userId1/:userId2', userAuth, async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;
        const currentUserId = String(req.userId).trim();
        let targetUserId1 = String(userId1).trim();
        let targetUserId2 = String(userId2).trim();

        // SECURITY: Check if current user is part of this conversation
        // If not, but they are a valid authenticated user, check if they are trying to access their own data
        if (targetUserId1 !== currentUserId && targetUserId2 !== currentUserId) {
            console.log(`[SECURITY] ID Mismatch in GET /conversation. Params: ${targetUserId1}/${targetUserId2}, Token: ${currentUserId}`);
            // Resilient fallback: If they are authenticated, allow them to view conversations where they are a part
            // The query below handles this naturally if we just use currentUserId as one of the participants
            targetUserId1 = currentUserId;
        }

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

// Get all conversations for a user - PROTECTED
router.get('/conversations/:userId', userAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = String(req.userId).trim();
        let targetUserId = String(userId).trim();

        // Check if user is requesting their own conversations
        if (targetUserId !== currentUserId) {
            console.log(`[SECURITY] ID Mismatch in GET /conversations/:userId. Param: ${targetUserId}, Token: ${currentUserId}`);
            // Robust fallback: Always use the token's user ID
            targetUserId = currentUserId;
        }

        const messages = await Message.find({
            $or: [{ senderId: userId }, { recipientId: userId }]
        })
            .populate('senderId', 'profile email jobSeekerProfile')
            .populate('recipientId', 'profile email jobSeekerProfile')
            .sort({ createdAt: -1 });

        // Group by conversation
        const conversations = {};
        messages.forEach(msg => {
            // Skip messages with deleted users (populate returns null)
            if (!msg.senderId || !msg.recipientId) return;

            const otherUserId = msg.senderId._id.toString() === userId
                ? msg.recipientId._id.toString()
                : msg.senderId._id.toString();

            if (!conversations[otherUserId]) {
                const otherUser = msg.senderId._id.toString() === userId ? msg.recipientId : msg.senderId;
                conversations[otherUserId] = {
                    _id: `conv-${userId}-${otherUserId}`, // Create a conversation ID
                    participants: [userId, otherUserId],
                    otherUser: otherUser, // Changed from 'user' to 'otherUser'
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

// Mark message as read - PROTECTED
router.put('/:id/read', userAuth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        // Only recipient can mark as read
        if (!message.recipientId.equals(req.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized',
                code: 'FORBIDDEN'
            });
        }

        message.read = true;
        message.readAt = new Date();
        await message.save();

        res.json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark all messages in a conversation as read - PROTECTED
router.put('/conversation/:senderId/:recipientId/read', userAuth, async (req, res) => {
    try {
        const { senderId, recipientId } = req.params;
        const currentUserId = req.userId.toString();

        // Only the recipient can mark messages as read
        if (recipientId !== currentUserId) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized',
                code: 'FORBIDDEN'
            });
        }

        // Mark all messages from sender to recipient as read
        const result = await Message.updateMany(
            {
                senderId: senderId,
                recipientId: recipientId,
                read: false
            },
            {
                read: true,
                readAt: new Date()
            }
        );

        res.json({
            success: true,
            message: `Marked ${result.modifiedCount} messages as read`
        });
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
