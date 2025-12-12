/**
 * Onboarding Interview API
 * Generates personalized interview questions based on resume
 * Uses DeepSeek-R1 for question generation, validation and evaluation
 */

const express = require('express');
const router = express.Router();
// Switch from Gemini to DeepSeek
const deepseekService = require('../services/ai/deepseekService');
const geminiService = require('../services/ai/geminiService'); // Keep as fallback
const User = require('../models/User');
const Interview = require('../models/Interview');

/**
 * POST /api/onboarding-interview/validate-answer
 * Validate candidate's answer for gibberish/relevance
 */
router.post('/validate-answer', async (req, res) => {
    try {
        const { question, answer } = req.body;

        console.log('Validating answer:', answer.substring(0, 50) + '...');
        const result = await deepseekService.validateAnswer(question, answer);

        res.json({
            success: true,
            valid: result.valid,
            message: result.message
        });
    } catch (error) {
        console.error('Validation route error:', error);
        res.json({ success: true, valid: true }); // Fail open
    }
});

/**
 * POST /api/onboarding-interview/start
 * Start a new dynamic interview session
 */
router.post('/start', async (req, res) => {
    try {
        const { parsedResume, desiredRole, experienceLevel } = req.body;
        console.log('Starting dynamic interview for:', desiredRole);

        // Prepare resume text
        const resumeSummary = `Skills: ${parsedResume?.skills?.join(', ') || 'None'}`;

        // Generates just the first question
        const firstQuestion = await deepseekService.generateNextQuestion(
            resumeSummary,
            desiredRole || 'Software Engineer',
            experienceLevel || 'Entry Level',
            [] // No history
        );

        res.json({
            success: true,
            question: {
                ...firstQuestion,
                round: 'technical', // First one is tech
                questionNumber: 1
            },
            totalQuestions: 10
        });
    } catch (error) {
        console.error('Start interview failed:', error);
        res.status(500).json({ success: false, error: 'Failed to start interview' });
    }
});

/**
 * POST /api/onboarding-interview/next
 * Validate previous answer and generate next question
 */
router.post('/next', async (req, res) => {
    try {
        const { currentQuestion, answer, history, parsedResume, desiredRole, experienceLevel } = req.body;

        // 1. Strict Validation
        const validation = await deepseekService.validateAnswer(currentQuestion.question, answer);
        if (!validation.valid) {
            return res.json({
                success: true,
                valid: false,
                message: validation.message || 'Please provide a clearer answer.'
            });
        }

        // 2. Check if interview is done (10 questions)
        const currentCount = (history?.length || 0) + 1;
        if (currentCount >= 10) {
            return res.json({
                success: true,
                valid: true,
                completed: true
            });
        }

        // 3. Generate Next Question based on History + New Answer
        const updatedHistory = [...(history || []), { question: currentQuestion.question, answer }];
        const resumeSummary = `Skills: ${parsedResume?.skills?.join(', ') || 'None'}`;

        const nextQ = await deepseekService.generateNextQuestion(
            resumeSummary,
            desiredRole || 'Software Engineer',
            experienceLevel || 'Entry Level',
            updatedHistory
        );

        res.json({
            success: true,
            valid: true,
            completed: false,
            question: {
                ...nextQ,
                questionNumber: currentCount + 1,
                round: currentCount + 1 <= 5 ? 'technical' : 'hr'
            }
        });

    } catch (error) {
        console.error('Next question failed:', error);
        res.status(500).json({ success: false, error: 'Failed to generate next question' });
    }
});

/**
 * POST /api/onboarding-interview/generate-questions
 * (Legacy/Fallback) Generate all questions at once
 */
router.post('/generate-questions', async (req, res) => {
    try {
        const { parsedResume, desiredRole, experienceLevel } = req.body;

        // Use empty defaults if no resume provided
        const resumeData = parsedResume || {
            skills: [],
            experience: [],
            education: [],
            projects: []
        };

        console.log('Generating customized DeepSeek-R1 interview questions for:', desiredRole || 'General Role');

        // Prepare resume text for DeepSeek
        const resumeSummary = `
            Skills: ${resumeData.skills?.join(', ') || 'General'}
            Projects: ${resumeData.projects?.map(p => `${p.name}: ${p.description}`).join('; ') || 'None'}
            Experience: ${resumeData.experience?.map(e => `${e.role} at ${e.company}`).join('; ') || 'None'}
        `;

        try {
            // Generate All Questions using DeepSeek-R1
            const generatedQuestions = await deepseekService.generateInterviewQuestions(
                resumeSummary,
                desiredRole || 'Software Engineer',
                experienceLevel || 'Intern/Junior'
            );

            console.log('DeepSeek generated', generatedQuestions.length, 'questions');

            res.json({
                success: true,
                data: {
                    questions: generatedQuestions.slice(0, 10),
                    totalQuestions: generatedQuestions.length,
                    basedOnSkills: resumeData.skills?.slice(0, 5) || [],
                    basedOnProjects: resumeData.projects?.map(p => p.name).slice(0, 3) || []
                }
            });

        } catch (deepseekError) {
            console.error('DeepSeek generation failed, falling back to Gemini:', deepseekError.message);

            // FALLBACK TO GEMINI (Original Logic)
            let technicalQuestions = await geminiService.generateQuestions(
                resumeData,
                desiredRole || 'Software Developer',
                'technical'
            );

            let hrQuestions = await geminiService.generateQuestions(
                resumeData,
                desiredRole || 'Software Developer',
                'behavioral'
            );

            // Combine
            const allQuestions = [
                ...technicalQuestions.slice(0, 5).map(q => ({ ...q, round: 'technical' })),
                ...hrQuestions.slice(0, 5).map(q => ({ ...q, round: 'hr' }))
            ];

            // Fill if needed
            while (allQuestions.length < 10) {
                const fallback = geminiService.getFallbackQuestions(
                    allQuestions.length < 5 ? 'technical' : 'behavioral',
                    desiredRole || 'this position',
                    resumeData.skills?.join(', ') || ''
                );
                allQuestions.push({
                    ...fallback[allQuestions.length % 5],
                    round: allQuestions.length < 5 ? 'technical' : 'hr'
                });
            }

            res.json({
                success: true,
                data: {
                    questions: allQuestions.slice(0, 10),
                    totalQuestions: 10,
                    basedOnSkills: resumeData.skills?.slice(0, 5) || []
                }
            });
        }

    } catch (error) {
        console.error('Question generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate questions' });
    }
});

/**
 * POST /api/onboarding-interview/submit
 * Submit interview answers for evaluation
 */
router.post('/submit', async (req, res) => {
    try {
        const { userId, questionsAndAnswers, parsedResume, desiredRole } = req.body;

        if (!userId || !questionsAndAnswers || questionsAndAnswers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'User ID and answers are required'
            });
        }

        console.log('Evaluating interview for user:', userId);
        console.log('Total answers:', questionsAndAnswers.length);

        // Pre-validation: Check for empty/skipped answers
        const validationResult = validateAnswers(questionsAndAnswers);
        console.log('Validation result:', validationResult);

        // If too many empty answers, give severe penalty
        if (validationResult.emptyCount >= questionsAndAnswers.length) {
            // All answers are empty - return 0 score
            const emptyEvaluation = {
                overallScore: 0,
                technicalScore: 0,
                hrScore: 0,
                communication: 0,
                confidence: 0,
                relevance: 0,
                problemSolving: 0,
                strengths: [],
                weaknesses: ['No answers provided', 'Interview not completed properly'],
                areasToImprove: [
                    { area: 'Complete Responses', suggestion: 'Please provide answers to interview questions', priority: 'high' }
                ],
                feedback: 'No answers were provided. Please complete the interview with thoughtful responses.',
                technicalFeedback: 'No technical responses to evaluate.',
                communicationFeedback: 'No communication demonstrated.',
                recommendations: ['Prepare answers beforehand', 'Take time to respond thoughtfully']
            };

            return res.json({
                success: true,
                data: emptyEvaluation
            });
        }

        // Use DeepSeek R1 Chimera for proper AI evaluation
        let evaluation;
        try {
            evaluation = await deepseekService.evaluateAllAnswers(questionsAndAnswers, {
                jobTitle: desiredRole || 'Software Developer',
                jobDescription: 'General position',
                requiredSkills: parsedResume?.skills || []
            });

            // Apply penalty for empty/skipped answers
            if (validationResult.emptyCount > 0) {
                const penalty = Math.round((validationResult.emptyCount / questionsAndAnswers.length) * 30);
                evaluation.overallScore = Math.max(0, (evaluation.overallScore || 70) - penalty);
                evaluation.technicalScore = Math.max(0, (evaluation.technicalScore || 70) - penalty);
                evaluation.hrScore = Math.max(0, (evaluation.hrScore || 70) - penalty);
                console.log(`Applied ${penalty}% penalty for ${validationResult.emptyCount} empty answers`);
            }

            console.log('OpenRouter Qwen3 evaluation completed, score:', evaluation.overallScore);
        } catch (evalError) {
            console.error('AI evaluation failed, using strict rule-based:', evalError);
            // Fallback to strict rule-based evaluation
            evaluation = calculateStrictScore(questionsAndAnswers, validationResult);
        }

        // Prepare interview results
        const interviewResults = {
            score: evaluation.overallScore || 70,
            technicalScore: evaluation.technicalScore || 70,
            hrScore: evaluation.hrScore || 70,
            strengths: evaluation.strengths || [],
            weaknesses: evaluation.weaknesses || [],
            feedback: evaluation.feedback || 'Interview completed',
            completedAt: new Date(),
            questionsAnswered: questionsAndAnswers.length,
            responses: questionsAndAnswers.map(qa => ({
                question: qa.question,
                answer: qa.answer,
                category: qa.category,
                round: qa.round
            }))
        };

        // Save interview results to user profile AND update platform interview status
        try {
            // Determine pass/fail based on strict criteria
            const passed = (
                (evaluation.overallScore ?? 0) >= 60 &&
                (evaluation.technicalScore ?? 0) >= 50 &&
                (evaluation.hrScore ?? 0) >= 50
            );

            // Calculate retry date (2 days from now if failed)
            const retryAfterDate = passed ? null : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

            await User.findByIdAndUpdate(userId, {
                $set: {
                    'jobSeekerProfile.onboardingInterview': interviewResults,
                    'jobSeekerProfile.interviewScore': evaluation.overallScore || 10,
                    // Update platform interview status
                    'platformInterview.status': passed ? 'passed' : 'failed',
                    'platformInterview.score': evaluation.overallScore || 10,
                    'platformInterview.completedAt': new Date(),
                    'platformInterview.lastAttemptAt': new Date(),
                    'platformInterview.canRetry': !passed,
                    'platformInterview.retryAfter': retryAfterDate
                },
                $inc: { 'platformInterview.attempts': 1 }
            });
            console.log(`Interview results saved. Platform interview ${passed ? 'PASSED' : 'FAILED'}`);

            // Create Interview document for Completed Interviews tab (both passed & failed)
            try {
                await Interview.create({
                    userId,
                    interviewType: 'combined',
                    status: 'completed',
                    passed,
                    scoring: {
                        overallScore: evaluation.overallScore || 10,
                        technicalAccuracy: evaluation.technicalScore || 10,
                        communication: evaluation.communication || 10,
                        confidence: evaluation.confidence || 10,
                        relevance: evaluation.relevance || 10,
                        strengths: evaluation.strengths || [],
                        weaknesses: evaluation.weaknesses || [],
                        detailedFeedback: evaluation.feedback || 'Platform interview completed'
                    },
                    completedAt: new Date(),
                    startedAt: new Date(Date.now() - 20 * 60 * 1000) // Assume 20 min duration
                });
                console.log('Interview document created for scorecard display');
            } catch (interviewError) {
                console.error('Failed to create Interview document:', interviewError);
            }

            // ==================== AI TALENT PASSPORT UPDATE (NEW) ====================
            // Auto-update AI Talent Passport after interview completion
            // This is a PURE ADDITION - doesn't affect existing flow
            try {
                const aiTalentPassportService = require('../services/aiTalentPassportService');
                await aiTalentPassportService.updateTalentPassport(userId);
                console.log('✅ AI Talent Passport updated after interview completion');
            } catch (atpError) {
                console.error('Failed to update AI Talent Passport (non-critical):', atpError);
                // Don't throw - this is a non-critical feature
            }
            // ==================== END ATP UPDATE ====================
        } catch (dbError) {
            console.error('Failed to save to DB (continuing anyway):', dbError);
        }

        res.json({
            success: true,
            data: {
                // Core scores - FALLBACKS ARE NOW 0-10 (NOT 50)
                score: evaluation.overallScore ?? 10,
                technicalScore: evaluation.technicalScore ?? 10,
                hrScore: evaluation.hrScore ?? 10,

                // STRICT PASS CRITERIA:
                // Must have: Overall >= 60 AND both Technical & HR >= 50 AND Communication >= 40
                passed: (
                    (evaluation.overallScore ?? 0) >= 60 &&
                    (evaluation.technicalScore ?? 0) >= 50 &&
                    (evaluation.hrScore ?? 0) >= 50 &&
                    (evaluation.communication ?? 0) >= 40
                ),

                // Detailed analysis - fallbacks are now 0-10
                communication: evaluation.communication ?? calculateCommunicationScore(questionsAndAnswers),
                confidence: evaluation.confidence ?? 10,
                relevance: evaluation.relevance ?? 10,
                problemSolving: evaluation.problemSolving ?? 10,

                // Strengths & Weaknesses
                strengths: evaluation.strengths || (evaluation.overallScore >= 40 ? ['Completed interview'] : []),
                weaknesses: evaluation.weaknesses || (evaluation.overallScore < 40 ? ['Needs to provide more substantive answers'] : []),
                areasToImprove: evaluation.areasToImprove || generateImprovementAreas(evaluation),

                // Detailed feedback
                feedback: evaluation.feedback || (evaluation.overallScore < 30
                    ? 'Your answers were insufficient. Please provide thoughtful, detailed responses.'
                    : 'Thank you for completing the interview!'),
                technicalFeedback: evaluation.technicalFeedback || 'Review your technical fundamentals and practice problem-solving.',
                communicationFeedback: evaluation.communicationFeedback || 'Practice structuring your answers with examples.',

                // Recommendations
                recommendations: evaluation.recommendations || [
                    'Practice with mock interviews',
                    'Prepare specific examples from your experience',
                    'Research common interview questions for your role'
                ],

                // Question-level analysis
                questionAnalysis: generateQuestionAnalysis(questionsAndAnswers)
            }
        });

    } catch (error) {
        console.error('Interview submission error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to submit interview'
        });
    }
});

/**
 * Rule-based scoring fallback
 */
function calculateRuleBasedScore(questionsAndAnswers) {
    let totalScore = 0;
    let techScore = 0;
    let hrScore = 0;
    let techCount = 0;
    let hrCount = 0;

    questionsAndAnswers.forEach(qa => {
        const answer = qa.answer || '';
        let score = 0;

        // Score based on answer quality
        if (answer.length < 20) {
            score = 15; // Very short/gibberish
        } else if (answer.length < 50) {
            score = 35; // Short
        } else if (answer.length < 100) {
            score = 55; // Basic
        } else if (answer.length < 200) {
            score = 70; // Good
        } else {
            score = 85; // Detailed
        }

        // Bonus for specific keywords
        const keywords = ['experience', 'project', 'team', 'learned', 'achieved', 'implemented', 'developed'];
        const matchedKeywords = keywords.filter(kw => answer.toLowerCase().includes(kw));
        score += matchedKeywords.length * 2;

        score = Math.min(score, 100);
        totalScore += score;

        if (qa.round === 'technical') {
            techScore += score;
            techCount++;
        } else {
            hrScore += score;
            hrCount++;
        }
    });

    const avgScore = questionsAndAnswers.length > 0 ? Math.round(totalScore / questionsAndAnswers.length) : 50;

    return {
        overallScore: avgScore,
        technicalScore: techCount > 0 ? Math.round(techScore / techCount) : 50,
        hrScore: hrCount > 0 ? Math.round(hrScore / hrCount) : 50,
        strengths: avgScore >= 70 ? ['Good communication', 'Detailed responses'] : ['Completed interview'],
        weaknesses: avgScore < 50 ? ['Responses could be more detailed'] : [],
        feedback: avgScore >= 70
            ? 'Great job! Your responses were thoughtful and well-structured.'
            : avgScore >= 50
                ? 'Good effort! Consider providing more specific examples in your answers.'
                : 'Thank you for completing the interview. More detailed answers would help showcase your skills better.'
    };
}

/**
 * Calculate communication score based on answer structure
 */
function calculateCommunicationScore(questionsAndAnswers) {
    let totalScore = 0;

    questionsAndAnswers.forEach(qa => {
        const answer = qa.answer || '';
        let score = 50;

        // Check for structured response (intro, body, conclusion-like patterns)
        if (answer.length > 100) score += 15;
        if (answer.includes('.') && answer.split('.').length > 2) score += 10;
        if (/first|second|finally|in conclusion|overall/i.test(answer)) score += 10;
        if (/for example|such as|specifically/i.test(answer)) score += 10;

        totalScore += Math.min(score, 100);
    });

    return questionsAndAnswers.length > 0 ? Math.round(totalScore / questionsAndAnswers.length) : 50;
}

/**
 * Generate improvement areas based on evaluation
 */
function generateImprovementAreas(evaluation) {
    const areas = [];

    if ((evaluation.technicalScore || 70) < 60) {
        areas.push({
            area: 'Technical Knowledge',
            suggestion: 'Review core concepts in your field. Practice explaining technical topics clearly.',
            priority: 'high'
        });
    }

    if ((evaluation.hrScore || 70) < 60) {
        areas.push({
            area: 'Behavioral Responses',
            suggestion: 'Use the STAR method (Situation, Task, Action, Result) for behavioral questions.',
            priority: 'high'
        });
    }

    if ((evaluation.communication || 70) < 60) {
        areas.push({
            area: 'Communication',
            suggestion: 'Structure your answers with a clear beginning, middle, and end. Use specific examples.',
            priority: 'medium'
        });
    }

    if ((evaluation.confidence || 70) < 60) {
        areas.push({
            area: 'Confidence',
            suggestion: 'Practice speaking about your achievements. Prepare concrete examples in advance.',
            priority: 'medium'
        });
    }

    // Add general tips if no major issues
    if (areas.length === 0) {
        areas.push({
            area: 'Continue Improving',
            suggestion: 'Keep practicing with mock interviews. Stay updated with industry trends.',
            priority: 'low'
        });
    }

    return areas;
}

/**
 * Generate per-question analysis
 */
function generateQuestionAnalysis(questionsAndAnswers) {
    return questionsAndAnswers.map((qa, index) => {
        const answer = qa.answer || '';
        let score = 50;
        let feedback = '';

        // Score based on length
        if (answer.length < 20) {
            score = 20;
            feedback = 'Answer was too brief. Provide more detail.';
        } else if (answer.length < 50) {
            score = 40;
            feedback = 'Answer could use more depth and examples.';
        } else if (answer.length < 100) {
            score = 60;
            feedback = 'Good attempt. Try adding specific examples.';
        } else if (answer.length < 200) {
            score = 75;
            feedback = 'Solid response with good detail.';
        } else {
            score = 85;
            feedback = 'Comprehensive answer with strong detail.';
        }

        // Bonus for keywords
        const keywords = ['experience', 'project', 'team', 'result', 'achieved', 'implemented', 'learned'];
        const matched = keywords.filter(kw => answer.toLowerCase().includes(kw));
        score += matched.length * 3;
        score = Math.min(score, 100);

        if (matched.length >= 2) {
            feedback += ' Used relevant professional terminology.';
        }

        return {
            questionNumber: index + 1,
            question: qa.question,
            category: qa.category,
            round: qa.round,
            score: score,
            feedback: feedback,
            answerLength: answer.length,
            keywordsUsed: matched
        };
    });
}

/**
 * Validate answers - check for empty, skipped, or very short answers
 */
function validateAnswers(questionsAndAnswers) {
    let emptyCount = 0;
    let shortCount = 0;
    let validCount = 0;
    const details = [];

    questionsAndAnswers.forEach((qa, index) => {
        const answer = (qa.answer || '').trim();
        const wordCount = answer.split(/\s+/).filter(w => w).length;

        if (!answer || answer === '(Skipped)' || wordCount < 3) {
            emptyCount++;
            details.push({ question: index + 1, status: 'empty', words: wordCount });
        } else if (wordCount < 10) {
            shortCount++;
            details.push({ question: index + 1, status: 'short', words: wordCount });
        } else {
            validCount++;
            details.push({ question: index + 1, status: 'valid', words: wordCount });
        }
    });

    return {
        emptyCount,
        shortCount,
        validCount,
        totalQuestions: questionsAndAnswers.length,
        completionRate: Math.round((validCount / questionsAndAnswers.length) * 100),
        details
    };
}

/**
 * Calculate strict score when AI evaluation fails
 * Heavily penalizes empty/short answers
 */
function calculateStrictScore(questionsAndAnswers, validationResult) {
    // If all empty, return 0
    if (validationResult.emptyCount >= questionsAndAnswers.length) {
        return {
            overallScore: 0,
            technicalScore: 0,
            hrScore: 0,
            communication: 0,
            confidence: 0,
            relevance: 0,
            problemSolving: 0,
            strengths: [],
            weaknesses: ['No answers provided'],
            feedback: 'No answers were provided. Please complete the interview properly.',
            areasToImprove: [{ area: 'Completion', suggestion: 'Provide answers to all questions', priority: 'high' }],
            recommendations: ['Complete the interview with thoughtful responses']
        };
    }

    let totalScore = 0;
    let techScore = 0, hrScore = 0, techCount = 0, hrCount = 0;

    questionsAndAnswers.forEach(qa => {
        const answer = (qa.answer || '').trim();
        const wordCount = answer.split(/\s+/).filter(w => w).length;
        let score = 0;

        // Strict scoring based on answer quality
        if (!answer || answer === '(Skipped)' || wordCount < 3) {
            score = 0; // Empty/skipped = 0
        } else if (wordCount < 10) {
            score = 15; // Very short
        } else if (wordCount < 25) {
            score = 35; // Short
        } else if (wordCount < 50) {
            score = 55; // Medium
        } else if (wordCount < 100) {
            score = 70; // Good
        } else {
            score = 85; // Detailed
        }

        // Check for relevance keywords
        const question = (qa.question || '').toLowerCase();
        const answerLower = answer.toLowerCase();

        // Extract keywords from question
        const questionWords = question.split(/\s+/).filter(w => w.length > 4);
        const relevantMatches = questionWords.filter(w => answerLower.includes(w)).length;

        if (relevantMatches >= 2) {
            score = Math.min(100, score + 10);
        }

        totalScore += score;
        if (qa.category === 'technical' || qa.round === 'technical') {
            techScore += score;
            techCount++;
        } else {
            hrScore += score;
            hrCount++;
        }
    });

    const avgScore = Math.round(totalScore / questionsAndAnswers.length);

    return {
        overallScore: avgScore,
        technicalScore: techCount > 0 ? Math.round(techScore / techCount) : 0,
        hrScore: hrCount > 0 ? Math.round(hrScore / hrCount) : 0,
        communication: Math.max(0, avgScore - 5),
        confidence: avgScore,
        relevance: avgScore,
        problemSolving: avgScore,
        strengths: avgScore >= 70 ? ['Detailed responses', 'Good communication'] : avgScore >= 40 ? ['Some effort shown'] : [],
        weaknesses: validationResult.emptyCount > 0
            ? [`${validationResult.emptyCount} questions not answered properly`]
            : avgScore < 50
                ? ['Answers need more detail']
                : [],
        areasToImprove: [
            { area: 'Answer Quality', suggestion: 'Provide detailed responses with specific examples', priority: avgScore < 50 ? 'high' : 'medium' },
            { area: 'Relevance', suggestion: 'Ensure answers directly address the question asked', priority: 'medium' }
        ],
        feedback: avgScore >= 70
            ? 'Good performance! Your answers were relevant and detailed.'
            : avgScore >= 40
                ? 'Average performance. Focus on providing more complete answers.'
                : 'Please provide more detailed and relevant answers to interview questions.',
        technicalFeedback: techCount > 0
            ? (techScore / techCount >= 50 ? 'Technical responses were adequate.' : 'Technical responses need improvement.')
            : 'No technical responses to evaluate.',
        communicationFeedback: 'Structure your answers with context, action, and results.',
        recommendations: [
            'Prepare specific examples from your experience',
            'Answer each question directly before elaborating',
            'Aim for 50-100 word responses for each question'
        ]
    };
}

/**
 * POST /api/onboarding-interview/skip
 * User skips the platform interview
 */
router.post('/skip', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID required' });
        }

        await User.findByIdAndUpdate(userId, {
            $set: {
                'platformInterview.status': 'skipped',
                'platformInterview.lastAttemptAt': new Date()
            }
        });

        console.log(`User ${userId} skipped platform interview`);

        res.json({
            success: true,
            message: 'Interview skipped. You can complete it later to apply for jobs.',
            warning: 'You cannot apply for jobs until you pass the platform interview.'
        });
    } catch (error) {
        console.error('Skip interview error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/onboarding-interview/start-session
 * Mark platform interview as in_progress
 */
router.post('/start-session', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID required' });
        }

        // Check if user can retry (if previously failed)
        const user = await User.findById(userId).select('platformInterview');

        if (user?.platformInterview?.status === 'failed') {
            if (!user.platformInterview.canRetry) {
                const retryAfter = user.platformInterview.retryAfter;
                if (retryAfter && new Date() < new Date(retryAfter)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Cannot retry yet',
                        message: `You can retry after ${new Date(retryAfter).toLocaleDateString()}`,
                        retryAfter
                    });
                }
            }
        }

        await User.findByIdAndUpdate(userId, {
            $set: {
                'platformInterview.status': 'in_progress'
            }
        });

        console.log(`User ${userId} started platform interview`);

        res.json({
            success: true,
            message: 'Interview session started'
        });
    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/onboarding-interview/status/:userId
 * Get platform interview status for a user
 */
router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('platformInterview role isOnboardingComplete interviewStatus jobSeekerProfile.interviewScore');

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Recruiters don't need platform interview
        if (user.role === 'recruiter') {
            return res.json({
                success: true,
                data: {
                    status: 'not_required',
                    canApplyForJobs: true,
                    message: 'Recruiters do not need platform interview'
                }
            });
        }

        const platformInterview = user.platformInterview || {};
        let status = platformInterview.status || 'pending';

        // BACKWARD COMPATIBILITY: If user completed onboarding before this feature,
        // treat them as having passed the platform interview
        if (status === 'pending' || !status) {
            if (user.isOnboardingComplete ||
                user.interviewStatus?.completed ||
                user.jobSeekerProfile?.interviewScore >= 60) {
                status = 'passed';

                // Auto-update their platformInterview status
                await User.findByIdAndUpdate(userId, {
                    $set: {
                        'platformInterview.status': 'passed',
                        'platformInterview.score': user.jobSeekerProfile?.interviewScore || 70,
                        'platformInterview.completedAt': new Date()
                    }
                });
                console.log(`[BACKWARD COMPAT] User ${userId} auto-marked as passed platform interview`);
            }
        }

        const canApplyForJobs = status === 'passed';

        // Check if can retry
        let canRetry = false;
        if (status === 'failed' && platformInterview.retryAfter) {
            canRetry = new Date() >= new Date(platformInterview.retryAfter);
        } else if (status === 'skipped' || status === 'pending') {
            canRetry = true;
        }

        res.json({
            success: true,
            data: {
                status,
                score: platformInterview.score || user.jobSeekerProfile?.interviewScore,
                attempts: platformInterview.attempts || 0,
                completedAt: platformInterview.completedAt,
                canApplyForJobs,
                canRetry,
                retryAfter: platformInterview.retryAfter,
                message: canApplyForJobs
                    ? 'You can apply for jobs!'
                    : 'Complete the platform interview to apply for jobs.'
            }
        });
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
