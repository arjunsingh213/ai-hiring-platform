const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Round = require('../models/Round');
const Job = require('../models/Job');
const { userAuth, requireRole } = require('../middleware/userAuth');

// Add a round to a job (at the end or specific position)
router.post('/job/:jobId', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { jobId } = req.params;
        const { type, subtype, title, description, configuration } = req.body;

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

        if (job.recruiterId.toString() !== req.userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // Determine order index (append to end)
        const lastRound = await Round.findOne({ jobId }).sort('-orderIndex');
        const orderIndex = lastRound ? lastRound.orderIndex + 1 : 1;

        const newRound = new Round({
            jobId,
            type,
            subtype,
            title,
            description,
            orderIndex,
            configuration
        });

        await newRound.save();

        // Add to job reference
        job.interviewPipeline.pipelineRounds.push(newRound._id);
        await job.save();

        res.status(201).json({ success: true, data: newRound });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reorder rounds
router.put('/reorder', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { jobId, roundIds } = req.body; // Array of round IDs in new order

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

        if (job.recruiterId.toString() !== req.userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // Bulk write for efficiency
        const operations = roundIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: { orderIndex: index + 1 }
            }
        }));

        await Round.bulkWrite(operations);

        res.json({ success: true, message: 'Rounds reordered successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update a round
router.put('/:id', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const round = await Round.findById(id);
        if (!round) return res.status(404).json({ success: false, error: 'Round not found' });

        // verify ownership via job
        const job = await Job.findById(round.jobId);
        if (job.recruiterId.toString() !== req.userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        Object.assign(round, updates);
        round.version += 1;
        await round.save();

        res.json({ success: true, data: round });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a round
router.delete('/:id', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { id } = req.params;

        const round = await Round.findById(id);
        if (!round) return res.status(404).json({ success: false, error: 'Round not found' });

        const job = await Job.findById(round.jobId);
        if (job.recruiterId.toString() !== req.userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // Soft delete or hard delete? Let's soft delete for now as per schema
        round.isDeleted = true;
        await round.save();

        // Perform re-indexing of remaining rounds? 
        // Ideally yes, but for simplicity let's leave gaps or handle on frontend/fetch
        // For strict ordering, we should rebalance indices.

        res.json({ success: true, message: 'Round deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all rounds for a job
router.get('/job/:jobId', userAuth, async (req, res) => {
    try {
        const { jobId } = req.params;

        // Security check not strictly needed for reading if public job, 
        // but for editing UI lets ensure recruiter. 
        // For candidates, we might need a separate public endpoint or flexible middleware.
        // Assuming this is for Recruiter Dashboard.

        const job = await Job.findById(jobId);
        if (job.recruiterId.toString() !== req.userId && req.user.role !== 'admin') {
            // allow if it's the recruiter.
            // What if it's a candidate? Use a different endpoint or check 'applicants' list?
            // For now, restricting to recruiter owner.
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        const rounds = await Round.find({ jobId, isDeleted: false }).sort('orderIndex');
        res.json({ success: true, data: rounds });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
