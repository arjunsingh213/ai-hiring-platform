const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const User = require('../models/User');
const aiService = require('../services/ai/aiService');

// Start a new interview
router.post('/start', async (req, res) => {
    try {
        const { userId, interviewType } = req.body;

        let questions = [];
        let resumeId = null;

        // Try to get user's resume (optional)
        const resume = await Resume.findOne({ userId });

        if (resume) {
            resumeId = resume._id;
            // Try to generate questions using AI
            try {
                questions = await aiService.generateInterviewQuestions(resume.parsedData, interviewType);
            } catch (aiError) {
                console.log('AI service unavailable, using fallback questions');
            }
        }

        // Use fallback questions if AI generation failed or no resume
        if (questions.length === 0) {
            questions = interviewType === 'technical' ? [
                {
                    question: 'Tell me about yourself and your technical background.',
                    category: 'introduction',
                    difficulty: 'easy'
                },
                {
                    question: 'What programming languages are you most comfortable with and why?',
                    category: 'technical',
                    difficulty: 'medium'
                },
                {
                    question: 'Describe a challenging project you worked on and how you overcame the obstacles.',
                    category: 'experience',
                    difficulty: 'medium'
                },
                {
                    question: 'How do you stay updated with the latest technology trends?',
                    category: 'learning',
                    difficulty: 'easy'
                },
                {
                    question: 'Where do you see yourself in the next 3-5 years?',
                    category: 'career',
                    difficulty: 'easy'
                }
            ] : [
                {
                    question: 'Tell me about yourself.',
                    category: 'introduction',
                    difficulty: 'easy'
                },
                {
                    question: 'Why do you want to work for our company?',
                    category: 'motivation',
                    difficulty: 'medium'
                },
                {
                    question: 'What are your greatest strengths and weaknesses?',
                    category: 'self-assessment',
                    difficulty: 'medium'
                },
                {
                    question: 'Describe a time when you had to work in a team. What was your role?',
                    category: 'teamwork',
                    difficulty: 'medium'
                },
                {
                    question: 'What are your salary expectations?',
                    category: 'compensation',
                    difficulty: 'easy'
                }
            ];
        }

        // Create interview
        const interview = new Interview({
            userId,
            resumeId,
            interviewType,
            questions,
            status: 'in_progress',
            startedAt: new Date()
        });

        await interview.save();

        res.status(201).json({
            success: true,
            data: interview,
            message: 'Interview started successfully'
        });
    } catch (error) {
        console.error('Start interview error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Submit interview response
router.post('/:interviewId/response', async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { questionIndex, answer, timeSpent } = req.body;

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        // Evaluate response using AI
        const question = interview.questions[questionIndex];
        const evaluation = await aiService.evaluateResponse(
            question.question,
            answer,
            interview.interviewType
        );

        // Add response
        interview.responses.push({
            questionIndex,
            answer,
            timeSpent,
            confidence: evaluation.confidence || 70
        });

        await interview.save();

        res.json({
            success: true,
            data: {
                evaluation,
                nextQuestion: interview.questions[questionIndex + 1] || null
            }
        });
    } catch (error) {
        console.error('Submit response error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Report proctoring flag
router.post('/:interviewId/proctoring-flag', async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { type, severity, description } = req.body;

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        interview.proctoring.flags.push({
            type,
            timestamp: new Date(),
            severity: severity || 'medium',
            description
        });

        interview.proctoring.totalFlags = interview.proctoring.flags.length;

        // Update risk level based on flags
        if (interview.proctoring.totalFlags > 5) {
            interview.proctoring.riskLevel = 'high';
        } else if (interview.proctoring.totalFlags > 2) {
            interview.proctoring.riskLevel = 'medium';
        }

        await interview.save();

        res.json({
            success: true,
            data: interview.proctoring
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Complete interview
router.post('/:interviewId/complete', async (req, res) => {
    try {
        const { interviewId } = req.params;

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        // Calculate scores
        const responses = interview.responses;
        const avgScore = responses.length > 0
            ? responses.reduce((sum, r) => sum + (r.confidence || 0), 0) / responses.length
            : 0;

        // Generate feedback using AI
        const feedback = await aiService.generateFeedback(responses, interview.interviewType);

        // Update interview
        interview.status = 'completed';
        interview.completedAt = new Date();
        interview.duration = Math.floor((interview.completedAt - interview.startedAt) / 1000);
        interview.scoring = {
            technicalAccuracy: avgScore,
            communication: avgScore,
            confidence: avgScore,
            relevance: avgScore,
            overallScore: avgScore,
            strengths: feedback.strengths || [],
            weaknesses: feedback.weaknesses || [],
            detailedFeedback: feedback.overallFeedback || ''
        };
        interview.passed = feedback.passed || avgScore >= 60;

        await interview.save();

        // Update user's interview status
        const user = await User.findById(interview.userId);
        if (user) {
            if (interview.interviewType === 'technical') {
                user.interviewStatus.technicalScore = avgScore;
            } else {
                user.interviewStatus.hrScore = avgScore;
            }

            // Check if both interviews are completed
            const technicalInterview = await Interview.findOne({
                userId: interview.userId,
                interviewType: 'technical',
                status: 'completed'
            });
            const hrInterview = await Interview.findOne({
                userId: interview.userId,
                interviewType: 'hr',
                status: 'completed'
            });

            if (technicalInterview && hrInterview) {
                user.interviewStatus.completed = true;
                user.interviewStatus.overallScore = (
                    (technicalInterview.scoring.overallScore + hrInterview.scoring.overallScore) / 2
                );
                user.interviewStatus.cracked = user.interviewStatus.overallScore >= 60;
                user.interviewStatus.strengths = [
                    ...technicalInterview.scoring.strengths,
                    ...hrInterview.scoring.strengths
                ];
                user.interviewStatus.weaknesses = [
                    ...technicalInterview.scoring.weaknesses,
                    ...hrInterview.scoring.weaknesses
                ];
            }

            await user.save();
        }

        res.json({
            success: true,
            data: interview,
            message: 'Interview completed successfully'
        });
    } catch (error) {
        console.error('Complete interview error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get interview by ID
router.get('/:id', async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id)
            .populate('userId')
            .populate('resumeId');

        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        res.json({ success: true, data: interview });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's interviews
router.get('/user/:userId', async (req, res) => {
    try {
        const interviews = await Interview.find({ userId: req.params.userId })
            .sort({ createdAt: -1 });

        res.json({ success: true, data: interviews, count: interviews.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
