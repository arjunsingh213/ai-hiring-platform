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
        enum: ['technical', 'hr', 'combined', 'job_specific', 'platform'],
        required: true
    },

    // Domain-Specific Interview Blueprint
    blueprint: {
        domain: String, // Technical, Semi-Technical, Non-Technical, etc.
        secondaryDomain: String,
        roleCategory: String, // backend_developer, marketing_manager, etc.
        totalRounds: Number,
        totalQuestions: Number,
        hasCodingRound: Boolean,
        programmingLanguages: [String],
        keySkills: [String],
        experienceLevel: String, // entry, mid, senior
        rounds: [{
            roundNumber: Number,
            type: String, // technical_fundamentals, deep_dive, behavioral_hr, etc.
            displayName: String,
            icon: String, // Emoji for UI
            difficulty: String, // easy, medium, medium-hard, hard
            questionCount: Number,
            startQuestionNumber: Number,
            endQuestionNumber: Number,
            description: String,
            tips: [String],
            focus: [String], // Skills being assessed
            isCodingRound: Boolean,
            // Round results
            score: Number,
            completed: Boolean,
            completedAt: Date
        }],
        generatedAt: Date
    },
    currentRoundNumber: {
        type: Number,
        default: 1
    },
    currentQuestionInRound: {
        type: Number,
        default: 0
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

    // NEW: Pipeline tracking for recruiter-configured interview flow
    pipelineConfig: {
        pipelineType: String, // 'quick_2round', 'standard_4round', 'dsa_only', 'assessment_only', 'custom'
        rounds: [{
            roundNumber: Number,
            roundType: String, // 'technical', 'hr', 'dsa', 'coding', 'assessment', 'screening', 'behavioral'
            title: String,
            duration: Number, // minutes
            isAIEnabled: Boolean,
            codingConfig: {
                difficulty: String,
                problemCount: Number,
                topics: [String],
                languages: [String]
            },
            questionConfig: {
                questionCount: Number,
                focusSkills: [String]
            },
            assessmentConfig: {
                assessmentTypes: [String], // 'technical', 'communication', 'aptitude'
                questionCount: Number,
                passingScore: Number
            },
            scoring: {
                passingScore: Number,
                weight: Number
            }
        }],
        settings: {
            requirePlatformInterview: Boolean,
            autoRejectBelowScore: Number,
            autoAdvanceAboveScore: Number
        }
    },
    currentRoundIndex: {
        type: Number,
        default: 0
    },
    roundResults: [{
        roundIndex: Number,
        roundType: String,
        score: Number,
        passed: Boolean,
        details: mongoose.Schema.Types.Mixed, // Round-specific data (MCQ answers, code submission, etc)
        completedAt: Date
    }],


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
        },
        roundIndex: Number
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
            technicalScore: Number,
            communicationScore: Number,
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
        confidence: Number,
        roundIndex: Number
    }],

    // Scoring
    scoring: {
        technicalScore: Number, // 0-100
        technicalAccuracy: Number, // Added for compatibility with detailed-results route
        communicationScore: Number, // 0-100
        communication: Number, // Added for compatibility with detailed-results route
        confidenceScore: Number, // 0-100
        confidence: Number, // Added for compatibility with detailed-results route
        relevanceScore: Number, // 0-100
        relevance: Number, // Added for compatibility with detailed-results route
        overallScore: Number, // 0-100
        strengths: [String],
        weaknesses: [String],
        detailedFeedback: String
    },

    // NEW: Coding Test Results
    codingResults: {
        score: Number, // 0-100
        passed: Boolean,
        language: String,
        testsPassed: Number,
        totalTests: Number,
        skipped: {
            type: Boolean,
            default: false
        },
        completedAt: Date,
        code: String // The submitted code
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
                    // Original lowercase values
                    'multiple_voices',
                    'eye_movement',
                    'phone_detected',
                    'multiple_faces',
                    'tab_switch',
                    'window_focus_loss',
                    'suspicious_background',
                    // Frontend InterviewProctor values (uppercase)
                    'NO_FACE',
                    'MULTIPLE_FACES',
                    'LOOK_AWAY',
                    'TAB_SWITCH',
                    'WINDOW_BLUR',
                    'COPY_ATTEMPT',
                    'PASTE_ATTEMPT',
                    'DEV_TOOLS',
                    'OTHER'
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
        enum: ['scheduled', 'in_progress', 'completed', 'pending_review', 'approved', 'abandoned'],
        default: 'scheduled'
    },

    startedAt: Date,
    completedAt: Date,
    duration: Number, // seconds

    // Final result
    passed: {
        type: Boolean,
        default: false
    },

    // ==================== ADMIN REVIEW SYSTEM ====================
    adminReview: {
        status: {
            type: String,
            enum: ['pending_review', 'approved', 'cheating_confirmed', 'reattempt_allowed', 'rejected'],
            default: 'pending_review'
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        },
        reviewedAt: Date,
        aiScore: Number,        // Original AI-calculated score (immutable)
        finalScore: Number,     // Admin-adjusted score (if any)
        scoreAdjusted: {
            type: Boolean,
            default: false
        },
        scoreAdjustmentReason: String,
        cheatingConfirmed: {
            type: Boolean,
            default: false
        },
        cheatingDetails: String,
        adminNotes: String,
        // Auto-escalation tracking
        autoEscalated: {
            type: Boolean,
            default: false
        },
        escalationReason: String,
        priorityLevel: {
            type: String,
            enum: ['normal', 'high', 'critical'],
            default: 'normal'
        }
    },

    // ==================== VIDEO RECORDING ====================
    videoRecording: {
        // Cloudinary video details
        publicId: String,
        url: String,
        secureUrl: String,
        duration: Number, // seconds
        format: String,
        uploadedAt: Date,
        fileSize: Number, // bytes
        // Cheating flag timestamps within video
        cheatingMarkers: [{
            flagType: {
                type: String,
                enum: [
                    // Original lowercase values
                    'multiple_voices',
                    'eye_movement',
                    'phone_detected',
                    'multiple_faces',
                    'tab_switch',
                    'window_focus_loss',
                    'suspicious_background',
                    // Frontend InterviewProctor values (uppercase)
                    'NO_FACE',
                    'MULTIPLE_FACES',
                    'LOOK_AWAY',
                    'TAB_SWITCH',
                    'WINDOW_BLUR',
                    'COPY_ATTEMPT',
                    'PASTE_ATTEMPT',
                    'DEV_TOOLS',
                    'OTHER'
                ]
            },
            timestamp: Number, // seconds from video start
            duration: Number,  // how long the flag persisted (seconds)
            severity: {
                type: String,
                enum: ['low', 'medium', 'high']
            },
            description: String,
            aiConfidence: Number // 0-100
        }],
        // Video analysis summary
        totalFlagsInVideo: {
            type: Number,
            default: 0
        },
        highSeverityFlagsCount: {
            type: Number,
            default: 0
        }
    },

    // Candidate visibility control
    resultVisibleToCandidate: {
        type: Boolean,
        default: false // Only true after admin approval
    }
}, {
    timestamps: true
});

// Pre-save hook to auto-escalate based on cheating flags
// Note: For Mongoose 6+, using synchronous pre-save hook (no next callback needed)
interviewSchema.pre('save', function () {
    // Ensure adminReview object exists
    if (!this.adminReview) {
        this.adminReview = {};
    }

    // Auto-escalate if more than 3 high-severity flags
    if (this.videoRecording && this.videoRecording.highSeverityFlagsCount > 3) {
        this.adminReview.autoEscalated = true;
        this.adminReview.escalationReason = `Auto-escalated: ${this.videoRecording.highSeverityFlagsCount} high-severity cheating flags detected`;
        this.adminReview.priorityLevel = 'critical';
    } else if (this.proctoring && this.proctoring.riskLevel === 'high') {
        this.adminReview.autoEscalated = true;
        this.adminReview.escalationReason = 'Auto-escalated: High risk level from proctoring';
        this.adminReview.priorityLevel = 'high';
    }
    // No next() needed - Mongoose 6+ handles it automatically
});

interviewSchema.index({ userId: 1, interviewType: 1 });
interviewSchema.index({ jobId: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ 'adminReview.status': 1 });
interviewSchema.index({ 'adminReview.priorityLevel': 1 });

module.exports = mongoose.model('Interview', interviewSchema);

