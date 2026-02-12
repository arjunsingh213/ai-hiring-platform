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
        required: true
        // enum restriction removed to allow dynamic skill domains
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
    },
    // New fields for AI Code Challenges
    challengeType: {
        type: String,
        enum: ['custom', 'domain'], // 'custom' = user created, 'domain' = AI/System generated
        default: 'custom'
    },
    questions: [{
        questionText: String,
        questionType: {
            type: String,
            enum: ['mcq', 'short-answer', 'code', 'essay', 'simulation']
        },
        options: [String],
        correctAnswer: String,
        maxScore: Number,
        codeLanguage: String,
        testCases: [{
            input: String,
            expectedOutput: String,
            hidden: Boolean
        }],
        rubricCriteria: [{
            criterion: String,
            maxPoints: Number,
            description: String
        }]
    }],
    timeLimit: Number, // in minutes
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // For domain challenges specific to a user
    },
    targetSkill: String,
    skillNodeLevel: Number, // 1-4
    passingScore: Number,
    maxScore: Number,
    aiGenerated: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

challengeSchema.index({ creatorId: 1 });
challengeSchema.index({ domain: 1 });
challengeSchema.index({ status: 1 });
challengeSchema.index({ challengeType: 1 });
challengeSchema.index({ assignedTo: 1 });
challengeSchema.index({ targetSkill: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);
