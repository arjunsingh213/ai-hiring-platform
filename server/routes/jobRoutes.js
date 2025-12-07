const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const Resume = require('../models/Resume');
const Interview = require('../models/Interview');
const aiService = require('../services/ai/aiService');

// Create job posting
router.post('/', async (req, res) => {
    try {
        const job = new Job(req.body);

        // If raw description provided, format with AI
        if (req.body.rawDescription) {
            const formatted = await aiService.formatJobDescription(req.body.rawDescription);
            job.description = formatted.formattedDescription || req.body.rawDescription;
            job.aiGenerated.formattedDescription = formatted.formattedDescription;
            job.aiGenerated.suggestedSkills = formatted.suggestedSkills;
        }

        await job.save();
        res.status(201).json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all jobs (with filters)
router.get('/', async (req, res) => {
    try {
        const { skills, type, location, experienceLevel, status } = req.query;
        const query = {};

        if (skills) query['requirements.skills'] = { $in: skills.split(',') };
        if (type) query['jobDetails.type'] = type;
        if (location) query['jobDetails.location'] = new RegExp(location, 'i');
        if (experienceLevel) query['requirements.experienceLevel'] = experienceLevel;
        if (status) query.status = status;
        else query.status = 'active'; // Default to active jobs

        const jobs = await Job.find(query).populate('recruiterId').sort({ createdAt: -1 });
        res.json({ success: true, data: jobs, count: jobs.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get job by ID
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).populate('recruiterId');
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // Increment views
        job.views += 1;
        await job.save();

        res.json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Apply to job - ENHANCED with AI Interview integration
router.post('/:id/apply', async (req, res) => {
    try {
        const { userId, answers } = req.body;

        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // Check if already applied
        const alreadyApplied = job.applicants.some(app => app.userId.toString() === userId);
        if (alreadyApplied) {
            // Check if there's a pending interview
            const existingInterview = await Interview.findOne({
                userId,
                jobId: job._id,
                status: { $in: ['scheduled', 'in_progress'] }
            });

            if (existingInterview) {
                return res.json({
                    success: true,
                    message: 'You have a pending interview for this job',
                    interviewRequired: true,
                    interviewId: existingInterview._id
                });
            }

            return res.status(400).json({ success: false, error: 'Already applied to this job' });
        }

        // Get user's resume for JD-Resume matching
        const resume = await Resume.findOne({ userId });
        const user = await User.findById(userId);

        let matchScore = null;
        let resumeData = null;

        if (resume && resume.parsedData) {
            resumeData = resume.parsedData;

            // Match resume to job description using Gemma 2 9B
            try {
                matchScore = await aiService.matchResumeToJD(
                    resumeData,
                    job.description,
                    job.requirements
                );
            } catch (matchError) {
                console.error('Match scoring failed:', matchError);
                matchScore = {
                    overall: 70,
                    skills: 70,
                    experience: 70,
                    education: 70,
                    matchedSkills: [],
                    missingSkills: [],
                    interviewFocus: []
                };
            }
        }

        // Generate interview questions using Qwen3 235B
        // Questions are based on job skills, roles, and responsibilities
        let questions = [];
        try {
            questions = await aiService.generateInterviewQuestions(
                resumeData || {},
                'combined', // Combined technical + behavioral
                {
                    title: job.title,
                    description: job.description,
                    requirements: job.requirements, // Pass full requirements (skills, experience, education)
                    matchScore
                }
            );
        } catch (questionError) {
            console.error('Question generation failed:', questionError);
            // Pass job title and skills for job-specific fallback questions
            questions = aiService.getFallbackQuestions('combined', job.title, job.requirements?.skills?.join(', ') || '');
        }

        // Create interview record
        const interview = new Interview({
            userId,
            resumeId: resume?._id,
            jobId: job._id,
            interviewType: 'combined',
            status: 'scheduled',
            matchScore: matchScore ? {
                overall: matchScore.overallMatch || matchScore.overall,
                skills: matchScore.skillsMatch || matchScore.skills,
                experience: matchScore.experienceMatch || matchScore.experience,
                education: matchScore.educationMatch || matchScore.education,
                matchedSkills: matchScore.matchedSkills || [],
                missingSkills: matchScore.missingSkills || [],
                interviewFocus: matchScore.interviewFocus || []
            } : null,
            questions: questions.map(q => ({
                question: q.question,
                generatedBy: 'ai',
                category: q.category || 'general',
                difficulty: q.difficulty || 'medium',
                expectedTopics: q.expectedTopics || [],
                timeLimit: q.timeLimit || 120
            }))
        });

        await interview.save();

        // Add to job applicants with interview reference
        job.applicants.push({
            userId,
            answers: answers || [],
            status: 'applied',
            interviewId: interview._id
        });

        await job.save();

        res.json({
            success: true,
            message: 'Application submitted! Please complete the AI interview to proceed.',
            interviewRequired: true,
            interviewId: interview._id,
            matchScore: matchScore ? {
                overall: matchScore.overallMatch || matchScore.overall,
                skills: matchScore.skillsMatch || matchScore.skills
            } : null
        });
    } catch (error) {
        console.error('Job application error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check interview status for a job application
router.get('/:id/interview-status/:userId', async (req, res) => {
    try {
        const { id: jobId, userId } = req.params;

        const interview = await Interview.findOne({ jobId, userId }).sort({ createdAt: -1 });

        if (!interview) {
            return res.json({
                success: true,
                hasInterview: false,
                message: 'No interview found'
            });
        }

        res.json({
            success: true,
            hasInterview: true,
            interview: {
                id: interview._id,
                status: interview.status,
                matchScore: interview.matchScore,
                passed: interview.passed,
                completedAt: interview.completedAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update applicant status
router.put('/:jobId/applicants/:applicantId', async (req, res) => {
    try {
        const { jobId, applicantId } = req.params;
        const { status, notes } = req.body;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        const applicant = job.applicants.id(applicantId);
        if (!applicant) {
            return res.status(404).json({ success: false, error: 'Applicant not found' });
        }

        if (status) applicant.status = status;
        if (notes) applicant.notes = notes;

        await job.save();

        res.json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get jobs by recruiter
router.get('/recruiter/:recruiterId', async (req, res) => {
    try {
        const jobs = await Job.find({ recruiterId: req.params.recruiterId }).sort({ createdAt: -1 });
        res.json({ success: true, data: jobs, count: jobs.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get applicants for a job with interview data
router.get('/:id/applicants', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate({
                path: 'applicants.userId',
                select: 'profile.name profile.photo email role'
            });

        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // Fetch interview data for each applicant
        const applicantsWithInterviews = await Promise.all(
            job.applicants.map(async (applicant) => {
                const interview = await Interview.findOne({
                    userId: applicant.userId._id,
                    jobId: job._id
                }).select('status scoring matchScore recruiterReport passed completedAt');

                return {
                    ...applicant.toObject(),
                    interview: interview || null
                };
            })
        );

        res.json({
            success: true,
            data: applicantsWithInterviews,
            count: applicantsWithInterviews.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
