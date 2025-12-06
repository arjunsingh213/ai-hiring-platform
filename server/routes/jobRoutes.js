const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
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

// Apply to job
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
            return res.status(400).json({ success: false, error: 'Already applied to this job' });
        }

        job.applicants.push({
            userId,
            answers: answers || [],
            status: 'applied'
        });

        await job.save();

        res.json({ success: true, data: job, message: 'Application submitted successfully' });
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

module.exports = router;
