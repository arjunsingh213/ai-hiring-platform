const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const Post = require('../models/Post');

// Get all active challenges
router.get('/', async (req, res) => {
    try {
        const { domain } = req.query;
        const query = { status: 'active' };
        if (domain) query.domain = domain;

        const challenges = await Challenge.find(query)
            .populate('creatorId', 'profile.name profile.photo')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: challenges });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create a new challenge
router.post('/', async (req, res) => {
    try {
        const { creatorId, title, description, domain, difficulty, requirements, deadline } = req.body;

        const challenge = new Challenge({
            creatorId,
            title,
            description,
            domain,
            difficulty,
            requirements,
            deadline
        });

        await challenge.save();

        // Automatically create a post for this challenge
        const post = new Post({
            userId: creatorId,
            postType: 'challenge',
            content: {
                title,
                text: description,
                challengeId: challenge._id,
                domain
            },
            visibility: 'public'
        });

        await post.save();

        res.status(201).json({ success: true, data: challenge });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Join a challenge
router.post('/:id/join', async (req, res) => {
    try {
        const { userId } = req.body;
        const challenge = await Challenge.findById(req.params.id);

        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        if (challenge.participants.some(p => p.userId.toString() === userId)) {
            return res.status(400).json({ success: false, error: 'Already joined this challenge' });
        }

        challenge.participants.push({ userId });
        await challenge.save();

        res.json({ success: true, data: challenge });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Submit challenge work
router.post('/:id/submit', async (req, res) => {
    try {
        const { userId, content } = req.body;
        const challenge = await Challenge.findById(req.params.id);

        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        if (!challenge.participants.some(p => p.userId.toString() === userId)) {
            return res.status(400).json({ success: false, error: 'Must join challenge before submitting' });
        }

        challenge.submissions.push({ userId, content });
        await challenge.save();

        res.json({ success: true, data: challenge });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
