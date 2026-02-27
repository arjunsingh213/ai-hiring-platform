const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { userAuth, requireOwnership } = require('../middleware/userAuth');

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

// Search users by name - Publicly accessible
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const query = {
            'profile.name': { $regex: q, $options: 'i' },
            'accountStatus.isSuspended': { $ne: true } // Don't show suspended users
        };

        const users = await User.find(query)
            .select('profile.name profile.photo profile.headline role aiTalentPassport.talentScore recruiterProfile.companyName')
            .limit(10);

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user by ID - Publicly accessible for profile views
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Remove sensitive fields if not the owner or recruiter
        // (Optional: add more granular protection here if needed)

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update user profile - PROTECTED: Only owner can update
router.put('/:id', userAuth, requireOwnership('id'), async (req, res) => {
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


// Upload profile photo - PROTECTED
router.post('/upload-photo', userAuth, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const userId = req.userId; // Secure: Use authenticated user ID

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

// Upload banner image - PROTECTED
router.post('/upload-banner', userAuth, upload.single('banner'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const userId = req.userId; // Secure: Use authenticated user ID

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
        const { limit = 25, timeframe = 'all-time' } = req.query;

        let query = {
            role: 'jobseeker',
            'aiTalentPassport.talentScore': { $gt: 0 }
        };

        // If not "all", filter by specific domain
        if (domainId && domainId !== 'all') {
            query['jobSeekerProfile.jobDomains'] = domainId;
        }

        // Add timeframe filter based on aiTalentPassport.lastUpdated
        if (timeframe === 'weekly') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            query['aiTalentPassport.lastUpdated'] = { $gte: lastWeek };
        } else if (timeframe === 'monthly') {
            const lastMonth = new Date();
            lastMonth.setDate(lastMonth.getDate() - 30);
            query['aiTalentPassport.lastUpdated'] = { $gte: lastMonth };
        }

        let candidates = await User.find(query)
            .select('profile.name profile.photo profile.headline jobSeekerProfile.domain jobSeekerProfile.jobDomains aiTalentPassport.talentScore aiTalentPassport.levelBand aiTalentPassport.lastUpdated')
            .sort({ 'aiTalentPassport.talentScore': -1 })
            .limit(parseInt(limit));

        // Global fallback only if domain search failed and we are in all-time
        if (candidates.length === 0 && domainId !== 'all' && timeframe === 'all-time') {
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
            timeframe: timeframe,
            count: candidates.length,
            isGlobalFallback: candidates.length > 0 && domainId !== 'all' && !candidates.some(c => c.jobSeekerProfile?.jobDomains?.includes(domainId))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's job applications - PROTECTED
router.get('/:id/applications', userAuth, requireOwnership('id'), async (req, res) => {
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

// Upload verification document - PROTECTED
router.post('/upload-verification-doc', userAuth, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const userId = req.userId; // Secure: Use authenticated user ID

        // Upload to cloudinary with document-specific settings
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'verification_docs',
                    public_id: `verify_${userId}_${Date.now()}`,
                    resource_type: 'auto', // Allow PDFs too
                    transformation: [
                        { width: 1000, height: 1000, crop: 'limit' } // Limit size but maintain aspect ratio
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

        // Update user profile with document URL and set status to pending
        const user = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    'recruiterProfile.businessCard': result.secure_url,
                    'recruiterProfile.verified': false // pending manual review
                }
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                docUrl: result.secure_url,
                user: user
            }
        });
    } catch (error) {
        console.error('Verification doc upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;

