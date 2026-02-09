const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    domain: {
        type: String,
        required: true,
        enum: ['Software Engineering', 'Marketing', 'Customer Support', 'Design', 'Product Management', 'Data Science', 'Sales', 'HR', 'Finance', 'Others']
    },
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    requirements: [String],
    rewardPoints: {
        type: Number,
        default: 100
    },
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    submissions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        content: String,
        submittedAt: {
            type: Date,
            default: Date.now
        },
        score: Number,
        feedback: String
    }],
    deadline: Date,
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    }
}, {
    timestamps: true
});

challengeSchema.index({ creatorId: 1 });
challengeSchema.index({ domain: 1 });
challengeSchema.index({ status: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);
