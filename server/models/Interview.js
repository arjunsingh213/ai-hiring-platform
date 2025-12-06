const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume'
    },

    // Interview type
    interviewType: {
        type: String,
        enum: ['technical', 'hr'],
        required: true
    },

    // Questions and answers
    questions: [{
        question: String,
        generatedBy: {
            type: String,
            enum: ['ai', 'manual'],
            default: 'ai'
        },
        category: String, // e.g., 'technical_skill', 'behavioral', 'communication'
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard']
        }
    }],

    responses: [{
        questionIndex: Number,
        answer: String, // Transcribed text
        audioRecording: String, // GridFS file ID
        videoRecording: String, // GridFS file ID
        timeSpent: Number, // seconds
        confidence: Number // 0-100
    }],

    // Scoring
    scoring: {
        technicalAccuracy: Number, // 0-100
        communication: Number, // 0-100
        confidence: Number, // 0-100
        relevance: Number, // 0-100
        overallScore: Number, // 0-100
        strengths: [String],
        weaknesses: [String],
        detailedFeedback: String
    },

    // Proctoring data
    proctoring: {
        flags: [{
            type: {
                type: String,
                enum: [
                    'multiple_voices',
                    'eye_movement',
                    'phone_detected',
                    'multiple_faces',
                    'tab_switch',
                    'window_focus_loss',
                    'suspicious_background'
                ]
            },
            timestamp: Date,
            severity: {
                type: String,
                enum: ['low', 'medium', 'high']
            },
            description: String
        }],
        totalFlags: {
            type: Number,
            default: 0
        },
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'low'
        }
    },

    // Status
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'abandoned'],
        default: 'scheduled'
    },

    startedAt: Date,
    completedAt: Date,
    duration: Number, // seconds

    // Final result
    passed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

interviewSchema.index({ userId: 1, interviewType: 1 });
interviewSchema.index({ status: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
