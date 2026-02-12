const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Resume = require('../models/Resume');
const User = require('../models/User');
const unstructuredParser = require('../services/resume/unstructuredParser');
const aiService = require('../services/ai/aiService');
const { userAuth, requireOwnership } = require('../middleware/userAuth');

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

// Upload and parse resume - PROTECTED: Jobseeker only
router.post('/upload', userAuth, upload.single('resume'), async (req, res) => {
    try {
        const userId = req.userId; // Secure: Use authenticated user ID

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
        let rawText = '';

        // Step 1: Parse resume using Unstructured (PDF) or Mammoth (DOCX)
        try {
            console.log(`[Resume] Parsing ${req.file.mimetype} resume...`);

            // Use Unstructured parser with buffer (serverless-safe)
            rawText = await unstructuredParser.parseResumeFromBuffer(
                req.file.buffer,
                req.file.mimetype,
                req.file.originalname
            );

            // Clean the extracted text
            rawText = unstructuredParser.cleanText(rawText);

            console.log(`[Resume] Text extraction complete. Length: ${rawText.length} characters`);
        } catch (parseError) {
            console.error('[Resume] Text extraction error (non-fatal):', parseError.message);
            // Continue with empty text - AI parsing will be skipped
        }

        // Step 2: Use AI (LLama 3.2 FREE) to extract detailed skills from extracted text
        try {
            if (rawText && rawText.length > 50) {
                console.log(`[Resume] Calling LLama 3.2 FREE for AI skill extraction...`);

                aiParsedData = await aiService.parseResume(rawText);

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
            } else {
                console.warn('[Resume] No text extracted, skipping AI parsing');
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
            htmlContent: rawText, // Store extracted text (field name kept for compatibility)
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

        // BACKGROUND: Create SkillNodes from parsed data
        // We do this in background (after response theoretically, but here await is fine for safety)
        try {
            const SkillNode = require('../models/SkillNode');
            const { classifySkill } = require('./skillNodeRoutes'); // Import utility

            const skillsToSync = new Map();

            // 1. programmingLanguages
            if (parsedData.skillCategories.programmingLanguages) {
                parsedData.skillCategories.programmingLanguages.forEach(s => {
                    const name = typeof s === 'string' ? s : s.name;
                    if (name) skillsToSync.set(name.toLowerCase(), { name, domain: 'Software Engineering' });
                });
            }
            // 2. frameworks
            if (parsedData.skillCategories.frameworks) {
                parsedData.skillCategories.frameworks.forEach(s => {
                    const name = typeof s === 'string' ? s : s.name;
                    if (name) skillsToSync.set(name.toLowerCase(), { name, domain: 'Software Engineering' });
                });
            }
            // 3. databases
            if (parsedData.skillCategories.databases) {
                parsedData.skillCategories.databases.forEach(s => {
                    const name = typeof s === 'string' ? s : s.name;
                    if (name) skillsToSync.set(name.toLowerCase(), { name, domain: 'Software Engineering' });
                });
            }
            // 4. tools (Others)
            if (parsedData.skillCategories.tools) {
                parsedData.skillCategories.tools.forEach(s => {
                    const name = typeof s === 'string' ? s : s.name;
                    if (name) skillsToSync.set(name.toLowerCase(), { name, domain: 'Others' });
                });
            }
            // 5. Flat skills list (if not categorised)
            if (parsedData.skills && parsedData.skills.length > 0) {
                parsedData.skills.forEach(s => {
                    const name = typeof s === 'string' ? s : s.name;
                    if (name && !skillsToSync.has(name.toLowerCase())) {
                        skillsToSync.set(name.toLowerCase(), {
                            name,
                            domain: classifySkill ? classifySkill(name) : 'Others'
                        });
                    }
                });
            }

            for (const [key, skillData] of skillsToSync) {
                try {
                    await SkillNode.findOneAndUpdate(
                        { userId, skillNameNormalized: key },
                        {
                            $setOnInsert: {
                                userId,
                                skillName: skillData.name,
                                skillNameNormalized: key,
                                domainCategory: skillData.domain,
                                level: 0,
                                xp: 0,
                                source: 'resume',
                                verifiedStatus: 'not_verified'
                            }
                        },
                        { upsert: true, new: true }
                    );
                } catch (err) {
                    console.error(`Status: Skipped duplicate skill ${key}`);
                }
            }
            console.log(`[Resume] Synced ${skillsToSync.size} skill nodes for user ${userId}`);

        } catch (skillErr) {
            console.error('[Resume] SkillNode creation failed:', skillErr);
        }
    } catch (error) {
        console.error('[Resume] Upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get resume by ID - PROTECTED
router.get('/:id', userAuth, async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) {
            return res.status(404).json({ success: false, error: 'Resume not found' });
        }

        // SECURITY: Only owner or recruiter can view resume
        if (resume.userId.toString() !== req.userId.toString() && req.user.role !== 'recruiter') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You do not have permission to view this resume.',
                code: 'FORBIDDEN'
            });
        }

        res.json({ success: true, data: resume });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get resume by user ID - PROTECTED
router.get('/user/:userId', userAuth, requireOwnership('userId'), async (req, res) => {
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
