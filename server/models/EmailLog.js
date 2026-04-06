const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    emailType: {
        type: String,
        enum: [
            'welcome',
            'incomplete_profile',
            'half_baked_interview',
            'inactive_user',
            'job_recommendation',
            'interview_reminder', // existing
            'retry_reminder'      // existing
        ],
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    sentAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Index for getting recent emails rapidly for cooldown checking
emailLogSchema.index({ userId: 1, sentAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
