const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Resume = require('../models/Resume');
const User = require('../models/User');
const resumeParser = require('../services/resume/resumeParser');
const aiService = require('../services/ai/aiService');

const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure multer for Cloudinary upload (serverless-compatible)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'resumes',
        allowed_formats: ['pdf', 'doc', 'docx'],
        resource_type: 'raw', // Important for non-image files
        public_id: (req, file) => `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only PDF and DOCX files are allowed'));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Upload and parse resume
router.post('/upload', upload.single('resume'), async (req, res) => {
    try {
        const { userId } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        let parsedData = {
            rawText: '',
            skills: [],
            experience: [],
            education: [],
            projects: []
        };

        // Try to parse resume, but don't fail if parsing fails
        try {
            // For Cloudinary, req.file.path contains the Cloudinary URL
            // Download the file from Cloudinary and parse it
            const fileUrl = req.file.path; // Cloudinary URL
            parsedData = await resumeParser.parseResumeFromUrl(fileUrl, req.file.mimetype);
        } catch (parseError) {
            console.error('Resume parsing error (non-fatal):', parseError.message);
            // Continue with empty parsed data
        }

        // Create resume record with Cloudinary URL
        const resume = new Resume({
            userId,
            fileId: req.file.filename, // Cloudinary public_id
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileUrl: req.file.path, // Cloudinary URL
            parsedData,
            aiAnalysis: {
                keyStrengths: ['Communication', 'Problem Solving'],
                suggestedRoles: ['Software Engineer', 'Full Stack Developer'],
                skillLevel: 'intermediate'
            }
        });

        await resume.save();

        // Update user with resume reference
        await User.findByIdAndUpdate(userId, { resume: resume._id });

        res.status(201).json({
            success: true,
            data: resume,
            message: 'Resume uploaded successfully'
        });
    } catch (error) {
        console.error('Resume upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get resume by ID
router.get('/:id', async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) {
            return res.status(404).json({ success: false, error: 'Resume not found' });
        }
        res.json({ success: true, data: resume });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get resume by user ID
router.get('/user/:userId', async (req, res) => {
    try {
        const resume = await Resume.findOne({ userId: req.params.userId });
        if (!resume) {
            return res.status(404).json({ success: false, error: 'Resume not found' });
        }
        res.json({ success: true, data: resume });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
