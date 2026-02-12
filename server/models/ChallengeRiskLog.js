const mongoose = require('mongoose');

const challengeRiskLogSchema = new mongoose.Schema({
    attemptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChallengeAttempt',
        required: true
    },
    challengeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Challenge',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true
    },

    flags: [{
        type: {
            type: String,
            enum: ['tab_switch', 'focus_loss', 'paste_detected', 'rapid_injection',
                'keyboard_anomaly', 'llm_pattern', 'token_burst', 'similarity_match',
                'time_anomaly', 'consistency_fail']
        },
        severity: { type: String, enum: ['low', 'medium', 'high'] },
        details: String,
        timestamp: { type: Date, default: Date.now }
    }],

    // Admin review
    adminReviewed: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt: Date,
    adminAction: {
        type: String,
        enum: ['approved', 'rejected', 'atp_reset', 'user_warned', 'user_banned', 'dismissed'],
        default: null
    },
    adminNotes: String,
    resolvedAt: Date
}, {
    timestamps: true
});

challengeRiskLogSchema.index({ riskLevel: 1, adminReviewed: 1 });
challengeRiskLogSchema.index({ userId: 1 });
challengeRiskLogSchema.index({ challengeId: 1 });

module.exports = mongoose.model('ChallengeRiskLog', challengeRiskLogSchema);
