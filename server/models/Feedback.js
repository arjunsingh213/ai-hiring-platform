const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    featureId: {
        type: String,
        required: true,
        enum: [
            'onboarding',
            'domain-interview',
            'interview-page',
            'atp',
            'jobs-listing',
            'job-post',
            'recruiter-dashboard',
            'interview-pipeline',
            'home-feed',
            'talent-pipeline'
        ]
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    insights: [{
        type: String
    }],
    comment: {
        type: String,
        trim: true
    },
    userRole: {
        type: String,
        enum: ['jobseeker', 'recruiter', 'admin'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries in admin dashboard
feedbackSchema.index({ featureId: 1, createdAt: -1 });
feedbackSchema.index({ userId: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
