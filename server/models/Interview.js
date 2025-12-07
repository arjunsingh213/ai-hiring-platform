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

    // NEW: Link to job application
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
    },

    // Interview type
    interviewType: {
        type: String,
        enum: ['technical', 'hr', 'combined'],
        required: true
    },

    // NEW: Match score from JD-resume matching (Gemma 2 9B)
    matchScore: {
        overall: Number,
        skills: Number,
        experience: Number,
        education: Number,
        matchedSkills: [String],
        missingSkills: [String],
        interviewFocus: [String]
    },

    // Questions and answers
    questions: [{
        question: String,
        generatedBy: {
            type: String,
            enum: ['ai', 'manual', 'adaptive'],
            default: 'ai'
        },
        category: String, // e.g., 'technical', 'behavioral', 'situational', 'competency'
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard']
        },
        expectedTopics: [String],
        timeLimit: {
            type: Number,
            default: 120 // seconds
        }
    }],

    responses: [{
        questionIndex: Number,
        answer: String, // Text answer
        audioRecording: String, // GridFS file ID
        videoRecording: String, // GridFS file ID
        timeSpent: Number, // seconds

        // AI Evaluation (Qwen3 235B)
        evaluation: {
            score: Number, // 0-100
            technicalAccuracy: Number,
            communication: Number,
            confidence: Number,
            relevance: Number,
            completeness: Number,
            feedback: String,
            topicsAddressed: [String],
            topicsMissed: [String],
            strengthsShown: [String],
            improvementAreas: [String]
        },

        // Quick Score (Mistral 7B)
        quickScore: {
            score: Number,
            brief: String
        },

        // Legacy field for backward compatibility
        confidence: Number
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

    // NEW: Recruiter Report (Gemma 2 9B)
    recruiterReport: {
        summary: String,
        recommendation: {
            type: String,
            enum: ['highly_recommended', 'recommended', 'consider', 'not_recommended']
        },
        overallAssessment: {
            score: Number,
            grade: String, // A, B, C, D, F
            verdict: String
        },
        keyStrengths: [String],
        concerns: [String],
        technicalAssessment: {
            score: Number,
            summary: String
        },
        communicationAssessment: {
            score: Number,
            summary: String
        },
        cultureFit: {
            score: Number,
            summary: String
        },
        suggestedNextSteps: [String],
        suggestedQuestions: [String],
        salaryRecommendation: String,
        riskFactors: [String],
        finalNotes: String,
        generatedAt: Date
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
interviewSchema.index({ jobId: 1 });
interviewSchema.index({ status: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
