const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    type: {
        type: String,
        enum: [
            'job_alert',
            'interview_reminder',
            'profile_completion',
            'message_received',
            'application_status',
            'job_recommendation',
            'post_engagement',
            'motivational',
            'system'
        ],
        required: true
    },

    title: {
        type: String,
        required: true
    },

    message: {
        type: String,
        required: true
    },

    // Related entities
    relatedEntity: {
        entityType: {
            type: String,
            enum: ['job', 'interview', 'message', 'post', 'user']
        },
        entityId: mongoose.Schema.Types.ObjectId
    },

    // Action link
    actionUrl: String,
    actionText: String,

    // Status
    read: {
        type: Boolean,
        default: false
    },

    readAt: Date,

    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },

    // For motivational popups
    isPopup: {
        type: Boolean,
        default: false
    },

    popupShown: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
