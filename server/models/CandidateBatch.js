const mongoose = require('mongoose');

const candidateBatchSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    candidateIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdByRecruiter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    stage: {
        type: String,
        default: 'shortlisted'
    },
    status: {
        type: String,
        enum: ['active', 'archived', 'completed'],
        default: 'active'
    },
    description: String,
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

candidateBatchSchema.index({ jobId: 1 });
candidateBatchSchema.index({ createdByRecruiter: 1 });

module.exports = mongoose.model('CandidateBatch', candidateBatchSchema);
