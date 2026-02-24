const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'PAGE_VIEW',
            'START_INTERVIEW',
            'SUBMIT_ANSWER',
            'COMPLETE_INTERVIEW',
            'UPLOAD_RESUME',
            'UPDATE_PROFILE',
            'LOGIN',
            'LOGOUT',
            'HEARTBEAT' // For time tracking
        ]
    },
    feature: {
        type: String,
        required: true
    },
    page: String,
    duration: {
        type: Number,
        default: 0 // Duration in seconds
    },
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

userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ action: 1 });
userActivitySchema.index({ feature: 1 });

module.exports = mongoose.model('UserActivity', userActivitySchema);
