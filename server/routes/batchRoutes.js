const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CandidateBatch = require('../models/CandidateBatch');
const Round = require('../models/Round');
const Job = require('../models/Job');
const { userAuth, requireRole } = require('../middleware/userAuth');

// Create a new batch
router.post('/', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { jobId, name, candidateIds, description } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

        if (job.recruiterId.toString() !== req.userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        const batch = new CandidateBatch({
            jobId,
            name,
            candidateIds,
            createdByRecruiter: req.userId,
            description
        });

        await batch.save();
        res.status(201).json({ success: true, data: batch });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get batches for a job
router.get('/job/:jobId', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { jobId } = req.params;
        // Verify ownership
        const job = await Job.findById(jobId);
        if (job.recruiterId.toString() !== req.userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        const batches = await CandidateBatch.find({ jobId }).sort('-createdAt');
        res.json({ success: true, data: batches });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Assign a round to a batch (and thus all candidates in it)
router.post('/:batchId/assign-round', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { batchId } = req.params;
        const { type, subtype, title, description, configuration } = req.body;

        const batch = await CandidateBatch.findById(batchId);
        if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });

        if (batch.createdByRecruiter.toString() !== req.userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // create round linked to this batch
        const newRound = new Round({
            jobId: batch.jobId,
            type, // AI or HUMAN
            subtype,
            title,
            description,
            orderIndex: 999, // Batch rounds might not following standard linear order, or appended to end
            batchId: batch._id,
            configuration
        });

        await newRound.save();

        res.status(201).json({ success: true, data: newRound, message: 'Round assigned to batch successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
