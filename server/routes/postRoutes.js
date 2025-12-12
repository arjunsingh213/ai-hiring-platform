const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Post = require('../models/Post');
const { getIO } = require('../config/socket');

// Configure multer for memory storage (Cloudinary uploads from buffer)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit (Cloudinary free tier)
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webp/;
        const extname = allowedTypes.test(file.originalname.split('.').pop().toLowerCase());
        const mimetype = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and videos are allowed.'));
        }
    }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer, resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'ai-hiring-platform/posts',
                resource_type: resourceType,
                transformation: resourceType === 'image' ? [
                    { width: 1200, height: 1200, crop: 'limit' },
                    { quality: 'auto' },
                    { fetch_format: 'auto' }
                ] : undefined
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

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

        // Upload to Cloudinary if file exists
        if (req.file) {
            const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
            const result = await uploadToCloudinary(req.file.buffer, resourceType);

            const mediaType = req.file.mimetype.startsWith('image/') ? 'image' :
                req.file.mimetype.startsWith('video/') ? 'video' : 'document';

            postData.content.media.push({
                type: mediaType,
                fileId: result.public_id,
                fileName: req.file.originalname,
                url: result.secure_url
            });
        }

        const post = new Post(postData);
        await post.save();
        await post.populate('userId');

        res.status(201).json({ success: true, data: post });
    } catch (error) {
        console.error('Error creating post with media:', error);
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
        const { page = 1, limit = 20, type = 'jobseeker' } = req.query;

        // Filter posts based on feed type
        let postTypeFilter;
        if (type === 'recruiter') {
            // Recruiter feed: job postings and company updates only
            postTypeFilter = { postType: { $in: ['job_posting', 'company_update'] } };
        } else {
            // Job seeker feed: achievements, ATP, proof of work, text posts
            postTypeFilter = { postType: { $in: ['achievement', 'atp', 'proof_of_work', 'text'] } };
        }

        const posts = await Post.find({
            visibility: 'public',
            ...postTypeFilter
        })
            .populate('userId', 'profile role aiTalentPassport jobSeekerProfile')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Post.countDocuments({
            visibility: 'public',
            ...postTypeFilter
        });

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
