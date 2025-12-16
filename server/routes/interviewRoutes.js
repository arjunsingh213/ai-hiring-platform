const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const User = require('../models/User');
const Job = require('../models/Job');
const aiService = require('../services/ai/aiService');
const deepseekService = require('../services/ai/deepseekService');

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

// Submit interview response - SMART ROUTING: Dynamically generate next question for job interviews
router.post('/:interviewId/response', async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { questionIndex, answer, timeSpent, round, skipEvaluation } = req.body;

        const interview = await Interview.findById(interviewId).populate('jobId');
        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        const question = interview.questions[questionIndex];

        // VALIDATE ANSWER: Reject gibberish/nonsense answers
        // For job interviews, use strict validation
        if (interview.jobId && !skipEvaluation) {
            try {
                console.log(`[VALIDATION] Checking answer for Q${questionIndex + 1}: "${answer.substring(0, 50)}..."`);
                const validation = await deepseekService.validateAnswer(
                    question.question,
                    answer
                );

                if (!validation.valid) {
                    console.log(`[VALIDATION] Answer rejected: ${validation.message}`);
                    return res.status(400).json({
                        success: false,
                        error: validation.message || 'Please provide a more detailed and relevant answer.',
                        code: 'INVALID_ANSWER'
                    });
                }
                console.log('[VALIDATION] Answer accepted');
            } catch (validationError) {
                console.error('[VALIDATION] Error during validation, allowing answer:', validationError.message);
                // If validation fails, allow the answer through (fail-open for reliability)
            }
        }

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

        // SMART LOGIC: If this is a job interview (has jobId), generate NEXT question dynamically
        if (interview.jobId) {
            const job = interview.jobId;
            const currentCount = interview.responses.length;

            // Check if we need to generate next question (up to 10 total)
            if (currentCount < 10) {
                try {
                    // Build job description summary for context
                    const jobDescriptionSummary = `
Job Title: ${job.title}
Required Skills: ${job.requirements?.skills?.join(', ') || 'Not specified'}
Experience Level: ${job.requirements?.experienceLevel || 'Not specified'}
Description: ${job.description?.substring(0, 500) || 'Not provided'}
                    `.trim();

                    // Build history for context
                    const history = interview.questions.slice(0, currentCount).map((q, i) => ({
                        question: q.question,
                        answer: interview.responses[i]?.answer || '',
                        type: q.category
                    }));

                    // Determine round: 1-5 technical, 6-10 HR
                    const roundType = currentCount < 5 ? 'technical' : 'hr';

                    console.log(`[SMART INTERVIEW] Generating Q${currentCount + 1}/10 (${roundType}) for job: ${job.title}`);

                    // Generate next question using deepseekService with JD context
                    const nextQuestion = await deepseekService.generateNextQuestion(
                        jobDescriptionSummary,
                        job.title,
                        job.requirements?.experienceLevel || 'mid',
                        history,
                        roundType
                    );

                    // Add to interview questions
                    interview.questions.push({
                        question: nextQuestion.question,
                        generatedBy: 'ai',
                        category: nextQuestion.type || roundType,
                        difficulty: 'medium',
                        expectedTopics: job.requirements?.skills?.slice(0, 3) || []
                    });

                    await interview.save();

                    console.log(`[SMART INTERVIEW] Generated question ${currentCount + 1}: "${nextQuestion.question.substring(0, 50)}..."`);
                } catch (nextQError) {
                    console.error('Failed to generate next question:', nextQError);
                    // Don't fail the response submission if question generation fails
                }
            }
        }

        res.json({
            success: true,
            message: 'Answer recorded',
            progress: {
                answered: interview.responses.length,
                // For job interviews, always show total as 10 (dynamic generation)
                total: interview.jobId ? 10 : interview.questions.length
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
            // SMART ROUTING: Use deepseekService for job interviews, aiService for platform interviews
            if (interview.jobId) {
                console.log('[SMART INTERVIEW] Using deepseekService for job interview evaluation');
                overallEvaluation = await deepseekService.evaluateAllAnswers(
                    questionsAndAnswers,
                    {
                        jobTitle: job?.title || 'Position',
                        jobDescription: job?.description || '',
                        requiredSkills: job?.requirements?.skills || []
                    }
                );
            } else {
                console.log('[INTERVIEW] Using aiService for platform interview evaluation');
                overallEvaluation = await aiService.evaluateAllAnswers(
                    questionsAndAnswers,
                    {
                        jobTitle: job?.title || 'Position',
                        jobDescription: job?.description || '',
                        requiredSkills: job?.requirements?.skills || []
                    }
                );
            }
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

// Save coding test results
router.post('/:interviewId/coding-results', async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { codingResults } = req.body;

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        // Save coding results
        interview.codingResults = {
            score: codingResults.score || 0,
            passed: codingResults.testsPassed >= codingResults.totalTests / 2,
            language: codingResults.language || 'JavaScript',
            testsPassed: codingResults.testsPassed || 0,
            totalTests: codingResults.totalTests || 0,
            skipped: codingResults.skipped || false,
            completedAt: new Date(),
            code: codingResults.code || ''
        };

        // Update overall score to include coding
        if (!codingResults.skipped && interview.scoring) {
            const interviewScore = interview.scoring.overallScore || 0;
            const codingScore = codingResults.score || 0;
            // Combined score: 70% interview, 30% coding
            interview.scoring.overallScore = Math.round(interviewScore * 0.7 + codingScore * 0.3);
            interview.scoring.codingScore = codingScore;
        }

        await interview.save();

        console.log(`[CODING RESULTS] Saved for interview ${interviewId}: score=${codingResults.score}, skipped=${codingResults.skipped}`);

        res.json({
            success: true,
            message: 'Coding results saved',
            data: {
                codingResults: interview.codingResults,
                updatedOverallScore: interview.scoring?.overallScore
            }
        });
    } catch (error) {
        console.error('Save coding results error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save round completion results (for pipeline-aware interviews)
router.post('/:interviewId/round-complete', async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { roundIndex, roundType, score, details } = req.body;

        const interview = await Interview.findById(interviewId).populate('jobId');
        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        // Add round result
        interview.roundResults = interview.roundResults || [];
        interview.roundResults.push({
            roundIndex,
            roundType,
            score,
            passed: score >= (interview.pipelineConfig?.rounds?.[roundIndex]?.scoring?.passingScore || 50),
            details,
            completedAt: new Date()
        });

        // Check if this was the last round
        const totalRounds = interview.pipelineConfig?.rounds?.length || 1;
        const completedRounds = interview.roundResults.length;

        let nextRoundQuestion = null;

        if (completedRounds >= totalRounds) {
            // All rounds complete - calculate overall score
            const avgScore = interview.roundResults.reduce((sum, r) => sum + r.score, 0) / completedRounds;

            interview.status = 'completed';
            interview.completedAt = new Date();
            interview.passed = avgScore >= 60;
            interview.scoring = {
                ...interview.scoring,
                overallScore: Math.round(avgScore),
                roundScores: interview.roundResults.map(r => ({ round: r.roundType, score: r.score }))
            };

            console.log(`[ROUND COMPLETE] Interview ${interviewId} fully completed. Avg score: ${avgScore}`);
        } else {
            // Advance to next round
            interview.currentRoundIndex = completedRounds;
            const nextRound = interview.pipelineConfig?.rounds?.[completedRounds];

            console.log(`[ROUND COMPLETE] Round ${roundIndex} (${roundType}) completed. Advancing to round ${completedRounds}: ${nextRound?.roundType}`);

            // If next round is a Q&A type, generate the first question
            if (nextRound && ['technical', 'hr', 'behavioral', 'screening'].includes(nextRound.roundType)) {
                try {
                    const job = interview.jobId;
                    const jobDescriptionSummary = `
Job Title: ${job?.title || 'Unknown'}
Required Skills: ${job?.requirements?.skills?.join(', ') || 'Not specified'}
Experience Level: ${job?.requirements?.experienceLevel || 'Not specified'}
Description: ${job?.description?.substring(0, 500) || 'Not provided'}
                    `.trim();

                    // Generate first question for new round
                    nextRoundQuestion = await deepseekService.generateNextQuestion(
                        jobDescriptionSummary,
                        job?.title || 'Job',
                        job?.requirements?.experienceLevel || 'mid',
                        [], // No previous answers for this round
                        nextRound.roundType
                    );

                    // Add question to interview
                    interview.questions.push({
                        question: nextRoundQuestion.question,
                        generatedBy: 'ai',
                        category: nextRound.roundType,
                        difficulty: 'medium',
                        roundIndex: completedRounds
                    });

                    console.log(`[ROUND COMPLETE] Generated first question for ${nextRound.roundType} round`);
                } catch (genError) {
                    console.error('[ROUND COMPLETE] Error generating question for next round:', genError);
                }
            }
        }

        await interview.save();

        res.json({
            success: true,
            message: completedRounds >= totalRounds ? 'All rounds completed' : 'Round completed',
            data: {
                roundResults: interview.roundResults,
                currentRoundIndex: interview.currentRoundIndex,
                isComplete: completedRounds >= totalRounds,
                overallScore: interview.scoring?.overallScore,
                nextRound: interview.pipelineConfig?.rounds?.[completedRounds],
                nextQuestion: nextRoundQuestion
            }
        });
    } catch (error) {
        console.error('Round complete error:', error);
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

// Get DETAILED interview results with question-by-question breakdown
router.get('/:id/detailed-results', async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id)
            .populate('userId', 'profile.name profile.photo profile.email')
            .populate('resumeId')
            .populate('jobId', 'title company description requirements');

        if (!interview) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        if (interview.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Interview not completed yet'
            });
        }

        // Build question-by-question breakdown
        const breakdown = [];
        const questions = interview.questions || [];
        const responses = interview.responses || [];

        questions.forEach((q, index) => {
            const response = responses.find(r => r.questionIndex === index) || responses[index];
            const answer = response?.answer || 'No answer provided';

            // Evaluate answer quality for display
            const wordCount = answer.trim().split(/\s+/).filter(w => w.length > 0).length;
            let qualityScore = 'poor';
            let qualityLabel = 'Needs Improvement';

            if (wordCount >= 50) {
                qualityScore = 'excellent';
                qualityLabel = 'Excellent Response';
            } else if (wordCount >= 30) {
                qualityScore = 'good';
                qualityLabel = 'Good Response';
            } else if (wordCount >= 15) {
                qualityScore = 'fair';
                qualityLabel = 'Fair Response';
            }

            breakdown.push({
                questionNumber: index + 1,
                question: q.question,
                category: q.category || 'general',
                difficulty: q.difficulty || 'medium',
                assessingSkill: q.assessingSkill || 'General Knowledge',
                expectedTopics: q.expectedTopics || [],
                answer: answer,
                timeSpent: response?.timeSpent || 0,
                qualityScore,
                qualityLabel,
                wordCount,
                feedback: response?.evaluation?.feedback || generateFeedbackForAnswer(answer, q, wordCount)
            });
        });

        // Calculate round-wise scores
        const technicalQuestions = breakdown.filter(b =>
            ['technical', 'problem_solving', 'role_fit'].includes(b.category)
        );
        const hrQuestions = breakdown.filter(b =>
            !['technical', 'problem_solving', 'role_fit'].includes(b.category)
        );

        // Generate improvement recommendations
        const recommendations = generateImprovementRecommendations(
            interview.scoring,
            breakdown
        );

        res.json({
            success: true,
            data: {
                interview: {
                    id: interview._id,
                    interviewType: interview.interviewType,
                    status: interview.status,
                    duration: interview.duration,
                    completedAt: interview.completedAt,
                    passed: interview.passed
                },
                candidate: interview.userId ? {
                    name: interview.userId.profile?.name,
                    photo: interview.userId.profile?.photo,
                    email: interview.userId.profile?.email
                } : null,
                job: interview.jobId ? {
                    title: interview.jobId.title,
                    company: interview.jobId.company?.name || interview.jobId.company,
                    description: interview.jobId.description
                } : null,
                scoring: {
                    overall: interview.scoring?.overallScore || 0,
                    technical: interview.scoring?.technicalAccuracy || 0,
                    communication: interview.scoring?.communication || 0,
                    confidence: interview.scoring?.confidence || 0,
                    relevance: interview.scoring?.relevance || 0,
                    coding: interview.codingResults?.score // Only included if coding was done
                },
                codingResults: interview.codingResults || null,
                strengths: interview.scoring?.strengths || [],
                weaknesses: interview.scoring?.weaknesses || [],
                detailedFeedback: interview.scoring?.detailedFeedback || '',
                breakdown: breakdown,
                rounds: {
                    technical: {
                        questionsCount: technicalQuestions.length,
                        questions: technicalQuestions
                    },
                    hr: {
                        questionsCount: hrQuestions.length,
                        questions: hrQuestions
                    }
                },
                recommendations: recommendations,
                matchScore: interview.matchScore
            }
        });
    } catch (error) {
        console.error('Detailed results error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Generate feedback for a specific answer
 */
function generateFeedbackForAnswer(answer, question, wordCount) {
    if (wordCount < 5) {
        return 'This response is too brief. Consider providing more context and details.';
    }
    if (wordCount < 20) {
        return 'Your response could benefit from more detail. Try to explain your reasoning and provide specific examples.';
    }
    if (wordCount < 50) {
        return 'Good effort! Adding specific examples or metrics would strengthen your response.';
    }
    return 'Well-structured response with good detail.';
}

/**
 * Generate improvement recommendations based on performance
 */
function generateImprovementRecommendations(scoring, breakdown) {
    const recommendations = [];

    // Score-based recommendations
    if ((scoring?.technicalAccuracy || 0) < 60) {
        recommendations.push({
            area: 'Technical Skills',
            priority: 'high',
            suggestion: 'Focus on deepening your technical knowledge. Consider practicing coding exercises, reviewing system design concepts, and staying updated with industry best practices.',
            resources: ['LeetCode', 'System Design Primer', 'Technical blogs']
        });
    }

    if ((scoring?.communication || 0) < 60) {
        recommendations.push({
            area: 'Communication',
            priority: 'high',
            suggestion: 'Work on structuring your responses using the STAR method (Situation, Task, Action, Result). Practice articulating your thoughts clearly and concisely.',
            resources: ['STAR Method Guide', 'Toastmasters', 'Mock interviews']
        });
    }

    if ((scoring?.confidence || 0) < 60) {
        recommendations.push({
            area: 'Confidence',
            priority: 'medium',
            suggestion: 'Build confidence by practicing with peers, recording yourself, and reflecting on your achievements. Preparation is key to confidence.',
            resources: ['Mock interview platforms', 'Self-recording practice']
        });
    }

    // Breakdown-based recommendations
    const shortResponses = breakdown.filter(b => b.wordCount < 20).length;
    if (shortResponses > breakdown.length / 2) {
        recommendations.push({
            area: 'Response Depth',
            priority: 'high',
            suggestion: 'Your responses tend to be brief. Practice elaborating on your answers with specific examples, quantifiable achievements, and detailed explanations.',
            resources: ['Interview preparation guides', 'STAR method examples']
        });
    }

    // Category-specific recommendations
    const poorTechnical = breakdown.filter(b =>
        ['technical', 'problem_solving'].includes(b.category) &&
        b.qualityScore === 'poor'
    );
    if (poorTechnical.length > 0) {
        recommendations.push({
            area: 'Problem Solving',
            priority: 'medium',
            suggestion: `Review and practice ${poorTechnical.map(b => b.assessingSkill).join(', ')} skills. Break down complex problems into smaller steps and explain your thought process.`,
            resources: ['Coding practice platforms', 'Algorithm courses']
        });
    }

    // Add positive note if doing well
    if ((scoring?.overallScore || 0) >= 70) {
        recommendations.push({
            area: 'Keep It Up',
            priority: 'low',
            suggestion: 'You performed well in this interview! Continue refining your skills and stay prepared for future opportunities.',
            resources: []
        });
    }

    return recommendations;
}

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
