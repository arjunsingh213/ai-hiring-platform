const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const User = require('../models/User');
const Job = require('../models/Job');
const aiService = require('../services/ai/aiService');

// Start a new interview (for job applications)
router.post('/start', async (req, res) => {
    try {
        const { userId, interviewType, jobId } = req.body;

        // If interview already exists for this job, return it
        if (jobId) {
            const existingInterview = await Interview.findOne({
                userId,
                jobId,
                status: { $in: ['scheduled', 'in_progress'] }
            });

            if (existingInterview) {
                existingInterview.status = 'in_progress';
                existingInterview.startedAt = existingInterview.startedAt || new Date();
                await existingInterview.save();

                return res.json({
                    success: true,
                    data: existingInterview,
                    message: 'Resuming existing interview'
                });
            }
        }

        let questions = [];
        let resumeId = null;
        let matchScore = null;
        let job = null;

        // Get job details if jobId provided
        if (jobId) {
            job = await Job.findById(jobId);
        }

        // Try to get user's resume
        const resume = await Resume.findOne({ userId });

        if (resume) {
            resumeId = resume._id;

            // Generate questions using Qwen3 235B
            try {
                questions = await aiService.generateInterviewQuestions(
                    resume.parsedData,
                    interviewType,
                    job ? {
                        title: job.title,
                        description: job.description,
                        requirements: job.requirements,
                        matchScore: matchScore
                    } : {}
                );
            } catch (aiError) {
                console.log('AI service unavailable, using fallback questions');
            }
        }

        // Use fallback questions if AI generation failed or no resume
        if (questions.length === 0) {
            const jobSkills = job?.requirements?.skills?.join(', ') || '';
            questions = aiService.getFallbackQuestions(interviewType, job?.title || 'the position', jobSkills);
        }

        // Create interview with TWO ROUNDS of questions
        // Split questions into technical and HR categories
        const technicalQuestions = questions.filter(q =>
            ['technical', 'problem_solving', 'role_fit'].includes(q.category)
        );
        const hrQuestions = questions.filter(q =>
            ['behavioral', 'situational', 'competency'].includes(q.category)
        );

        // Ensure we have questions for both rounds
        let allQuestions = [];
        if (technicalQuestions.length >= 2 && hrQuestions.length >= 2) {
            allQuestions = [...technicalQuestions, ...hrQuestions];
        } else {
            // Split evenly if categories not properly assigned
            const half = Math.ceil(questions.length / 2);
            allQuestions = questions.map((q, i) => ({
                ...q,
                category: i < half ? 'technical' : 'behavioral'
            }));
        }

        const interview = new Interview({
            userId,
            resumeId,
            jobId,
            interviewType,
            questions: allQuestions.map(q => ({
                question: q.question,
                generatedBy: 'ai',
                category: q.category || 'general',
                difficulty: q.difficulty || 'medium',
                expectedTopics: q.expectedTopics || [],
                assessingSkill: q.assessingSkill || '',
                timeLimit: q.timeLimit || 120
            })),
            status: 'in_progress',
            startedAt: new Date()
        });

        await interview.save();

        res.status(201).json({
            success: true,
            data: interview,
            message: 'Interview started with Technical and HR rounds'
        });
    } catch (error) {
        console.error('Start interview error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Submit interview response - Stores answer without immediate evaluation
router.post('/:interviewId/response', async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { questionIndex, answer, timeSpent, round, skipEvaluation } = req.body;

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        const question = interview.questions[questionIndex];

        // Store response without evaluation (evaluation happens at the end)
        interview.responses.push({
            questionIndex,
            answer,
            timeSpent,
            round: round || question?.category || 'general',
            // No evaluation yet - will be done at completion
            evaluation: null,
            confidence: 0
        });

        await interview.save();

        res.json({
            success: true,
            message: 'Answer recorded',
            progress: {
                answered: interview.responses.length,
                total: interview.questions.length
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

        if (interview.proctoring.totalFlags > 5) {
            interview.proctoring.riskLevel = 'high';
        } else if (interview.proctoring.totalFlags > 2) {
            interview.proctoring.riskLevel = 'medium';
        }

        await interview.save();

        res.json({ success: true, data: interview.proctoring });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Complete interview - OVERALL EVALUATION with STRICT ANALYSIS
router.post('/:interviewId/complete', async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { allAnswers, evaluateOverall } = req.body;

        const interview = await Interview.findById(interviewId)
            .populate('userId', 'profile.name profile.email')
            .populate('jobId');

        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        // Get job info (jobId is now populated object or null)
        const job = interview.jobId;
        const jobIdValue = job?._id || interview.jobId;

        // Build questions and answers array
        // Use allAnswers from frontend if responses array is empty
        let questionsAndAnswers = [];

        const responses = interview.responses || [];
        const questions = interview.questions || [];

        if (responses.length > 0) {
            questionsAndAnswers = responses.map((r, i) => ({
                question: questions[r.questionIndex]?.question || questions[i]?.question || 'Question ' + (i + 1),
                answer: r.answer || '',
                category: questions[r.questionIndex]?.category || 'general',
                expectedTopics: questions[r.questionIndex]?.expectedTopics || [],
                assessingSkill: questions[r.questionIndex]?.assessingSkill || ''
            }));
        } else if (allAnswers && allAnswers.length > 0) {
            // Use answers passed from frontend
            questionsAndAnswers = allAnswers.map((a, i) => ({
                question: questions[a.questionIndex]?.question || questions[i]?.question || 'Question ' + (i + 1),
                answer: a.answer || '',
                category: questions[a.questionIndex]?.category || a.category || 'general',
                expectedTopics: questions[a.questionIndex]?.expectedTopics || [],
                assessingSkill: questions[a.questionIndex]?.assessingSkill || ''
            }));

            // Store these answers in the interview
            interview.responses = allAnswers.map(a => ({
                questionIndex: a.questionIndex,
                answer: a.answer,
                timeSpent: a.timeSpent || 0
            }));
        }

        // If still no Q&A, create dummy data to prevent crash
        if (questionsAndAnswers.length === 0) {
            questionsAndAnswers = [{
                question: 'General interview question',
                answer: 'No response recorded',
                category: 'general',
                expectedTopics: [],
                assessingSkill: ''
            }];
        }

        // STRICT OVERALL EVALUATION using AI
        let overallEvaluation;
        try {
            overallEvaluation = await aiService.evaluateAllAnswers(
                questionsAndAnswers,
                {
                    jobTitle: job?.title || 'Position',
                    jobDescription: job?.description || '',
                    requiredSkills: job?.requirements?.skills || []
                }
            );
        } catch (evalError) {
            console.error('AI evaluation failed, using rule-based:', evalError.message);
            // RULE-BASED STRICT EVALUATION as fallback
            overallEvaluation = performStrictLocalEvaluation(questionsAndAnswers, interview);
        }

        // Ensure overallEvaluation has required fields
        overallEvaluation = {
            overallScore: overallEvaluation?.overallScore || 0,
            technicalScore: overallEvaluation?.technicalScore || 0,
            hrScore: overallEvaluation?.hrScore || 0,
            confidence: overallEvaluation?.confidence || 0,
            relevance: overallEvaluation?.relevance || 0,
            strengths: overallEvaluation?.strengths || ['Completed the interview'],
            weaknesses: overallEvaluation?.weaknesses || [],
            feedback: overallEvaluation?.feedback || 'Interview completed.'
        };

        // Generate recruiter report (with fallback)
        let recruiterReport = {
            summary: `Candidate scored ${overallEvaluation.overallScore}% overall. Technical: ${overallEvaluation.technicalScore}%, HR: ${overallEvaluation.hrScore}%.`,
            recommendation: overallEvaluation.overallScore >= 70 ? 'strongly_consider' :
                overallEvaluation.overallScore >= 50 ? 'consider' : 'not_recommended',
            keyStrengths: overallEvaluation.strengths,
            areasToImprove: overallEvaluation.weaknesses,
            detailedAnalysis: overallEvaluation.feedback
        };

        try {
            const aiReport = await aiService.generateRecruiterReport({
                candidate: {
                    name: interview.userId?.profile?.name || 'Candidate',
                    email: interview.userId?.profile?.email
                },
                job: job ? { title: job.title, company: job.company } : null,
                matchScore: interview.matchScore,
                responses: questionsAndAnswers,
                overallScore: overallEvaluation.overallScore,
                proctoring: interview.proctoring
            });
            if (aiReport) recruiterReport = { ...recruiterReport, ...aiReport };
        } catch (reportError) {
            console.error('Report generation failed, using fallback:', reportError.message);
        }

        // Update interview
        interview.status = 'completed';
        interview.completedAt = new Date();
        interview.duration = interview.startedAt
            ? Math.floor((interview.completedAt - interview.startedAt) / 1000)
            : 0;
        interview.scoring = {
            technicalAccuracy: overallEvaluation.technicalScore,
            communication: overallEvaluation.hrScore,
            confidence: overallEvaluation.confidence,
            relevance: overallEvaluation.relevance,
            overallScore: overallEvaluation.overallScore,
            strengths: overallEvaluation.strengths,
            weaknesses: overallEvaluation.weaknesses,
            detailedFeedback: overallEvaluation.feedback
        };
        interview.passed = overallEvaluation.overallScore >= 60;
        interview.recruiterReport = recruiterReport;

        await interview.save();

        // Update user (with null checks)
        try {
            const userId = interview.userId?._id || interview.userId;
            if (userId) {
                const user = await User.findById(userId);
                if (user) {
                    user.interviewStatus = user.interviewStatus || {};
                    user.interviewStatus.technicalScore = overallEvaluation.technicalScore;
                    user.interviewStatus.hrScore = overallEvaluation.hrScore;
                    user.interviewStatus.completed = true;
                    user.interviewStatus.overallScore = overallEvaluation.overallScore;
                    user.interviewStatus.cracked = overallEvaluation.overallScore >= 60;
                    await user.save();
                }
            }
        } catch (userError) {
            console.error('User update failed:', userError.message);
        }

        // Update job applicant status
        try {
            if (jobIdValue) {
                const jobDoc = await Job.findById(jobIdValue);
                if (jobDoc) {
                    const userId = interview.userId?._id || interview.userId;
                    const applicant = jobDoc.applicants.find(a =>
                        a.userId.toString() === userId.toString()
                    );
                    if (applicant) {
                        applicant.status = 'interviewed';
                        applicant.interviewScore = overallEvaluation.overallScore;
                        applicant.interviewId = interview._id;
                        applicant.interviewCompleted = true;
                        await jobDoc.save();
                    }
                }
            }
        } catch (jobError) {
            console.error('Job update failed:', jobError.message);
        }

        res.json({
            success: true,
            data: {
                interview: {
                    id: interview._id,
                    status: interview.status,
                    duration: interview.duration,
                    passed: interview.passed
                },
                scoring: interview.scoring,
                recruiterReport: recruiterReport
            },
            message: 'Interview completed successfully'
        });
    } catch (error) {
        console.error('Complete interview error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * STRICT LOCAL EVALUATION - When AI is unavailable
 * Analyzes answers for quality, relevance, and content
 */
function performStrictLocalEvaluation(questionsAndAnswers, interview) {
    let technicalScore = 0;
    let hrScore = 0;
    let technicalCount = 0;
    let hrCount = 0;
    const strengths = [];
    const weaknesses = [];

    questionsAndAnswers.forEach(qa => {
        const answer = (qa.answer || '').trim().toLowerCase();
        const question = (qa.question || '').toLowerCase();
        const category = qa.category;
        const expectedTopics = qa.expectedTopics || [];

        let score = 0;

        // STRICT EVALUATION RULES

        // 1. Check answer length (very short = bad)
        const wordCount = answer.split(/\s+/).filter(w => w.length > 0).length;
        if (wordCount < 5) {
            score = 5; // Very short answer
            weaknesses.push('Extremely brief responses');
        } else if (wordCount < 20) {
            score = 20; // Short answer
            weaknesses.push('Responses lack detail');
        } else if (wordCount < 50) {
            score = 40 + Math.min(wordCount, 30);
        } else {
            score = 50 + Math.min((wordCount - 50) / 2, 20);
        }

        // 2. Check for gibberish/nonsense
        const gibberishPatterns = [
            /^[a-z]{1,3}(\s+[a-z]{1,3}){3,}$/i, // "ab cd ef gh"
            /(.)\1{4,}/i, // "aaaaa"
            /^(test|asdf|qwerty|hello|hi|ok|okay|yes|no|idk|nothing)[\s.,!?]*$/i,
            /^[\d\s.,!?]+$/, // Only numbers
            /^[^a-zA-Z]*$/ // No letters at all
        ];

        const isGibberish = gibberishPatterns.some(pattern => pattern.test(answer));
        if (isGibberish) {
            score = Math.min(score, 10);
            weaknesses.push('Responses appear to be incomplete or placeholder text');
        }

        // 3. Check relevance to question
        const questionKeywords = question.match(/\b\w{4,}\b/g) || [];
        const answerWords = answer.match(/\b\w{4,}\b/g) || [];
        const keywordMatches = questionKeywords.filter(kw =>
            answerWords.some(aw => aw.includes(kw) || kw.includes(aw))
        ).length;

        if (keywordMatches === 0 && questionKeywords.length > 2) {
            score = Math.min(score, 25);
            weaknesses.push('Responses not directly addressing questions');
        } else if (keywordMatches > 0) {
            score += Math.min(keywordMatches * 5, 15);
        }

        // 4. Check for expected topics
        const topicsAddressed = expectedTopics.filter(topic =>
            answer.includes(topic.toLowerCase())
        ).length;

        if (expectedTopics.length > 0) {
            if (topicsAddressed === 0) {
                score = Math.min(score, 40);
            } else {
                score += (topicsAddressed / expectedTopics.length) * 20;
                if (topicsAddressed >= expectedTopics.length / 2) {
                    strengths.push(`Addressed key topics in ${category} questions`);
                }
            }
        }

        // 5. Check for professional indicators
        const professionalPatterns = [
            /\b(implemented|developed|designed|managed|led|created|built|improved|achieved)\b/i,
            /\b(team|project|experience|company|role|responsibility)\b/i,
            /\b(years?|months?|worked|skills?|knowledge|learned)\b/i,
            /\b(problem|solution|approach|strategy|result|outcome)\b/i
        ];

        const professionalMatches = professionalPatterns.filter(p => p.test(answer)).length;
        if (professionalMatches >= 2) {
            score += 10;
            if (!strengths.includes('Uses professional language')) {
                strengths.push('Uses professional language');
            }
        }

        // 6. STAR method for behavioral questions
        if (['behavioral', 'situational'].includes(category)) {
            const starPatterns = {
                situation: /\b(situation|context|when|there was|at my|in my)\b/i,
                task: /\b(task|need(ed)?|had to|responsible|goal)\b/i,
                action: /\b(did|action|approach|decided|implemented|made|took)\b/i,
                result: /\b(result|outcome|achieved|improved|success|learned)\b/i
            };

            const starScore = Object.values(starPatterns).filter(p => p.test(answer)).length;
            if (starScore >= 3) {
                score += 15;
                strengths.push('Good use of STAR method');
            }
        }

        // Cap score at 100
        score = Math.min(Math.max(score, 0), 100);

        // Assign to correct category
        if (['technical', 'problem_solving', 'role_fit'].includes(category)) {
            technicalScore += score;
            technicalCount++;
        } else {
            hrScore += score;
            hrCount++;
        }
    });

    // Calculate averages
    technicalScore = technicalCount > 0 ? Math.round(technicalScore / technicalCount) : 0;
    hrScore = hrCount > 0 ? Math.round(hrScore / hrCount) : 0;

    // Overall score - weighted average
    const overallScore = technicalCount + hrCount > 0
        ? Math.round((technicalScore * technicalCount + hrScore * hrCount) / (technicalCount + hrCount))
        : 0;

    // Add default feedback if no strengths/weaknesses identified
    if (strengths.length === 0) {
        if (overallScore >= 60) {
            strengths.push('Completed all questions');
        } else {
            strengths.push('Attempted the interview');
        }
    }

    if (weaknesses.length === 0 && overallScore < 70) {
        weaknesses.push('Consider providing more detailed responses');
    }

    return {
        overallScore,
        technicalScore,
        hrScore,
        confidence: overallScore,
        relevance: overallScore,
        strengths: [...new Set(strengths)].slice(0, 5),
        weaknesses: [...new Set(weaknesses)].slice(0, 5),
        feedback: overallScore >= 60
            ? 'Your answers demonstrated relevant experience and knowledge.'
            : 'Your responses need more depth and specificity to demonstrate your qualifications.'
    };
}

// Get interview by ID
router.get('/:id', async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id)
            .populate('userId', 'profile.name profile.photo profile.email')
            .populate('resumeId')
            .populate('jobId', 'title company description requirements');

        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        res.json({ success: true, data: interview });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get recruiter report for interview
router.get('/:id/report', async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id)
            .populate('userId', 'profile.name profile.photo profile.email')
            .populate('jobId', 'title company');

        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        if (!interview.recruiterReport) {
            return res.status(404).json({ success: false, error: 'Report not generated yet' });
        }

        res.json({
            success: true,
            data: {
                candidate: {
                    name: interview.userId?.profile?.name,
                    photo: interview.userId?.profile?.photo,
                    email: interview.userId?.profile?.email
                },
                job: interview.jobId ? {
                    title: interview.jobId.title,
                    company: interview.jobId.company
                } : null,
                matchScore: interview.matchScore,
                scoring: interview.scoring,
                report: interview.recruiterReport,
                proctoring: interview.proctoring,
                completedAt: interview.completedAt,
                duration: interview.duration
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's interviews
router.get('/user/:userId', async (req, res) => {
    try {
        const interviews = await Interview.find({ userId: req.params.userId })
            .populate('jobId', 'title company')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: interviews, count: interviews.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
