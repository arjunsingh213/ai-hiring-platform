/**
 * Code Execution Routes
 * Handles code execution via Judge0 API (self-hosted or cloud)
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const deepseekService = require('../services/ai/deepseekService');

// Judge0 API configuration - supports both self-hosted and RapidAPI
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY; // Only needed for RapidAPI

/**
 * Execute code via Judge0
 */
async function executeCode(code, languageId, stdin = '') {
    const headers = {
        'Content-Type': 'application/json'
    };

    // Add RapidAPI headers if using cloud service
    if (JUDGE0_API_KEY) {
        headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
        headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
    }

    try {
        // Submit code for execution
        const submitResponse = await axios.post(
            `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
            {
                source_code: code,
                language_id: languageId,
                stdin: stdin,
                cpu_time_limit: 5,
                memory_limit: 128000
            },
            { headers, timeout: 30000 }
        );

        return {
            success: true,
            output: submitResponse.data.stdout || '',
            stderr: submitResponse.data.stderr || '',
            compile_output: submitResponse.data.compile_output || '',
            status: submitResponse.data.status,
            time: submitResponse.data.time,
            memory: submitResponse.data.memory
        };
    } catch (error) {
        console.error('Judge0 execution error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            output: '',
            stderr: 'Code execution failed. Please try again.'
        };
    }
}

/**
 * POST /api/code/execute
 * Execute code and return output
 */
router.post('/execute', async (req, res) => {
    try {
        const { code, language, languageId } = req.body;

        if (!code || !languageId) {
            return res.status(400).json({
                success: false,
                error: 'Code and language are required'
            });
        }

        console.log(`Executing ${language} code (ID: ${languageId})`);
        const result = await executeCode(code, languageId);

        res.json({
            success: result.success,
            output: result.output,
            stderr: result.stderr,
            compileOutput: result.compile_output,
            status: result.status,
            time: result.time,
            memory: result.memory,
            error: result.error
        });
    } catch (error) {
        console.error('Code execution error:', error);
        res.status(500).json({
            success: false,
            error: 'Code execution failed'
        });
    }
});

/**
 * POST /api/code/generate-problem
 * Generate a coding problem based on user's skills
 */
router.post('/generate-problem', async (req, res) => {
    try {
        const { skills, language, difficulty } = req.body;

        // Detect languages from skills if not specified
        let targetLanguage = language;
        if (!targetLanguage && skills) {
            const detected = deepseekService.detectProgrammingLanguages(skills);
            if (detected.length > 0) {
                targetLanguage = detected[0].name;
            }
        }

        if (!targetLanguage) {
            targetLanguage = 'JavaScript'; // Default
        }

        console.log(`Generating ${difficulty || 'easy'} problem for ${targetLanguage}`);

        const problem = await deepseekService.generateCodingProblem(
            targetLanguage,
            difficulty || 'easy',
            skills || []
        );

        // Get language info for Judge0
        const langInfo = Object.values(deepseekService.PROGRAMMING_LANGUAGES)
            .find(l => l.name === targetLanguage);

        res.json({
            success: true,
            problem: {
                ...problem,
                languageId: langInfo?.judge0Id || 63 // Default to JavaScript
            }
        });
    } catch (error) {
        console.error('Problem generation error:', error);

        // Return fallback problem
        const fallback = deepseekService.getFallbackProblem(req.body.language || 'JavaScript');
        res.json({
            success: true,
            problem: fallback,
            fallback: true
        });
    }
});

/**
 * POST /api/code/evaluate
 * Evaluate submitted code solution
 */
router.post('/evaluate', async (req, res) => {
    try {
        const { code, problem, language, testResults } = req.body;

        // Run test cases
        const langInfo = Object.values(deepseekService.PROGRAMMING_LANGUAGES)
            .find(l => l.name === language);

        if (!langInfo) {
            return res.status(400).json({
                success: false,
                error: 'Unsupported language'
            });
        }

        // Execute code
        const executionResult = await executeCode(code, langInfo.judge0Id);

        // Evaluate with DeepSeek
        const evaluation = await deepseekService.evaluateCodeSolution(
            code,
            problem,
            language,
            executionResult.output,
            executionResult.success && !executionResult.stderr
        );

        res.json({
            success: true,
            execution: executionResult,
            evaluation
        });
    } catch (error) {
        console.error('Evaluation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to evaluate code'
        });
    }
});

/**
 * GET /api/code/languages
 * Get supported programming languages
 */
router.get('/languages', (req, res) => {
    const languages = Object.entries(deepseekService.PROGRAMMING_LANGUAGES).map(([key, value]) => ({
        key,
        ...value
    }));

    // Remove duplicates
    const unique = languages.filter((lang, index, self) =>
        index === self.findIndex(l => l.name === lang.name)
    );

    res.json({
        success: true,
        languages: unique
    });
});

/**
 * POST /api/code/detect-languages
 * Detect programming languages from skills array
 */
router.post('/detect-languages', (req, res) => {
    const { skills } = req.body;

    const detected = deepseekService.detectProgrammingLanguages(skills || []);

    res.json({
        success: true,
        languages: detected,
        hasCodingSkills: detected.length > 0
    });
});

module.exports = router;
