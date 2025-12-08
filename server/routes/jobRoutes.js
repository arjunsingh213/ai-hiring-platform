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

// Get jobs by recruiter ID
router.get('/recruiter/:recruiterId', async (req, res) => {
    try {
        const { recruiterId } = req.params;

        const jobs = await Job.find({ recruiterId })
            .populate('recruiterId', 'profile.name profile.company email')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: jobs, count: jobs.length });
    } catch (error) {
        console.error('Error fetching recruiter jobs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get comprehensive analytics for recruiter dashboard
router.get('/recruiter/:recruiterId/analytics', async (req, res) => {
    try {
        const { recruiterId } = req.params;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        // Get all jobs by this recruiter with populated applicants
        const jobs = await Job.find({ recruiterId })
            .populate({
                path: 'applicants.userId',
                select: 'profile.name profile.photo email'
            });

        // Calculate job stats
        const totalJobs = jobs.length;
        const jobsThisMonth = jobs.filter(j => new Date(j.createdAt) >= startOfMonth).length;
        const activeJobs = jobs.filter(j => j.status === 'active' || !j.status).length;

        // Calculate applicant stats
        let totalApplicants = 0;
        let applicantsThisWeek = 0;
        let hired = 0;
        let rejected = 0;
        let pending = 0;
        let interviewsCompleted = 0;
        let totalScore = 0;
        let scoreCount = 0;
        let lastMonthScore = 0;
        let lastMonthScoreCount = 0;
        const skillCounts = {};
        const recentActivity = [];
        const applicationsByDay = {};

        // Group applications by day for trend chart (last 30 days)
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            applicationsByDay[key] = 0;
        }

        for (const job of jobs) {
            // Track required skills
            (job.requirements?.skills || []).forEach(skill => {
                skillCounts[skill] = (skillCounts[skill] || 0) + 1;
            });

            // Process each applicant
            for (const applicant of job.applicants || []) {
                totalApplicants++;

                const appliedDate = new Date(applicant.appliedAt);
                const dayKey = appliedDate.toISOString().split('T')[0];
                if (applicationsByDay.hasOwnProperty(dayKey)) {
                    applicationsByDay[dayKey]++;
                }

                if (appliedDate >= startOfWeek) {
                    applicantsThisWeek++;
                }

                // Status counts
                if (applicant.status === 'hired') hired++;
                else if (applicant.status === 'rejected') rejected++;
                else pending++;

                // Interview scores
                if (applicant.interviewId) {
                    try {
                        const Interview = require('../models/Interview');
                        const interview = await Interview.findById(applicant.interviewId);
                        if (interview && interview.status === 'completed') {
                            interviewsCompleted++;
                            if (interview.scoring?.overall > 0) {
                                totalScore += interview.scoring.overall;
                                scoreCount++;
                                // Check if interview was from last month for comparison
                                if (interview.completedAt && new Date(interview.completedAt) < startOfMonth) {
                                    lastMonthScore += interview.scoring.overall;
                                    lastMonthScoreCount++;
                                }
                            }

                            // Add to recent activity
                            if (recentActivity.length < 10) {
                                recentActivity.push({
                                    type: 'interview_completed',
                                    title: 'Interview Completed',
                                    description: `${applicant.userId?.profile?.name || 'Candidate'} completed interview for ${job.title}`,
                                    timestamp: interview.completedAt,
                                    score: interview.scoring?.overall
                                });
                            }
                        }
                    } catch (err) {
                        // Skip if interview not found
                    }
                }

                // Track recent applications
                if (recentActivity.length < 10 && appliedDate > lastMonth) {
                    recentActivity.push({
                        type: 'new_application',
                        title: 'New Application',
                        description: `${applicant.userId?.profile?.name || 'Candidate'} applied for ${job.title}`,
                        timestamp: appliedDate
                    });
                }
            }

            // Track recent job postings
            if (recentActivity.length < 10 && new Date(job.createdAt) > lastMonth) {
                recentActivity.push({
                    type: 'job_posted',
                    title: 'Job Posted',
                    description: `${job.title} position created`,
                    timestamp: job.createdAt
                });
            }
        }

        // Calculate average scores
        const avgInterviewScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
        const lastMonthAvgScore = lastMonthScoreCount > 0 ? Math.round(lastMonthScore / lastMonthScoreCount) : 0;
        const scoreChange = avgInterviewScore - lastMonthAvgScore;

        // Get top skills sorted by count
        const topSkills = Object.entries(skillCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([skill, count]) => ({ skill, count }));

        // Sort recent activity by timestamp
        recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Convert applications by day to array for chart
        const applicationTrends = Object.entries(applicationsByDay).map(([date, count]) => ({
            date,
            count
        }));

        res.json({
            success: true,
            data: {
                overview: {
                    totalJobs,
                    activeJobs,
                    jobsThisMonth,
                    totalApplicants,
                    applicantsThisWeek,
                    interviewsCompleted,
                    avgInterviewScore,
                    scoreChange,
                    hired,
                    rejected,
                    pending,
                    conversionRate: totalApplicants > 0 ? Math.round((hired / totalApplicants) * 100) : 0
                },
                topSkills,
                applicationTrends,
                recentActivity: recentActivity.slice(0, 5),
                statusBreakdown: { hired, rejected, pending }
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get ALL applicants across all jobs for a recruiter
router.get('/recruiter/:recruiterId/all-applicants', async (req, res) => {
    try {
        const { recruiterId } = req.params;
        const { status, interviewCompleted, sortBy = 'date' } = req.query;

        // Get all jobs by this recruiter
        const jobs = await Job.find({ recruiterId })
            .populate({
                path: 'applicants.userId',
                select: 'profile.name profile.photo email jobSeekerProfile'
            });

        let allApplicants = [];

        for (const job of jobs) {
            for (const applicant of job.applicants) {
                if (!applicant.userId) continue;

                // Fetch interview data
                let interview = null;
                if (applicant.interviewId) {
                    interview = await Interview.findById(applicant.interviewId)
                        .select('status scoring matchScore passed completedAt duration');
                }

                allApplicants.push({
                    jobId: job._id,
                    jobTitle: job.title,
                    jobCompany: job.company?.name || 'Company',
                    applicant: {
                        userId: applicant.userId,
                        status: applicant.status,
                        appliedAt: applicant.appliedAt,
                        notes: applicant.recruiterNotes,
                        hiredAt: applicant.hiredAt,
                        rejectionReason: applicant.rejectionReason
                    },
                    interview: interview ? {
                        status: interview.status,
                        overallScore: interview.scoring?.overallScore || 0,
                        technicalScore: interview.scoring?.technicalAccuracy || 0,
                        communicationScore: interview.scoring?.communication || 0,
                        matchScore: interview.matchScore?.overall || 0,
                        passed: interview.passed,
                        completedAt: interview.completedAt,
                        strengths: interview.scoring?.strengths || []
                    } : null
                });
            }
        }

        // Apply filters
        if (status) {
            allApplicants = allApplicants.filter(a => a.applicant.status === status);
        }
        if (interviewCompleted === 'true') {
            allApplicants = allApplicants.filter(a => a.interview?.status === 'completed');
        } else if (interviewCompleted === 'false') {
            allApplicants = allApplicants.filter(a => !a.interview || a.interview.status !== 'completed');
        }

        // Sort
        if (sortBy === 'score') {
            allApplicants.sort((a, b) => (b.interview?.overallScore || 0) - (a.interview?.overallScore || 0));
        } else if (sortBy === 'name') {
            allApplicants.sort((a, b) =>
                (a.applicant.userId?.profile?.name || '').localeCompare(b.applicant.userId?.profile?.name || '')
            );
        } else {
            allApplicants.sort((a, b) => new Date(b.applicant.appliedAt) - new Date(a.applicant.appliedAt));
        }

        res.json({ success: true, data: allApplicants, count: allApplicants.length });
    } catch (error) {
        console.error('Error fetching all applicants:', error);
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
        // Safely destructure - may be undefined if no body sent
        const { status, notes } = req.body || {};

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

// HIRE a candidate
router.put('/:jobId/applicants/:userId/hire', async (req, res) => {
    try {
        const { jobId, userId } = req.params;
        // Safely destructure notes - may be undefined if no body sent
        const { notes } = req.body || {};

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        const applicant = job.applicants.find(a => a.userId.toString() === userId);
        if (!applicant) {
            return res.status(404).json({ success: false, error: 'Applicant not found' });
        }

        // Update applicant status
        applicant.status = 'hired';
        applicant.hiredAt = new Date();
        if (notes) applicant.notes = notes;

        await job.save();

        // Create notification for candidate
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                userId,
                type: 'hired',
                title: 'Congratulations! You\'ve Been Hired! 🎉',
                message: `Great news! You have been hired for the position of ${job.title}. The recruiter will contact you soon with next steps.`,
                link: `/jobseeker/jobs`,
                metadata: {
                    jobId: job._id,
                    jobTitle: job.title,
                    company: job.company?.name
                }
            });
        } catch (notifError) {
            console.error('Notification creation failed:', notifError);
        }

        res.json({
            success: true,
            message: 'Candidate hired successfully',
            data: { applicant, job }
        });
    } catch (error) {
        console.error('Hire error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// REJECT a candidate
router.put('/:jobId/applicants/:userId/reject', async (req, res) => {
    try {
        const { jobId, userId } = req.params;
        // Safely destructure - may be undefined if no body sent
        const { rejectionReason, notes } = req.body || {};

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        const applicant = job.applicants.find(a => a.userId.toString() === userId);
        if (!applicant) {
            return res.status(404).json({ success: false, error: 'Applicant not found' });
        }

        // Update applicant status
        applicant.status = 'rejected';
        applicant.rejectionReason = rejectionReason || 'Position filled';
        if (notes) applicant.notes = notes;

        await job.save();

        // Create notification for candidate
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                userId,
                type: 'rejected',
                title: 'Application Update',
                message: `Thank you for applying for ${job.title}. Unfortunately, we have decided to move forward with other candidates. We encourage you to apply for future opportunities.`,
                link: `/jobseeker/jobs`,
                metadata: {
                    jobId: job._id,
                    jobTitle: job.title,
                    company: job.company?.name,
                    reason: rejectionReason
                }
            });
        } catch (notifError) {
            console.error('Notification creation failed:', notifError);
        }

        res.json({
            success: true,
            message: 'Candidate rejected',
            data: { applicant, job }
        });
    } catch (error) {
        console.error('Reject error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// UNDO REJECT - Restore a rejected candidate
router.put('/:jobId/applicants/:userId/undo-reject', async (req, res) => {
    try {
        const { jobId, userId } = req.params;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        const applicant = job.applicants.find(a =>
            a.userId?.toString() === userId || a.userId?._id?.toString() === userId
        );
        if (!applicant) {
            return res.status(404).json({ success: false, error: 'Applicant not found' });
        }

        // Check if applicant is actually rejected
        if (applicant.status !== 'rejected') {
            return res.status(400).json({ success: false, error: 'Applicant is not in rejected status' });
        }

        // Restore to previous status (default to 'applied')
        applicant.status = applicant.interview?.status === 'completed' ? 'interviewed' : 'applied';
        applicant.rejectedAt = null;
        applicant.rejectionReason = null;
        applicant.restoredAt = new Date();

        await job.save();

        // Create notification for candidate
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                userId,
                type: 'application_restored',
                title: 'Good News! Your Application is Being Reconsidered 🎉',
                message: `Great news! Your application for ${job.title} is being reconsidered. The recruiter would like to take another look at your profile.`,
                link: `/jobseeker/jobs`,
                metadata: {
                    jobId: job._id,
                    jobTitle: job.title,
                    company: job.company?.name
                }
            });
        } catch (notifError) {
            console.error('Notification creation failed:', notifError);
        }

        res.json({
            success: true,
            message: 'Candidate rejection undone - application restored',
            data: { applicant, job }
        });
    } catch (error) {
        console.error('Undo reject error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add recruiter notes to applicant
router.post('/:jobId/applicants/:userId/notes', async (req, res) => {
    try {
        const { jobId, userId } = req.params;
        const { notes } = req.body;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        const applicant = job.applicants.find(a => a.userId.toString() === userId);
        if (!applicant) {
            return res.status(404).json({ success: false, error: 'Applicant not found' });
        }

        applicant.notes = notes;
        await job.save();

        res.json({
            success: true,
            message: 'Notes updated',
            data: { notes: applicant.notes }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all applicants across all jobs for a recruiter
router.get('/recruiter/:recruiterId/all-applicants', async (req, res) => {
    try {
        const { recruiterId } = req.params;
        const { status, interviewCompleted, sortBy } = req.query;

        // Get all jobs for this recruiter
        const jobs = await Job.find({ recruiterId })
            .populate({
                path: 'applicants.userId',
                select: 'profile.name profile.photo email jobSeekerProfile'
            })
            .sort({ createdAt: -1 });

        // Flatten all applicants with job context
        let allApplicants = [];

        for (const job of jobs) {
            for (const applicant of job.applicants) {
                // Fetch interview data
                const interview = await Interview.findById(applicant.interviewId)
                    .select('status scoring matchScore passed completedAt duration');

                allApplicants.push({
                    jobId: job._id,
                    jobTitle: job.title,
                    company: job.company?.name,
                    applicant: {
                        userId: applicant.userId?._id,
                        name: applicant.userId?.profile?.name,
                        photo: applicant.userId?.profile?.photo,
                        email: applicant.userId?.email,
                        profession: applicant.userId?.jobSeekerProfile?.profession,
                        experienceLevel: applicant.userId?.jobSeekerProfile?.experienceLevel,
                        appliedAt: applicant.appliedAt,
                        status: applicant.status,
                        notes: applicant.notes
                    },
                    interview: interview ? {
                        id: interview._id,
                        status: interview.status,
                        passed: interview.passed,
                        overallScore: interview.scoring?.overallScore || 0,
                        technicalScore: interview.scoring?.technicalAccuracy || 0,
                        hrScore: interview.scoring?.communication || 0,
                        strengths: interview.scoring?.strengths || [],
                        completedAt: interview.completedAt,
                        duration: interview.duration
                    } : null
                });
            }
        }

        // Apply filters
        if (status) {
            allApplicants = allApplicants.filter(a => a.applicant.status === status);
        }
        if (interviewCompleted === 'true') {
            allApplicants = allApplicants.filter(a => a.interview?.status === 'completed');
        } else if (interviewCompleted === 'false') {
            allApplicants = allApplicants.filter(a => !a.interview || a.interview.status !== 'completed');
        }

        // Sort
        if (sortBy === 'score') {
            allApplicants.sort((a, b) => (b.interview?.overallScore || 0) - (a.interview?.overallScore || 0));
        } else if (sortBy === 'date') {
            allApplicants.sort((a, b) => new Date(b.applicant.appliedAt) - new Date(a.applicant.appliedAt));
        } else if (sortBy === 'name') {
            allApplicants.sort((a, b) => (a.applicant.name || '').localeCompare(b.applicant.name || ''));
        }

        res.json({
            success: true,
            data: allApplicants,
            count: allApplicants.length
        });
    } catch (error) {
        console.error('Get all applicants error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Hire an applicant
router.put('/:jobId/applicants/:applicantId/hire', async (req, res) => {
    try {
        const { jobId, applicantId } = req.params;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // Find the applicant
        const applicant = job.applicants.find(a =>
            a.userId?.toString() === applicantId || a.userId?._id?.toString() === applicantId
        );

        if (!applicant) {
            return res.status(404).json({ success: false, error: 'Applicant not found' });
        }

        // Update applicant status
        applicant.status = 'hired';
        applicant.hiredAt = new Date();
        await job.save();

        // Get user details for email notification
        const user = await User.findById(applicantId);

        // Send email notification if nodemailer is available
        try {
            const nodemailer = require('nodemailer');
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS && user?.email) {
                const transporter = nodemailer.createTransport({
                    service: process.env.EMAIL_SERVICE || 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                await transporter.sendMail({
                    from: `"AI Hiring Platform" <${process.env.EMAIL_USER}>`,
                    to: user.email,
                    subject: `🎉 Congratulations! You've been hired for ${job.title}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 20px; border-radius: 10px 10px 0 0;">
                                <h1 style="color: white; margin: 0;">🎉 Congratulations!</h1>
                            </div>
                            <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
                                <p style="color: #334155; font-size: 16px;">Hi ${user.profile?.name || 'Candidate'},</p>
                                <p style="color: #334155; font-size: 16px;">Great news! You've been selected for the position of <strong>${job.title}</strong> at <strong>${job.company?.name || 'our company'}</strong>.</p>
                                <p style="color: #334155; font-size: 16px;">The recruiter will reach out to you shortly with next steps.</p>
                                <p style="color: #334155; font-size: 16px;">Congratulations on this achievement!</p>
                            </div>
                        </div>
                    `
                });
            }
        } catch (emailError) {
            console.error('Failed to send hire notification email:', emailError);
        }

        res.json({ success: true, message: 'Applicant hired successfully', data: applicant });
    } catch (error) {
        console.error('Hire applicant error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reject an applicant
router.put('/:jobId/applicants/:applicantId/reject', async (req, res) => {
    try {
        const { jobId, applicantId } = req.params;
        const { rejectionReason } = req.body || {};

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // Find the applicant
        const applicant = job.applicants.find(a =>
            a.userId?.toString() === applicantId || a.userId?._id?.toString() === applicantId
        );

        if (!applicant) {
            return res.status(404).json({ success: false, error: 'Applicant not found' });
        }

        // Update applicant status
        applicant.status = 'rejected';
        applicant.rejectedAt = new Date();
        applicant.rejectionReason = rejectionReason || '';
        await job.save();

        // Get user details for email notification
        const user = await User.findById(applicantId);

        // Send email notification if nodemailer is available
        try {
            const nodemailer = require('nodemailer');
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS && user?.email) {
                const transporter = nodemailer.createTransport({
                    service: process.env.EMAIL_SERVICE || 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                await transporter.sendMail({
                    from: `"AI Hiring Platform" <${process.env.EMAIL_USER}>`,
                    to: user.email,
                    subject: `Update on your application for ${job.title}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 20px; border-radius: 10px 10px 0 0;">
                                <h1 style="color: white; margin: 0;">Application Update</h1>
                            </div>
                            <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
                                <p style="color: #334155; font-size: 16px;">Hi ${user.profile?.name || 'Candidate'},</p>
                                <p style="color: #334155; font-size: 16px;">Thank you for your interest in the <strong>${job.title}</strong> position.</p>
                                <p style="color: #334155; font-size: 16px;">After careful review, we've decided to move forward with other candidates. We encourage you to apply for future opportunities that match your profile.</p>
                                ${rejectionReason ? `<p style="color: #64748b; font-size: 14px;"><em>Feedback: ${rejectionReason}</em></p>` : ''}
                                <p style="color: #334155; font-size: 16px;">Best of luck in your job search!</p>
                            </div>
                        </div>
                    `
                });
            }
        } catch (emailError) {
            console.error('Failed to send rejection notification email:', emailError);
        }

        res.json({ success: true, message: 'Applicant rejected', data: applicant });
    } catch (error) {
        console.error('Reject applicant error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// UPDATE a job
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove fields that shouldn't be updated
        delete updateData._id;
        delete updateData.createdAt;
        delete updateData.applicants; // Don't allow overwriting applicants

        const job = await Job.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        res.json({ success: true, message: 'Job updated successfully', data: job });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE a job
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const job = await Job.findById(id);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // Check if job has applicants - warn but still allow delete
        const applicantCount = job.applicants?.length || 0;

        await Job.findByIdAndDelete(id);

        res.json({
            success: true,
            message: `Job deleted successfully${applicantCount > 0 ? ` (had ${applicantCount} applicants)` : ''}`,
            deletedJob: {
                id: job._id,
                title: job.title,
                applicantCount
            }
        });
    } catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
