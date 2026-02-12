const mongoose = require('mongoose');

const challengeAttemptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    challengeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Challenge',
        required: true
    },

    // Timing
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    timeSpent: Number,  // seconds

    // Answers
    answers: [{
        questionIndex: Number,
        answer: String,
        codeSubmission: String,
        score: { type: Number, default: 0 },
        maxScore: Number,
        feedback: String,
        isCorrect: Boolean
    }],

    // Scores
    finalScore: { type: Number, default: 0 },
    rawScore: { type: Number, default: 0 },
    tabSwitchPenalty: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0, min: 0, max: 100 },
    consistency: { type: Number, default: 100, min: 0, max: 100 },
    maxPossibleScore: { type: Number, default: 100 },

    // Anti-cheat behavioral log
    antiCheatLog: {
        tabSwitches: { type: Number, default: 0 },
        focusLosses: { type: Number, default: 0 },
        pasteAttempts: { type: Number, default: 0 },
        rapidInjections: { type: Number, default: 0 },
        keyboardRhythm: {
            avgKeystrokeInterval: Number,
            stdDeviation: Number,
            suspiciousPatterns: { type: Number, default: 0 }
        },
        timestamps: [{
            event: String,
            time: Date
        }],
        perQuestionTiming: [{
            startedAt: Date,
            firstKeystroke: Date,
            submittedAt: Date,
            tabSwitchesDuring: { type: Number, default: 0 },
            idleGaps: [Number]
        }]
    },

    // AI detection results
    aiDetection: {
        structuredPatternScore: { type: Number, default: 0, min: 0, max: 100 },
        tokenBurstDetected: { type: Boolean, default: false },
        similarityScore: { type: Number, default: 0, min: 0, max: 100 },
        llmConfidenceScore: { type: Number, default: 0, min: 0, max: 100 }
    },

    // Risk assessment
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },

    // ATP impact
    atpApplied: { type: Boolean, default: false },
    atpImpactScore: { type: Number, default: 0 },
    atpHeldForReview: { type: Boolean, default: false },

    // Metadata
    ip: String,
    userAgent: String,
    status: {
        type: String,
        enum: ['in-progress', 'completed', 'abandoned', 'flagged', 'reviewed'],
        default: 'in-progress'
    }
}, {
    timestamps: true
});

challengeAttemptSchema.index({ userId: 1 });
challengeAttemptSchema.index({ challengeId: 1 });
challengeAttemptSchema.index({ riskLevel: 1 });
challengeAttemptSchema.index({ status: 1 });
challengeAttemptSchema.index({ userId: 1, challengeId: 1 });

module.exports = mongoose.model('ChallengeAttempt', challengeAttemptSchema);
