const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');
const Resume = require('../models/Resume');
const Interview = require('../models/Interview');
const aiService = require('../services/ai/aiService');
const { requirePlatformInterview } = require('../middleware/platformInterviewGuard');
const { userAuth, requireRole } = require('../middleware/userAuth');

// Create job posting - PROTECTED: Recruiter only
router.post('/', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const job = new Job({
            ...req.body,
            recruiterId: req.userId // Securely set recruiter ID from token
        });

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
        const { skills, type, location, experienceLevel, status, domain } = req.query;
        const query = {};

        if (skills) query['requirements.skills'] = { $in: skills.split(',') };
        if (type) query['jobDetails.type'] = type;
        if (location) query['jobDetails.location'] = new RegExp(location, 'i');
        if (experienceLevel) query['requirements.experienceLevel'] = experienceLevel;
        if (domain) query.domain = domain;
        if (status) query.status = status;
        else query.status = 'active'; // Default to active jobs

        const jobs = await Job.find(query)
            .populate('recruiterId', 'profile.name profile.company profile.photo')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: jobs, count: jobs.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get jobs by recruiter ID - PROTECTED: Recruiter can only see their own jobs
router.get('/recruiter/:recruiterId', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { recruiterId } = req.params;
        const mongoose = require('mongoose');

        // SECURITY: Check if recruiter is requesting their own jobs
        const currentUserId = String(req.userId).trim();
        let targetRecruiterId = String(recruiterId).trim();

        // If IDs don't match, check if current user is actually a recruiter and use their ID as fallback
        if (targetRecruiterId !== currentUserId) {
            console.log(`[SECURITY] ID Mismatch in GET /recruiter/:recruiterId. Params: ${targetRecruiterId}, Token: ${currentUserId}`);
            if (req.user && req.user.role === 'recruiter') {
                console.log(`[SECURITY] Falling back to token userId ${currentUserId} for recruiter`);
                targetRecruiterId = currentUserId;
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied. You can only view your own jobs.',
                    code: 'FORBIDDEN'
                });
            }
        }

        const queryId = new mongoose.Types.ObjectId(targetRecruiterId);
        const jobs = await Job.find({ recruiterId: queryId })
            .populate('recruiterId', 'profile.name profile.company email')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: jobs, count: jobs.length });
    } catch (error) {
        console.error('Error fetching recruiter jobs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get comprehensive analytics for recruiter dashboard - PROTECTED
router.get('/recruiter/:recruiterId/analytics', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { recruiterId } = req.params;

        // SECURITY: Check if recruiter is requesting their own analytics
        const currentUserId = String(req.userId).trim();
        let targetRecruiterId = String(recruiterId).trim();

        if (targetRecruiterId !== currentUserId) {
            console.log(`[SECURITY] ID Mismatch in GET /analytics. Params: ${targetRecruiterId}, Token: ${currentUserId}`);
            if (req.user && req.user.role === 'recruiter') {
                console.log(`[SECURITY] Falling back to token userId ${currentUserId} for recruiter analytics`);
                targetRecruiterId = currentUserId;
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied. You can only view your own analytics.',
                    code: 'FORBIDDEN'
                });
            }
        }

        const queryId = new mongoose.Types.ObjectId(targetRecruiterId);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - now.getDay());
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        // Get all jobs by this recruiter with populated applicants
        const jobs = await Job.find({ recruiterId: queryId })
            .populate({
                path: 'applicants.userId',
                select: 'profile.name profile.photo email'
            });

        console.log(`[ANALYTICS] Processed ${jobs.length} jobs for recruiter ${targetRecruiterId}`);

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
                                    score: interview.scoring?.overallScore
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

// Get ALL applicants across all jobs for a recruiter - PROTECTED
router.get('/recruiter/:recruiterId/all-applicants', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { recruiterId } = req.params;

        // SECURITY: Check if recruiter is requesting their own applicants
        const currentUserId = String(req.userId).trim();
        let targetRecruiterId = String(recruiterId).trim();

        if (targetRecruiterId !== currentUserId) {
            console.log(`[SECURITY] ID Mismatch in /all-applicants. Params: ${targetRecruiterId}, Token: ${currentUserId}`);
            if (req.user && req.user.role === 'recruiter') {
                console.log(`[SECURITY] Falling back to token userId ${currentUserId} for all-applicants`);
                targetRecruiterId = currentUserId;
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied. You can only view your own applicants.',
                    code: 'FORBIDDEN'
                });
            }
        }

        const { status, interviewCompleted, sortBy = 'date' } = req.query;
        const queryId = new mongoose.Types.ObjectId(targetRecruiterId);

        // Get all jobs by this recruiter
        const jobs = await Job.find({ recruiterId: queryId })
            .populate({
                path: 'applicants.userId',
                select: 'profile.name profile.photo email jobSeekerProfile'
            });

        let allApplicants = [];
        console.log(`[PIPELINE] Found ${jobs.length} jobs for recruiter ${targetRecruiterId}`);

        for (const job of jobs) {
            for (const applicant of job.applicants) {
                // Determine if user exists or was deleted
                const userExists = !!applicant.userId;

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
                        userId: applicant.userId || { _id: null, profile: { name: 'Deleted User' }, email: 'N/A' },
                        status: applicant.status,
                        appliedAt: applicant.appliedAt,
                        notes: applicant.recruiterNotes,
                        hiredAt: applicant.hiredAt,
                        rejectionReason: applicant.rejectionReason
                    },
                    interview: interview ? {
                        _id: interview._id,
                        status: interview.status,
                        overallScore: interview.scoring?.overallScore || 0,
                        technicalScore: interview.scoring?.technicalScore || 0,
                        communicationScore: interview.scoring?.communicationScore || 0,
                        matchScore: interview.matchScore?.overall || 0,
                        passed: interview.passed,
                        completedAt: interview.completedAt,
                        strengths: interview.scoring?.strengths || [],
                        weaknesses: interview.scoring?.weaknesses || [],
                        feedback: interview.scoring?.detailedFeedback
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

// Apply to job - ENHANCED with AI Interview integration - PROTECTED
// REQUIRES: Platform interview must be passed before applying
router.post('/:id/apply', userAuth, requireRole('jobseeker'), requirePlatformInterview, async (req, res) => {
    try {
        const userId = req.userId; // Securely get user ID from token
        const { answers } = req.body;

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

        // Add to job applicants WITHOUT creating interview yet
        job.applicants.push({
            userId,
            answers: answers || [],
            status: 'applied',
            appliedAt: new Date(),
            interviewId: null
        });

        await job.save();

        res.json({
            success: true,
            message: 'Application submitted! You will need to complete an AI interview.',
            interviewRequired: true,
            jobId: job._id
        });
    } catch (error) {
        console.error('Job application error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Withdraw application from a job - PROTECTED
router.delete('/:id/withdraw', userAuth, requireRole('jobseeker'), async (req, res) => {
    try {
        const userId = req.userId.toString(); // Secure user ID from token
        const jobId = req.params.id;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // Find the applicant
        const applicantIndex = job.applicants.findIndex(
            app => app.userId.toString() === userId || app.userId?._id?.toString() === userId
        );

        if (applicantIndex === -1) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const applicant = job.applicants[applicantIndex];

        // Check if interview was already completed - don't allow withdrawal after completion
        if (applicant.interviewId) {
            const interview = await Interview.findById(applicant.interviewId);
            if (interview && interview.status === 'completed') {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot withdraw after completing the interview'
                });
            }
            // Delete the pending interview
            if (interview) {
                await Interview.findByIdAndDelete(applicant.interviewId);
            }
        }

        // Remove the applicant from the job
        job.applicants.splice(applicantIndex, 1);
        await job.save();

        console.log(`[JOB WITHDRAW] User ${userId} withdrew from job ${jobId} (${job.title})`);

        res.json({
            success: true,
            message: 'Application withdrawn successfully'
        });
    } catch (error) {
        console.error('Withdraw application error:', error);
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
// Update applicant status - PROTECTED: Recruiter only
router.put('/:jobId/applicants/:applicantId', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { jobId, applicantId } = req.params;
        const { status, notes } = req.body || {};

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // SECURITY: Verify recruiter owns this job
        if (!job.recruiterId.equals(req.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only update applicants for your own jobs.',
                code: 'FORBIDDEN'
            });
        }

        const applicant = job.applicants.id(applicantId);
        if (!applicant) {
            return res.status(404).json({ success: false, error: 'Applicant not found' });
        }

        if (status) applicant.status = status;
        if (status === 'hired') applicant.hiredAt = new Date();
        if (notes) applicant.notes = notes;

        await job.save();

        res.json({ success: true, data: job });
    } catch (error) {
        console.error('Update applicant status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Get applicants for a job with interview data - PROTECTED: Recruiter only
router.get('/:id/applicants', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate({
                path: 'applicants.userId',
                select: 'profile.name profile.photo email role'
            });

        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // SECURITY: Verify recruiter owns this job
        if (!job.recruiterId.equals(req.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only view applicants for your own jobs.',
                code: 'FORBIDDEN'
            });
        }

        // Fetch interview data for each applicant
        const applicantsWithInterviews = await Promise.all(
            job.applicants.map(async (applicant) => {
                if (!applicant.userId) return { ...applicant.toObject(), interview: null };

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

// HIRE a candidate - PROTECTED: Recruiter only
router.put('/:jobId/applicants/:userId/hire', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { jobId, userId } = req.params;
        const { notes } = req.body || {};

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // SECURITY: Verify recruiter owns this job
        if (!job.recruiterId.equals(req.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only hire for your own jobs.',
                code: 'FORBIDDEN'
            });
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

// REJECT a candidate - PROTECTED: Recruiter only
router.put('/:jobId/applicants/:userId/reject', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { jobId, userId } = req.params;
        const { rejectionReason, notes } = req.body || {};

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // SECURITY: Verify recruiter owns this job
        if (!job.recruiterId.equals(req.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only reject for your own jobs.',
                code: 'FORBIDDEN'
            });
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

// UNDO REJECT - Restore a rejected candidate - PROTECTED
router.put('/:jobId/applicants/:userId/undo-reject', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { jobId, userId } = req.params;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // SECURITY: Verify recruiter owns this job
        if (!job.recruiterId.equals(req.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only manage your own jobs.',
                code: 'FORBIDDEN'
            });
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

// Add recruiter notes to applicant - PROTECTED
router.post('/:jobId/applicants/:userId/notes', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { jobId, userId } = req.params;
        const { notes } = req.body;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // SECURITY: Verify recruiter owns this job
        if (!job.recruiterId.equals(req.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only add notes to applicants of your own jobs.',
                code: 'FORBIDDEN'
            });
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




// UPDATE a job - PROTECTED
router.put('/:id', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const job = await Job.findById(id);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // SECURITY: Verify recruiter owns this job
        if (!job.recruiterId.equals(req.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only update your own jobs.',
                code: 'FORBIDDEN'
            });
        }

        // Remove fields that shouldn't be updated
        delete updateData._id;
        delete updateData.createdAt;
        delete updateData.recruiterId; // VERY IMPORTANT: Prevent job "vanishing" by overwriting ID
        delete updateData.applicants; // Don't allow overwriting applicants via this route

        const updatedJob = await Job.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!updatedJob) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        res.json({ success: true, message: 'Job updated successfully', data: updatedJob });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE a job - PROTECTED: Recruiter only
router.delete('/:id', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { id } = req.params;

        const job = await Job.findById(id);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // SECURITY: Verify recruiter owns this job
        if (!job.recruiterId.equals(req.userId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You can only perform this action on your own jobs.',
                code: 'FORBIDDEN'
            });
        }

        // Check if job has applicants - warn but still allow delete
        const applicantCount = job.applicants?.length || 0;

        await Job.findByIdAndDelete(id);

        res.json({
            success: true,
            message: `Job deleted successfully${applicantCount > 0 ? ` (had ${applicantCount} applicants)` : ''}`,
            data: { id: job._id, title: job.title }
        });
    } catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
