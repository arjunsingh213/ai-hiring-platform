const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Configure cloudinary (using env variables)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create new user (for onboarding)
router.post('/', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        // Return consistent structure
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update user profile
router.put('/:id', async (req, res) => {
    try {
        const { profile, jobSeekerProfile, recruiterProfile } = req.body;

        const updateData = {};
        if (profile) updateData.profile = profile;
        if (jobSeekerProfile) updateData.jobSeekerProfile = jobSeekerProfile;
        if (recruiterProfile) updateData.recruiterProfile = recruiterProfile;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Upload profile photo
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }

        // Upload to cloudinary
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'profile_photos',
                    public_id: `user_${userId}_${Date.now()}`,
                    transformation: [
                        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                        { quality: 'auto' }
                    ]
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        const result = await uploadPromise;

        // Update user profile with photo URL
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { 'profile.photo': result.secure_url } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                photoUrl: result.secure_url,
                user: user
            }
        });
    } catch (error) {
        console.error('Photo upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get users by role
router.get('/role/:role', async (req, res) => {
    try {
        const { role } = req.params;
        const { experienceLevel, interviewCompleted } = req.query;

        const query = { role };

        if (experienceLevel) {
            query['jobSeekerProfile.experienceLevel'] = experienceLevel;
        }

        if (interviewCompleted) {
            query['interviewStatus.completed'] = interviewCompleted === 'true';
        }

        const users = await User.find(query);
        res.json(users);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
