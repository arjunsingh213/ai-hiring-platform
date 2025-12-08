const express = require('express');
const router = express.Router();
const HiringProcess = require('../models/HiringProcess');
const OnboardingDocument = require('../models/OnboardingDocument');
const User = require('../models/User');
const Job = require('../models/Job');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// @route   POST /api/hiring/create
// @desc    Create a new hiring process (when recruiter clicks "Hire")
// @access  Private (Recruiter only)
router.post('/create', async (req, res) => {
    try {
        const {
            jobId,
            applicantId,
            position,
            salary,
            startDate,
            location,
            employmentType,
            department,
            reportingManager,
            benefits,
            customTerms,
            offerExpiryDays = 7
        } = req.body;

        const recruiterId = req.body.recruiterId || req.user?.id;

        // Validate required fields
        if (!jobId || !applicantId || !position || !salary || !startDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if hiring process already exists for this applicant and job
        const existing = await HiringProcess.findOne({
            jobId,
            applicantId,
            status: 'active'
        });

        if (existing) {
            return res.status(400).json({ error: 'Hiring process already exists for this applicant' });
        }

        // Calculate offer expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + offerExpiryDays);

        // Calculate documents deadline (7 days before start date)
        const documentsDeadline = new Date(startDate);
        documentsDeadline.setDate(documentsDeadline.getDate() - 7);

        // Create hiring process
        const hiringProcess = new HiringProcess({
            jobId,
            applicantId,
            recruiterId,
            currentStage: 'offer_extended',
            status: 'active',
            offer: {
                position,
                salary: {
                    amount: salary.amount,
                    currency: salary.currency || 'USD',
                    period: salary.period || 'annual'
                },
                startDate,
                location,
                employmentType: employmentType || 'full-time',
                department,
                reportingManager,
                benefits: benefits || [],
                customTerms,
                expiryDate
            },
            timeline: {
                offerSentAt: new Date(),
                documentsDeadline,
                startDate
            }
        });

        await hiringProcess.save();

        // Create default onboarding documents
        await OnboardingDocument.createDefaultDocuments(hiringProcess._id);

        // Update applicant status in job
        await Job.findByIdAndUpdate(jobId, {
            $set: {
                'applicants.$[elem].status': 'offer_extended'
            }
        }, {
            arrayFilters: [{ 'elem.userId': applicantId }]
        });

        // Populate references
        await hiringProcess.populate('applicantId', 'profile.name profile.email profile.photo');
        await hiringProcess.populate('jobId', 'title company');

        res.status(201).json({
            success: true,
            data: hiringProcess
        });
    } catch (error) {
        console.error('Error creating hiring process:', error);
        res.status(500).json({ error: 'Failed to create hiring process' });
    }
});

// @route   GET /api/hiring/recruiter/:recruiterId
// @desc    Get all hiring processes for a recruiter
// @access  Private (Recruiter only)
router.get('/recruiter/:recruiterId', async (req, res) => {
    try {
        const { recruiterId } = req.params;
        const { status, stage } = req.query;

        const query = { recruiterId };
        if (status) query.status = status;
        if (stage) query.currentStage = stage;

        const hiringProcesses = await HiringProcess.find(query)
            .populate('applicantId', 'profile.name profile.email profile.photo')
            .populate('jobId', 'title company')
            .sort({ createdAt: -1 });

        // Calculate progress for each
        hiringProcesses.forEach(hp => hp.calculateProgress());

        res.json({
            success: true,
            data: hiringProcesses
        });
    } catch (error) {
        console.error('Error fetching hiring processes:', error);
        res.status(500).json({ error: 'Failed to fetch hiring processes' });
    }
});

// @route   GET /api/hiring/jobseeker/:jobSeekerId
// @desc    Get hiring process for a job seeker
// @access  Private (Job Seeker only)
router.get('/jobseeker/:jobSeekerId', async (req, res) => {
    try {
        const { jobSeekerId } = req.params;

        const hiringProcess = await HiringProcess.findOne({
            applicantId: jobSeekerId,
            status: 'active'
        })
            .populate('recruiterId', 'profile.name profile.email recruiterProfile.companyName')
            .populate('jobId', 'title company');

        if (!hiringProcess) {
            return res.status(404).json({ error: 'No active hiring process found' });
        }

        hiringProcess.calculateProgress();

        res.json({
            success: true,
            data: hiringProcess
        });
    } catch (error) {
        console.error('Error fetching hiring process:', error);
        res.status(500).json({ error: 'Failed to fetch hiring process' });
    }
});

// @route   GET /api/hiring/:id
// @desc    Get hiring process by ID
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const hiringProcess = await HiringProcess.findById(req.params.id)
            .populate('applicantId', 'profile.name profile.email profile.photo')
            .populate('recruiterId', 'profile.name profile.email recruiterProfile.companyName')
            .populate('jobId', 'title company');

        if (!hiringProcess) {
            return res.status(404).json({ error: 'Hiring process not found' });
        }

        hiringProcess.calculateProgress();

        res.json({
            success: true,
            data: hiringProcess
        });
    } catch (error) {
        console.error('Error fetching hiring process:', error);
        res.status(500).json({ error: 'Failed to fetch hiring process' });
    }
});

// @route   POST /api/hiring/:id/offer/accept
// @desc    Accept job offer
// @access  Private (Job Seeker only)
router.post('/:id/offer/accept', async (req, res) => {
    try {
        const { signature } = req.body;

        const hiringProcess = await HiringProcess.findById(req.params.id);

        if (!hiringProcess) {
            return res.status(404).json({ error: 'Hiring process not found' });
        }

        if (hiringProcess.currentStage !== 'offer_extended') {
            return res.status(400).json({ error: 'Offer has already been responded to' });
        }

        if (hiringProcess.isOfferExpired()) {
            return res.status(400).json({ error: 'Offer has expired' });
        }

        // Update hiring process
        hiringProcess.currentStage = 'offer_accepted';
        hiringProcess.offer.acceptedAt = new Date();
        hiringProcess.offer.signature = signature;
        hiringProcess.timeline.offerAcceptedAt = new Date();

        // Move to documents stage
        hiringProcess.currentStage = 'documents_pending';

        await hiringProcess.save();

        // Update applicant status in job
        await Job.findByIdAndUpdate(hiringProcess.jobId, {
            $set: {
                'applicants.$[elem].status': 'offer_accepted'
            }
        }, {
            arrayFilters: [{ 'elem.userId': hiringProcess.applicantId }]
        });

        hiringProcess.calculateProgress();

        res.json({
            success: true,
            message: 'Offer accepted successfully',
            data: hiringProcess
        });
    } catch (error) {
        console.error('Error accepting offer:', error);
        res.status(500).json({ error: 'Failed to accept offer' });
    }
});

// @route   POST /api/hiring/:id/offer/decline
// @desc    Decline job offer
// @access  Private (Job Seeker only)
router.post('/:id/offer/decline', async (req, res) => {
    try {
        const { reason } = req.body;

        const hiringProcess = await HiringProcess.findById(req.params.id);

        if (!hiringProcess) {
            return res.status(404).json({ error: 'Hiring process not found' });
        }

        if (hiringProcess.currentStage !== 'offer_extended') {
            return res.status(400).json({ error: 'Offer has already been responded to' });
        }

        // Update hiring process
        hiringProcess.currentStage = 'offer_declined';
        hiringProcess.status = 'cancelled';
        hiringProcess.offer.declinedAt = new Date();
        hiringProcess.offer.declineReason = reason;

        await hiringProcess.save();

        // Update applicant status in job
        await Job.findByIdAndUpdate(hiringProcess.jobId, {
            $set: {
                'applicants.$[elem].status': 'offer_declined'
            }
        }, {
            arrayFilters: [{ 'elem.userId': hiringProcess.applicantId }]
        });

        res.json({
            success: true,
            message: 'Offer declined',
            data: hiringProcess
        });
    } catch (error) {
        console.error('Error declining offer:', error);
        res.status(500).json({ error: 'Failed to decline offer' });
    }
});

// @route   PUT /api/hiring/:id/stage
// @desc    Update hiring process stage
// @access  Private (Recruiter only)
router.put('/:id/stage', async (req, res) => {
    try {
        const { stage } = req.body;

        const hiringProcess = await HiringProcess.findById(req.params.id);

        if (!hiringProcess) {
            return res.status(404).json({ error: 'Hiring process not found' });
        }

        hiringProcess.currentStage = stage;

        if (stage === 'onboarding_complete') {
            hiringProcess.status = 'completed';
        }

        await hiringProcess.save();
        hiringProcess.calculateProgress();

        res.json({
            success: true,
            data: hiringProcess
        });
    } catch (error) {
        console.error('Error updating stage:', error);
        res.status(500).json({ error: 'Failed to update stage' });
    }
});

module.exports = router;
