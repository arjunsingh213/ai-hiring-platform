const mongoose = require('mongoose');

const adminChallengeActionSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    challengeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Challenge'
    },
    attemptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChallengeAttempt'
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    action: {
        type: String,
        enum: [
            'edit_challenge', 'correct_domain', 'adjust_difficulty',
            'adjust_atp_weight', 'delete_challenge', 'suspend_challenge',
            'reactivate_challenge', 'mark_invalid',
            'review_attempt', 'approve_attempt', 'reject_attempt',
            'reset_atp', 'warn_user', 'ban_creator'
        ],
        required: true
    },

    previousValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed,
    reason: String,
    ip: String
}, {
    timestamps: true
});

adminChallengeActionSchema.index({ adminId: 1 });
adminChallengeActionSchema.index({ challengeId: 1 });
adminChallengeActionSchema.index({ action: 1 });
adminChallengeActionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminChallengeAction', adminChallengeActionSchema);
