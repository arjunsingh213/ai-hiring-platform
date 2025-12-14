const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Resume = require('../models/Resume');
const User = require('../models/User');
const resumeParser = require('../services/resume/resumeParser');
const aiService = require('../services/ai/aiService');

const cloudinary = require('../config/cloudinary');

// Configure multer for memory storage (Cloudinary-compatible, no extra package needed)
const storage = multer.memoryStorage();

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

// Helper function to upload buffer to Cloudinary
async function uploadToCloudinary(buffer, filename) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'resumes',
                resource_type: 'raw',
                public_id: `${Date.now()}-${filename.replace(/\.[^/.]+$/, "")}`
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
}

// Upload and parse resume
router.post('/upload', upload.single('resume'), async (req, res) => {
    try {
        const { userId } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        // Upload buffer to Cloudinary
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);

        let parsedData = {
            rawText: '',
            htmlContent: '',
            skills: [],
            skillCategories: {
                programmingLanguages: [],
                frameworks: [],
                databases: [],
                tools: [],
                softSkills: []
            },
            experience: [],
            education: [],
            projects: []
        };

        let aiParsedData = null;
        let htmlContent = '';

        // Step 1: Parse resume to get raw text and HTML
        try {
            const fileUrl = cloudinaryResult.secure_url;
            console.log(`[Resume] Parsing resume from URL: ${fileUrl}`);

            const basicParsedData = await resumeParser.parseResumeFromUrl(fileUrl, req.file.mimetype);
            parsedData = { ...parsedData, ...basicParsedData };
            htmlContent = basicParsedData.htmlContent || '';

            console.log(`[Resume] Basic parsing complete. Skills found: ${parsedData.skills?.length || 0}`);
        } catch (parseError) {
            console.error('[Resume] Basic parsing error (non-fatal):', parseError.message);
        }

        // Step 2: Use AI (LLama 3.1) to extract detailed skills from HTML/text
        try {
            const contentToAnalyze = htmlContent || parsedData.rawText;
            if (contentToAnalyze && contentToAnalyze.length > 50) {
                console.log(`[Resume] Calling LLama 3.1 for AI skill extraction...`);

                aiParsedData = await aiService.parseResume(contentToAnalyze);

                if (aiParsedData) {
                    console.log(`[Resume] AI parsing complete. Skills: ${aiParsedData.skills?.length || 0}, ` +
                        `Languages: ${aiParsedData.skillCategories?.programmingLanguages?.length || 0}`);

                    // Merge AI parsed data with basic parsed data
                    parsedData = {
                        ...parsedData,
                        skills: [...new Set([
                            ...(parsedData.skills || []),
                            ...(aiParsedData.skills || [])
                        ])],
                        skillCategories: aiParsedData.skillCategories || parsedData.skillCategories,
                        experience: aiParsedData.experience?.length > 0 ? aiParsedData.experience : parsedData.experience,
                        education: aiParsedData.education?.length > 0 ? aiParsedData.education : parsedData.education,
                        projects: aiParsedData.projects?.length > 0 ? aiParsedData.projects : parsedData.projects,
                        totalYearsExperience: aiParsedData.totalYearsExperience || 0
                    };
                }
            }
        } catch (aiError) {
            console.error('[Resume] AI parsing error (non-fatal):', aiError.message);
        }

        // Determine skill level and interview focus based on parsed data
        const programmingLangs = parsedData.skillCategories?.programmingLanguages || [];
        const frameworks = parsedData.skillCategories?.frameworks || [];
        const totalYears = parsedData.totalYearsExperience || 0;

        const skillLevel = totalYears >= 7 ? 'expert' :
            totalYears >= 4 ? 'advanced' :
                totalYears >= 2 ? 'intermediate' : 'beginner';

        // Create resume record with all data
        const resume = new Resume({
            userId,
            fileId: cloudinaryResult.public_id,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileUrl: cloudinaryResult.secure_url,
            htmlContent: htmlContent,
            parsedData,
            aiAnalysis: {
                keyStrengths: aiParsedData?.skillCategories?.softSkills?.slice(0, 3) || ['Communication', 'Problem Solving'],
                suggestedRoles: aiParsedData?.suggestedRoles || ['Software Engineer', 'Full Stack Developer'],
                skillLevel: skillLevel,
                interviewFocus: [...programmingLangs.slice(0, 3), ...frameworks.slice(0, 2)]
            }
        });

        await resume.save();
        console.log(`[Resume] Saved resume for user ${userId} with ${parsedData.skills?.length || 0} skills`);

        // Update user with resume reference
        await User.findByIdAndUpdate(userId, { resume: resume._id });

        res.status(201).json({
            success: true,
            data: resume,
            message: 'Resume uploaded and analyzed successfully'
        });
    } catch (error) {
        console.error('[Resume] Upload error:', error);
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
