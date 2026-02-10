/**
 * Resume Parser API
 * Parses uploaded resumes using AI (Llama via OpenRouter)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const deepseekService = require('../services/ai/deepseekService');
const geminiService = require('../services/ai/geminiService'); // For classification and suggestions

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
        const { userId } = req.body;
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No resume file provided' });
        }

        console.log('Parsing resume:', req.file.originalname, req.file.mimetype);

        let resumeText = '';

        // Extract text based on file type
        try {
            if (req.file.mimetype === 'application/pdf') {
                // Try pdf-parse first
                if (pdfParse && typeof pdfParse === 'function') {
                    try {
                        const pdfData = await pdfParse(req.file.buffer);
                        resumeText = pdfData.text || '';
                        console.log('[ResumeParser] pdf-parse extracted text:', resumeText.length, 'chars');
                    } catch (pdfError) {
                        console.error('[ResumeParser] pdf-parse failed:', pdfError.message);
                        // Try pdfjs-dist as fallback
                        resumeText = await extractPDFWithPdfjs(req.file.buffer);
                    }
                } else {
                    console.log('[ResumeParser] pdf-parse not available, using pdfjs-dist');
                    resumeText = await extractPDFWithPdfjs(req.file.buffer);
                }
            } else if (req.file.mimetype === 'text/plain') {
                resumeText = req.file.buffer.toString('utf-8');
            } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                // DOCX - use mammoth
                try {
                    const mammoth = require('mammoth');
                    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
                    resumeText = result.value || '';
                    console.log('[ResumeParser] mammoth extracted text:', resumeText.length, 'chars');
                } catch (docxError) {
                    console.error('[ResumeParser] mammoth failed:', docxError.message);
                    resumeText = '';
                }
            } else if (req.file.mimetype === 'application/msword') {
                // Legacy DOC format - limited support
                console.log('[ResumeParser] Legacy DOC format, limited extraction');
                resumeText = '';
            }
        } catch (extractError) {
            console.error('[ResumeParser] Text extraction error:', extractError);
            resumeText = '';
        }

        // Clean extracted text
        if (resumeText) {
            resumeText = resumeText
                .replace(/\x00/g, '') // Remove null bytes
                .replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F]/g, ' ') // Keep only printable chars
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
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
            parsedResume = await deepseekService.parseResume(resumeText, { userId });
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
        const { resumeText, userId } = req.body;

        if (!resumeText || resumeText.trim().length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Resume text is too short or empty'
            });
        }

        // Parse resume using AI
        const parsedResume = await deepseekService.parseResume(resumeText, { userId });

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

/**
 * Extract text from PDF using pdfjs-dist
 * Fallback when pdf-parse fails
 */
async function extractPDFWithPdfjs(buffer) {
    try {
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
        const data = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdfDocument = await loadingTask.promise;

        let fullText = '';
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        console.log('[ResumeParser] pdfjs-dist extracted text:', fullText.length, 'chars');
        return fullText;
    } catch (error) {
        console.error('[ResumeParser] pdfjs-dist extraction failed:', error.message);
        return '';
    }
}

/**
 * GET /api/resume/skill-suggestions
 * Get skill suggestions based on prefix (debounced, using gemini-2.5-flash)
 */
router.get('/skill-suggestions', async (req, res) => {
    try {
        const { prefix, domain = 'technology', userId } = req.query;

        if (!prefix || prefix.length < 2) {
            return res.json({ success: true, data: { suggestions: [] } });
        }

        // Use Gemini for skill suggestions (debounced internally)
        const suggestions = await geminiService.getSkillSuggestions(prefix, domain, { userId });

        res.json({
            success: true,
            data: { suggestions }
        });
    } catch (error) {
        console.error('[SkillSuggestions] Error:', error.message);
        res.json({ success: true, data: { suggestions: [] } });
    }
});

/**
 * POST /api/resume/classify
 * Classify resume into domain/role type (using gemini-2.5-flash)
 */
router.post('/classify', async (req, res) => {
    try {
        const { resumeText, userId } = req.body;

        if (!resumeText || resumeText.length < 50) {
            return res.json({
                success: true,
                data: {
                    domain: 'IT',
                    roleType: 'Other',
                    experienceLevel: 'mid',
                    primarySkills: [],
                    confidence: 0.5
                }
            });
        }

        // Use Gemini for classification
        const classification = await geminiService.classifyResume(resumeText, { userId });

        res.json({
            success: true,
            data: classification
        });
    } catch (error) {
        console.error('[ResumeClassify] Error:', error.message);
        res.json({
            success: true,
            data: {
                domain: 'IT',
                roleType: 'Other',
                experienceLevel: 'mid',
                primarySkills: [],
                confidence: 0.5
            }
        });
    }
});

module.exports = router;
