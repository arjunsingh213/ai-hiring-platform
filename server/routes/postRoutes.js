const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Post = require('../models/Post');
const { getIO } = require('../config/socket');

// Configure multer for media uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/posts/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
        }
    }
});

// Create post with media
router.post('/with-media', upload.single('media'), async (req, res) => {
    try {
        const { userId, text, postType, visibility } = req.body;

        const postData = {
            userId,
            content: {
                text: text || '',
                media: []
            },
            postType: postType || 'media',
            visibility: visibility || 'public'
        };

        // Add media file info if uploaded
        if (req.file) {
            const mediaType = req.file.mimetype.startsWith('image/') ? 'image' :
                req.file.mimetype.startsWith('video/') ? 'video' : 'document';

            postData.content.media.push({
                type: mediaType,
                fileId: req.file.filename,
                fileName: req.file.originalname
            });
        }

        const post = new Post(postData);
        await post.save();
        await post.populate('userId');

        res.status(201).json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create text-only post
router.post('/', async (req, res) => {
    try {
        const post = new Post(req.body);
        await post.save();
        await post.populate('userId');

        res.status(201).json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get feed (all public posts)
router.get('/feed', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const posts = await Post.find({ visibility: 'public' })
            .populate('userId')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Post.countDocuments({ visibility: 'public' });

        res.json({
            success: true,
            data: posts,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's posts
router.get('/user/:userId', async (req, res) => {
    try {
        const posts = await Post.find({ userId: req.params.userId })
            .populate('userId')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: posts, count: posts.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Like post
router.post('/:id/like', async (req, res) => {
    try {
        const { userId } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        // Remove from dislikes if exists
        post.engagement.dislikes = post.engagement.dislikes.filter(
            d => d.userId.toString() !== userId
        );

        // Toggle like
        const likeIndex = post.engagement.likes.findIndex(
            l => l.userId.toString() === userId
        );

        if (likeIndex > -1) {
            post.engagement.likes.splice(likeIndex, 1);
        } else {
            post.engagement.likes.push({ userId });
        }

        await post.save();
        res.json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Dislike post
router.post('/:id/dislike', async (req, res) => {
    try {
        const { userId } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        // Remove from likes if exists
        post.engagement.likes = post.engagement.likes.filter(
            l => l.userId.toString() !== userId
        );

        // Toggle dislike
        const dislikeIndex = post.engagement.dislikes.findIndex(
            d => d.userId.toString() === userId
        );

        if (dislikeIndex > -1) {
            post.engagement.dislikes.splice(dislikeIndex, 1);
        } else {
            post.engagement.dislikes.push({ userId });
        }

        await post.save();
        res.json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Comment on post
router.post('/:id/comment', async (req, res) => {
    try {
        const { userId, text } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        post.engagement.comments.push({ userId, text });
        await post.save();
        await post.populate('engagement.comments.userId');

        res.json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Share post
router.post('/:id/share', async (req, res) => {
    try {
        const { userId } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        post.engagement.shares.push({ userId });
        await post.save();

        res.json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Repost
router.post('/:id/repost', async (req, res) => {
    try {
        const { userId } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        post.engagement.reposts.push({ userId });
        await post.save();

        res.json({ success: true, data: post });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
