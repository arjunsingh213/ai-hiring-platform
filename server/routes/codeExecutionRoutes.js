/**
 * Code Execution Routes
 * Uses Piston API (free, open-source code execution engine)
 * Public instance: https://emkc.org/api/v2/piston
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const deepseekService = require('../services/ai/deepseekService');

// Piston API - FREE public instance
const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

// Language mapping for Piston
const PISTON_LANGUAGES = {
    'Python': { language: 'python', version: '3.10.0' },
    'JavaScript': { language: 'javascript', version: '18.15.0' },
    'TypeScript': { language: 'typescript', version: '5.0.3' },
    'Java': { language: 'java', version: '15.0.2' },
    'C#': { language: 'csharp', version: '6.12.0' },
    'C++': { language: 'cpp', version: '10.2.0' },
    'C': { language: 'c', version: '10.2.0' },
    'Go': { language: 'go', version: '1.16.2' },
    'Ruby': { language: 'ruby', version: '3.0.1' },
    'PHP': { language: 'php', version: '8.2.3' },
    'Rust': { language: 'rust', version: '1.68.2' },
    'Kotlin': { language: 'kotlin', version: '1.8.20' }
};

/**
 * Execute code via Piston API (FREE)
 */
async function executeCode(code, language, stdin = '') {
    const langConfig = PISTON_LANGUAGES[language];

    if (!langConfig) {
        return {
            success: false,
            error: `Language "${language}" not supported`,
            output: ''
        };
    }

    try {
        const response = await axios.post(
            `${PISTON_API_URL}/execute`,
            {
                language: langConfig.language,
                version: langConfig.version,
                files: [
                    {
                        name: `main.${getExtension(language)}`,
                        content: code
                    }
                ],
                stdin: stdin,
                run_timeout: 10000 // 10 second timeout
            },
            { timeout: 30000 }
        );

        const result = response.data;

        // Check for compilation errors first
        const compileError = result.compile?.stderr || result.compile?.output;
        const runtimeError = result.run?.stderr;
        const hasError = compileError || runtimeError;

        return {
            success: !hasError,
            output: result.run?.stdout || '',
            stderr: runtimeError || '',
            compile_output: compileError || '',
            time: result.run?.time || 0,
            error: hasError ? (compileError || runtimeError) : null,
            language: language
        };
    } catch (error) {
        console.error('Piston execution error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || error.message;
        return {
            success: false,
            error: `Execution Error: ${errorMessage}`,
            output: '',
            stderr: errorMessage
        };
    }
}

function getExtension(language) {
    const extensions = {
        'Python': 'py',
        'JavaScript': 'js',
        'TypeScript': 'ts',
        'Java': 'java',
        'C#': 'cs',
        'C++': 'cpp',
        'C': 'c',
        'Go': 'go',
        'Ruby': 'rb',
        'PHP': 'php',
        'Rust': 'rs',
        'Kotlin': 'kt'
    };
    return extensions[language] || 'txt';
}

/**
 * POST /api/code/execute
 * Execute code and return output
 */
router.post('/execute', async (req, res) => {
    try {
        const { code, language } = req.body;

        if (!code || !language) {
            return res.status(400).json({
                success: false,
                error: 'Code and language are required'
            });
        }

        console.log(`Executing ${language} code via Piston API`);
        const result = await executeCode(code, language);

        res.json({
            success: result.success,
            output: result.output,
            stderr: result.stderr,
            compileOutput: result.compile_output,
            time: result.time,
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
    console.log('🔵 [BACKEND] /code/generate-problem called');
    console.log('🔵 [BACKEND] Request body:', req.body);

    try {
        const { skills, language, difficulty } = req.body;

        // Detect languages from skills if not specified
        let targetLanguage = language;
        if (!targetLanguage && skills) {
            console.log('🔵 [BACKEND] No language specified, detecting from skills...');
            const detected = deepseekService.detectProgrammingLanguages(skills);
            console.log('🔵 [BACKEND] Detected languages:', detected);
            if (detected.length > 0) {
                targetLanguage = detected[0].name;
            }
        }

        if (!targetLanguage) {
            targetLanguage = 'JavaScript'; // Default
            console.log('🔵 [BACKEND] Using default language: JavaScript');
        }

        console.log(`🔵 [BACKEND] Generating ${difficulty || 'easy'} problem for ${targetLanguage}`);

        const problem = await deepseekService.generateCodingProblem(
            targetLanguage,
            difficulty || 'easy',
            skills || []
        );

        console.log('✅ [BACKEND] Problem generated successfully:', problem?.title);

        res.json({
            success: true,
            problem: {
                ...problem,
                language: targetLanguage
            }
        });
    } catch (error) {
        console.error('❌ [BACKEND] Problem generation error:', error.message);
        console.error('❌ [BACKEND] Full error:', error);

        // Return fallback problem
        console.log('🔶 [BACKEND] Using fallback problem...');
        const fallback = deepseekService.getFallbackProblem(req.body.language || 'JavaScript');
        console.log('🔶 [BACKEND] Fallback problem:', fallback?.title);

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
        const { code, problem, language } = req.body;

        if (!PISTON_LANGUAGES[language]) {
            return res.status(400).json({
                success: false,
                error: 'Unsupported language'
            });
        }

        // Execute code first
        console.log('[EVALUATE] Executing code...');
        const executionResult = await executeCode(code, language);
        console.log('[EVALUATE] Execution result:', {
            success: executionResult.success,
            hasOutput: !!executionResult.output,
            hasError: !!executionResult.stderr
        });

        // If code execution FAILED, score is 0 - no AI evaluation needed
        const executionPassed = executionResult.success && !executionResult.stderr;

        if (!executionPassed) {
            console.log('[EVALUATE] Code execution FAILED - returning score 0');
            return res.json({
                success: true,
                execution: executionResult,
                evaluation: {
                    score: 0,
                    codeQuality: 'Code did not execute successfully',
                    efficiency: 'N/A - code failed to run',
                    correctness: 'Incorrect - code has errors and does not run',
                    suggestions: [
                        'Fix syntax errors in your code',
                        'Make sure your code compiles/runs without errors',
                        'Check variable names and function calls'
                    ],
                    overallFeedback: `Your code failed to execute. Error: ${executionResult.stderr || 'Unknown error'}. You must submit code that runs successfully to receive any score.`
                }
            });
        }

        // Only if execution passed, evaluate with AI
        console.log('[EVALUATE] Code execution PASSED - evaluating with AI...');
        const evaluation = await deepseekService.evaluateCodeSolution(
            code,
            problem,
            language,
            executionResult.output,
            true // execution passed
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
router.get('/languages', async (req, res) => {
    try {
        // Get available runtimes from Piston
        const response = await axios.get(`${PISTON_API_URL}/runtimes`);

        const supported = Object.keys(PISTON_LANGUAGES).map(name => ({
            name,
            ...PISTON_LANGUAGES[name]
        }));

        res.json({
            success: true,
            languages: supported
        });
    } catch (error) {
        // Return our hardcoded list as fallback
        const supported = Object.keys(PISTON_LANGUAGES).map(name => ({
            name,
            ...PISTON_LANGUAGES[name]
        }));

        res.json({
            success: true,
            languages: supported
        });
    }
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
