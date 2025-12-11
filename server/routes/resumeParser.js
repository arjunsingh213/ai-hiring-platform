/**
 * Resume Parser API
 * Parses uploaded resumes using AI (Llama via OpenRouter)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const deepseekService = require('../services/ai/deepseekService');

// pdf-parse import with proper handling
let pdfParse;
try {
    const pdfModule = require('pdf-parse');
    // Handle both default export and direct function export
    pdfParse = typeof pdfModule === 'function' ? pdfModule : (pdfModule.default || pdfModule);
} catch (e) {
    console.error('Failed to load pdf-parse:', e.message);
    pdfParse = null;
}

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'text/plain', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, TXT, DOC, DOCX allowed.'));
        }
    }
});

/**
 * POST /api/resume/parse
 * Parse resume file and extract structured data using AI
 */
router.post('/parse', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No resume file provided' });
        }

        console.log('Parsing resume:', req.file.originalname, req.file.mimetype);

        let resumeText = '';

        // Extract text based on file type
        try {
            if (req.file.mimetype === 'application/pdf') {
                if (pdfParse && typeof pdfParse === 'function') {
                    try {
                        const pdfData = await pdfParse(req.file.buffer);
                        resumeText = pdfData.text;
                    } catch (pdfError) {
                        console.error('PDF Parse failed:', pdfError);
                        // Fallback: try to extract text from buffer
                        resumeText = req.file.buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ');
                    }
                } else {
                    console.log('pdf-parse not available, using basic extraction');
                    resumeText = req.file.buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ');
                }
            } else if (req.file.mimetype === 'text/plain') {
                resumeText = req.file.buffer.toString('utf-8');
            } else {
                // For DOC/DOCX, try to extract basic text
                resumeText = req.file.buffer.toString('utf-8');
            }
        } catch (extractError) {
            console.error('Text extraction error:', extractError);
            resumeText = '';
        }

        console.log('Extracted resume text length:', resumeText?.length || 0);

        // If text extraction failed or is too short, return basic fallback
        if (!resumeText || resumeText.trim().length < 50) {
            console.log('Resume text too short, returning fallback structure');
            return res.json({
                success: true,
                data: {
                    parsedResume: createFallbackResume(req.file.originalname),
                    textLength: resumeText?.length || 0,
                    fileName: req.file.originalname,
                    fallback: true
                }
            });
        }

        // Try to parse resume using DeepSeek-R1
        let parsedResume;
        try {
            parsedResume = await deepseekService.parseResume(resumeText);
            console.log('DeepSeek parsed resume successfully, skills:', parsedResume?.skills?.length || 0);
        } catch (aiError) {
            console.error('AI parsing failed, using rule-based extraction:', aiError.message);
            // Fallback to rule-based extraction
            parsedResume = extractBasicInfo(resumeText);
        }

        res.json({
            success: true,
            data: {
                parsedResume,
                textLength: resumeText.length,
                fileName: req.file.originalname
            }
        });

    } catch (error) {
        console.error('Resume parsing error:', error);
        // Even on error, return a fallback so the interview can proceed
        res.json({
            success: true,
            data: {
                parsedResume: createFallbackResume(req.file?.originalname || 'resume'),
                textLength: 0,
                fileName: req.file?.originalname || 'resume',
                fallback: true
            }
        });
    }
});

/**
 * Create a fallback resume structure when parsing fails
 */
function createFallbackResume(fileName) {
    return {
        skills: [],
        experience: [],
        education: [],
        projects: [],
        summary: `Resume uploaded: ${fileName}`,
        contact: {}
    };
}

/**
 * Extract basic info from resume text using rules (no AI)
 */
function extractBasicInfo(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // Try to find skills
    const skillKeywords = ['javascript', 'python', 'java', 'react', 'node', 'sql', 'html', 'css',
        'typescript', 'mongodb', 'express', 'angular', 'vue', 'git', 'docker', 'aws', 'azure',
        'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin', 'flutter', 'django', 'spring'];

    const foundSkills = skillKeywords.filter(skill =>
        text.toLowerCase().includes(skill.toLowerCase())
    );

    // Try to find email
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);

    // Try to find phone
    const phoneMatch = text.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

    return {
        skills: foundSkills.slice(0, 10),
        experience: [],
        education: [],
        projects: [],
        summary: lines.slice(0, 3).join(' ').substring(0, 200),
        contact: {
            email: emailMatch ? emailMatch[0] : null,
            phone: phoneMatch ? phoneMatch[0] : null
        }
    };
}

/**
 * POST /api/resume/parse-text
 * Parse resume from raw text (for testing or when text is already extracted)
 */
router.post('/parse-text', async (req, res) => {
    try {
        const { resumeText } = req.body;

        if (!resumeText || resumeText.trim().length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Resume text is too short or empty'
            });
        }

        // Parse resume using AI
        const parsedResume = await openRouterService.parseResume(resumeText);

        res.json({
            success: true,
            data: { parsedResume }
        });

    } catch (error) {
        console.error('Resume text parsing error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to parse resume text'
        });
    }
});

module.exports = router;
