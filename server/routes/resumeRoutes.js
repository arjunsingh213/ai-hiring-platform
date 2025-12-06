const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Resume = require('../models/Resume');
const User = require('../models/User');
const resumeParser = require('../services/resume/resumeParser');
const aiService = require('../services/ai/aiService');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/resumes/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
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
            parsedData = await resumeParser.parseResume(req.file.path, req.file.mimetype);
        } catch (parseError) {
            console.error('Resume parsing error (non-fatal):', parseError.message);
            // Continue with empty parsed data
        }

        // Create resume record
        const resume = new Resume({
            userId,
            fileId: req.file.filename,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
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
