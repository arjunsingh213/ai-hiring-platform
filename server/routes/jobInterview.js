/**
 * Job-Specific Interview API
 * Generates interview questions based on job description instead of resume
 * Uses the same AI models and logic as platform interview
 */

const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const Interview = require('../models/Interview');
const deepseekService = require('../services/ai/deepseekService');
const { requirePlatformInterview } = require('../middleware/platformInterviewGuard');

/**
 * POST /api/job-interview/start
 * Start a job-specific interview session
 * Requires platform interview to be passed
 */
router.post('/start', requirePlatformInterview, async (req, res) => {
    try {
        const { userId, jobId } = req.body;

        if (!userId || !jobId) {
            return res.status(400).json({
                success: false,
                error: 'User ID and Job ID are required'
            });
        }

        // Get job details
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        // Check for existing interview
        let interview = await Interview.findOne({
            userId,
            jobId,
            status: { $in: ['scheduled', 'in_progress'] }
        });

        if (interview) {
            return res.json({
                success: true,
                interview: {
                    id: interview._id,
                    status: interview.status,
                    currentQuestion: interview.responses?.length || 0
                },
                message: 'Existing interview found'
            });
        }

        // Create job context from job description
        const jobContext = {
            title: job.title,
            description: job.description,
            skills: job.requirements?.skills || [],
            experienceLevel: job.requirements?.experienceLevel,
            company: job.company?.name
        };

        // Generate first question based on job description
        const jobDescriptionSummary = `
Job Title: ${job.title}
Required Skills: ${job.requirements?.skills?.join(', ') || 'Not specified'}
Experience Level: ${job.requirements?.experienceLevel || 'Not specified'}
Description: ${job.description?.substring(0, 500) || 'Not provided'}
        `.trim();

        const firstQuestion = await deepseekService.generateNextQuestion(
            jobDescriptionSummary,
            job.title,
            job.requirements?.experienceLevel || 'mid',
            [], // No history for first question
            'technical' // Start with technical round
        );

        // Create new interview
        interview = new Interview({
            userId,
            jobId,
            interviewType: 'combined',
            status: 'in_progress',
            questions: [{
                question: firstQuestion.question,
                generatedBy: 'ai',
                category: firstQuestion.type || 'technical',
                difficulty: 'medium',
                expectedTopics: job.requirements?.skills?.slice(0, 3) || []
            }],
            responses: []
        });

        await interview.save();

        // Update job applicant status
        const applicant = job.applicants.find(a => a.userId.toString() === userId);
        if (applicant) {
            applicant.interviewId = interview._id;
            applicant.status = 'interviewing';
            await job.save();
        }

        console.log(`[JOB INTERVIEW] Started interview ${interview._id} for job ${jobId}`);

        res.json({
            success: true,
            interview: {
                id: interview._id,
                status: 'in_progress'
            },
            question: firstQuestion,
            jobContext: {
                title: job.title,
                company: job.company?.name
            },
            totalQuestions: 10
        });
    } catch (error) {
        console.error('Job interview start error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/job-interview/next
 * Generate next question based on previous answer and job description
 */
router.post('/next', requirePlatformInterview, async (req, res) => {
    try {
        const { interviewId, answer, currentQuestion, questionIndex } = req.body;

        const interview = await Interview.findById(interviewId).populate('jobId');
        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        const job = interview.jobId;
        const currentCount = questionIndex || interview.responses.length;

        // Check if interview is complete (10 questions)
        if (currentCount >= 10) {
            return res.json({
                success: true,
                completed: true,
                message: 'Interview questions complete. Ready to submit.',
                totalAnswered: currentCount
            });
        }

        // Store the response
        if (answer && currentQuestion) {
            interview.responses.push({
                questionIndex: currentCount,
                answer: answer,
                timeSpent: 120 // Default 2 minutes
            });
        }

        // Build history for context
        const history = interview.questions.slice(0, currentCount + 1).map((q, i) => ({
            question: q.question,
            answer: interview.responses[i]?.answer || '',
            type: q.category
        }));

        // Determine round: 1-5 technical, 6-10 HR
        const round = currentCount + 1 <= 5 ? 'technical' : 'hr';

        // Generate job-specific summary for context
        const jobDescriptionSummary = `
Job Title: ${job.title}
Required Skills: ${job.requirements?.skills?.join(', ') || 'Not specified'}
Experience Level: ${job.requirements?.experienceLevel || 'Not specified'}
Description: ${job.description?.substring(0, 300) || 'Not provided'}
        `.trim();

        // Generate next question
        const nextQuestion = await deepseekService.generateNextQuestion(
            jobDescriptionSummary,
            job.title,
            job.requirements?.experienceLevel || 'mid',
            history,
            round
        );

        // Add to interview questions
        interview.questions.push({
            question: nextQuestion.question,
            generatedBy: 'ai',
            category: nextQuestion.type || round,
            difficulty: 'medium'
        });

        await interview.save();

        console.log(`[JOB INTERVIEW] Question ${currentCount + 2}/10 for interview ${interviewId}`);

        res.json({
            success: true,
            question: nextQuestion,
            questionNumber: currentCount + 2,
            totalQuestions: 10,
            isHRRound: round === 'hr',
            completed: false
        });
    } catch (error) {
        console.error('Job interview next question error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/job-interview/submit
 * Submit completed job interview for evaluation
 */
router.post('/submit', requirePlatformInterview, async (req, res) => {
    try {
        const { interviewId, answers, codingResults } = req.body;

        const interview = await Interview.findById(interviewId).populate('jobId');
        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        const job = interview.jobId;

        // Build Q&A for evaluation
        const questionsAndAnswers = interview.questions.map((q, i) => ({
            question: q.question,
            answer: answers[i]?.answer || interview.responses[i]?.answer || '',
            category: q.category,
            round: i < 5 ? 'technical' : 'hr'
        }));

        // Evaluate using same AI service
        const evaluation = await deepseekService.evaluateAllAnswers(questionsAndAnswers, {
            jobTitle: job.title,
            jobDescription: job.description,
            requiredSkills: job.requirements?.skills
        });

        // Combine with coding results if available
        let finalScore = evaluation.overallScore || 10;
        if (codingResults && codingResults.score !== undefined) {
            // 60% interview, 40% coding
            finalScore = Math.round((evaluation.overallScore * 0.6) + (codingResults.score * 0.4));
        }

        // Determine pass/fail
        const passed = (
            finalScore >= 60 &&
            (evaluation.technicalScore || 10) >= 50 &&
            (evaluation.hrScore || 10) >= 50
        );

        // Update interview record
        interview.status = 'completed';
        interview.completedAt = new Date();
        interview.passed = passed;
        interview.scoring = {
            technicalAccuracy: evaluation.technicalScore || 10,
            communication: evaluation.communication || 10,
            confidence: evaluation.confidence || 10,
            relevance: evaluation.relevance || 10,
            overallScore: finalScore,
            strengths: evaluation.strengths || [],
            weaknesses: evaluation.weaknesses || [],
            detailedFeedback: evaluation.feedback
        };

        await interview.save();

        // Update job applicant status
        const applicantIndex = job.applicants.findIndex(
            a => a.userId.toString() === interview.userId.toString()
        );
        if (applicantIndex !== -1) {
            job.applicants[applicantIndex].status = passed ? 'shortlisted' : 'reviewed';
            job.applicants[applicantIndex].interviewScore = finalScore;
            job.applicants[applicantIndex].interviewCompleted = true;
            await job.save();
        }

        console.log(`[JOB INTERVIEW] Interview ${interviewId} completed. Score: ${finalScore}, Passed: ${passed}`);

        res.json({
            success: true,
            data: {
                score: finalScore,
                technicalScore: evaluation.technicalScore || 10,
                hrScore: evaluation.hrScore || 10,
                codingScore: codingResults?.score,
                passed,
                feedback: evaluation.feedback,
                strengths: evaluation.strengths || [],
                weaknesses: evaluation.weaknesses || [],
                recommendations: evaluation.recommendations || []
            }
        });
    } catch (error) {
        console.error('Job interview submit error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/job-interview/:interviewId
 * Get interview status and details
 */
router.get('/:interviewId', async (req, res) => {
    try {
        const { interviewId } = req.params;

        const interview = await Interview.findById(interviewId)
            .populate('jobId', 'title company description requirements')
            .populate('userId', 'profile.name');

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        res.json({
            success: true,
            interview: {
                id: interview._id,
                status: interview.status,
                passed: interview.passed,
                scoring: interview.scoring,
                completedAt: interview.completedAt,
                job: interview.jobId,
                questionsAnswered: interview.responses.length,
                totalQuestions: 10
            }
        });
    } catch (error) {
        console.error('Get interview error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
