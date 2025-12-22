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

// Update user profile - MERGE nested fields instead of replacing
router.put('/:id', async (req, res) => {
    try {
        const { profile, jobSeekerProfile, recruiterProfile, isOnboardingComplete } = req.body;

        // Build update object with dot notation to merge nested fields
        const updateData = {};

        // Handle profile fields individually to merge, not replace
        if (profile) {
            Object.keys(profile).forEach(key => {
                updateData[`profile.${key}`] = profile[key];
            });
        }

        // Handle jobSeekerProfile fields individually to merge, not replace
        if (jobSeekerProfile) {
            Object.keys(jobSeekerProfile).forEach(key => {
                // Handle nested portfolioLinks
                if (key === 'portfolioLinks' && typeof jobSeekerProfile[key] === 'object') {
                    Object.keys(jobSeekerProfile[key]).forEach(linkKey => {
                        updateData[`jobSeekerProfile.portfolioLinks.${linkKey}`] = jobSeekerProfile[key][linkKey];
                    });
                } else {
                    updateData[`jobSeekerProfile.${key}`] = jobSeekerProfile[key];
                }
            });
        }

        // Handle recruiterProfile fields individually
        if (recruiterProfile) {
            Object.keys(recruiterProfile).forEach(key => {
                updateData[`recruiterProfile.${key}`] = recruiterProfile[key];
            });
        }

        // Handle top-level boolean
        if (isOnboardingComplete !== undefined) {
            updateData.isOnboardingComplete = isOnboardingComplete;
        }

        console.log('Update data with dot notation:', Object.keys(updateData));

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
        console.error('User update error:', error);
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

// Upload banner image
router.post('/upload-banner', upload.single('banner'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }

        // Upload to cloudinary with banner-specific settings
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'banner_images',
                    public_id: `banner_${userId}_${Date.now()}`,
                    transformation: [
                        { width: 1200, height: 400, crop: 'fill' },
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

        // Update user profile with banner URL
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { 'jobSeekerProfile.bannerImage': result.secure_url } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                bannerUrl: result.secure_url,
                user: user
            }
        });
    } catch (error) {
        console.error('Banner upload error:', error);
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

// Get top candidates by job domain (sorted by talent score)
router.get('/top-candidates/:domainId', async (req, res) => {
    try {
        const { domainId } = req.params;
        const { limit = 5 } = req.query;

        // First try to find candidates in the specific domain
        let candidates = await User.find({
            role: 'jobseeker',
            'jobSeekerProfile.jobDomains': domainId,
            'aiTalentPassport.talentScore': { $gt: 0 }
        })
            .select('profile.name profile.photo profile.headline jobSeekerProfile.domain jobSeekerProfile.jobDomains aiTalentPassport.talentScore aiTalentPassport.levelBand')
            .sort({ 'aiTalentPassport.talentScore': -1 })
            .limit(parseInt(limit));

        // If no candidates found in domain, show all top candidates globally
        if (candidates.length === 0) {
            candidates = await User.find({
                role: 'jobseeker',
                'aiTalentPassport.talentScore': { $gt: 0 }
            })
                .select('profile.name profile.photo profile.headline jobSeekerProfile.domain jobSeekerProfile.jobDomains aiTalentPassport.talentScore aiTalentPassport.levelBand')
                .sort({ 'aiTalentPassport.talentScore': -1 })
                .limit(parseInt(limit));
        }

        res.json({
            success: true,
            data: candidates,
            domain: domainId,
            count: candidates.length,
            isGlobalFallback: candidates.length > 0 && !candidates.some(c => c.jobSeekerProfile?.jobDomains?.includes(domainId))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's job applications
router.get('/:id/applications', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID format',
                data: []
            });
        }

        // Import Job model to find applications
        const Job = require('../models/Job');

        // Find all jobs where the user is in the applicants array
        const appliedJobs = await Job.find({
            'applicants.userId': id
        })
            .select('title company jobDetails applicants requirements status createdAt')
            .populate('company', 'profile.name profile.photo')
            .sort({ 'applicants.appliedAt': -1 });

        // Map to include application-specific data
        const applications = appliedJobs.map(job => {
            const userApplication = job.applicants.find(
                app => app.userId?.toString() === id
            );
            return {
                jobId: job._id,
                jobTitle: job.title,
                company: job.company,
                jobDetails: job.jobDetails,
                requirements: job.requirements,
                status: userApplication?.status || 'applied',
                appliedAt: userApplication?.appliedAt,
                jobStatus: job.status
            };
        });

        res.json({
            success: true,
            data: applications,
            count: applications.length
        });
    } catch (error) {
        console.error('Error fetching user applications:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            data: []
        });
    }
});

module.exports = router;

