const mongoose = require('mongoose');

const aiUsageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    model: {
        type: String,
        required: true
    },
    purpose: {
        type: String, // e.g., 'resume_parsing', 'question_generation', etc.
        required: true
    },
    inputTokens: {
        type: Number,
        default: 0
    },
    outputTokens: {
        type: Number,
        default: 0
    },
    totalTokens: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    },
    errorMessage: String,
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

aiUsageSchema.index({ userId: 1 });
aiUsageSchema.index({ model: 1 });
aiUsageSchema.index({ purpose: 1 });
aiUsageSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AIUsage', aiUsageSchema);
