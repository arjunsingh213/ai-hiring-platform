const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    recruiterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Job details
    title: {
        type: String,
        required: true
    },
    company: {
        name: String,
        logo: String,
        website: String,
        location: String,
        industry: String
    },

    domain: {
        type: String,
        required: false,
        index: true
    },

    description: {
        type: String,
        required: true
    },

    requirements: {
        skills: [String],
        experienceLevel: {
            type: String,
            enum: ['entry', 'mid', 'senior', 'expert']
        },
        minExperience: Number, // years
        maxExperience: Number,
        education: [String],
        certifications: [String]
    },

    jobDetails: {
        type: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance']
        },
        location: String,
        remote: {
            type: Boolean,
            default: false
        },
        salary: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: 'USD'
            },
            period: {
                type: String,
                enum: ['hourly', 'monthly', 'yearly']
            }
        },
        benefits: [String]
    },

    // Application settings
    applicationSettings: {
        deadline: Date,
        questionsRequired: [{
            question: String,
            type: {
                type: String,
                enum: ['text', 'multiple_choice', 'file_upload']
            },
            required: Boolean,
            options: [String] // For multiple choice
        }],
        requireResume: {
            type: Boolean,
            default: true
        },
        requireCoverLetter: Boolean,
        requirePortfolio: Boolean
    },

    // Interview Pipeline Configuration - Recruiter customizable
    interviewPipeline: {
        // Preset type for quick selection
        pipelineType: {
            type: String,
            enum: ['quick_2round', 'standard_4round', 'dsa_only', 'assessment_only', 'custom'],
            default: 'standard_4round'
        },

        // Individual rounds configuration
        rounds: [{
            roundNumber: { type: Number, required: true },
            roundType: {
                type: String,
                enum: [
                    'screening', 'technical', 'coding', 'dsa', 'hr', 'assessment', 'system_design', 'behavioral', 'portfolio_review', 'group_discussion',
                    'in_person', 'video', 'panel', 'technical_deep_dive', 'hr_discussion', 'managerial'
                ],
                required: true
            },
            title: { type: String, required: true },
            description: String,
            duration: { type: Number, default: 30 }, // Minutes
            isAIEnabled: { type: Boolean, default: true },
            isRequired: { type: Boolean, default: true },

            // Coding/DSA specific config
            codingConfig: {
                difficulty: {
                    type: String,
                    enum: ['easy', 'medium', 'hard', 'mixed'],
                    default: 'medium'
                },
                languages: [String],
                problemCount: { type: Number, default: 2 },
                topics: [String], // e.g., ['arrays', 'trees', 'dynamic_programming', 'graphs']
                timePerProblem: { type: Number, default: 20 }, // Minutes
                allowCodeExecution: { type: Boolean, default: true }
            },

            // Interview question config
            questionConfig: {
                questionCount: { type: Number, default: 5 },
                categories: [String], // ['conceptual', 'practical', 'situational']
                focusSkills: [String], // Skills to focus questions on
                difficultyDistribution: {
                    easy: { type: Number, default: 20 },
                    medium: { type: Number, default: 60 },
                    hard: { type: Number, default: 20 }
                }
            },

            // Assessment config (for MCQ/written tests)
            assessmentConfig: {
                questionCount: { type: Number, default: 20 },
                duration: { type: Number, default: 30 },
                passingScore: { type: Number, default: 60 },
                topics: [String],
                randomize: { type: Boolean, default: true },
                // Assessment types: technical, communication, aptitude, reasoning
                assessmentTypes: {
                    type: [String],
                    enum: ['technical', 'communication', 'aptitude', 'reasoning'],
                    default: ['technical']
                }
            },

            // Scoring thresholds for this round
            scoring: {
                passingScore: { type: Number, default: 60 },
                weightage: { type: Number, default: 100 } // % weightage in overall score
            }
        }],

        // Global pipeline settings
        settings: {
            requirePlatformInterview: { type: Boolean, default: false },
            autoRejectBelowScore: Number,    // Auto-reject if overall score < this
            autoAdvanceAboveScore: Number,   // Auto-advance to next round if score > this
            allowReschedule: { type: Boolean, default: true },
            maxAttempts: { type: Number, default: 1 },
            expiryDays: { type: Number, default: 7 }, // Days to complete interview
            notifyOnCompletion: { type: Boolean, default: true },
            sendFeedbackToCandidate: { type: Boolean, default: false }
        },

        domainPreset: {
            type: String,
            enum: ['engineering', 'data_science', 'design', 'product', 'marketing', 'sales', 'hr', 'finance', 'general']
        },

        // NEW: Dynamic Rounds Reference (Hybrid Pipeline)
        pipelineRounds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Round'
        }]
    },

    // Applicants
    applicants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        appliedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['applied', 'reviewing', 'interviewing', 'shortlisted', 'interviewed', 'rejected', 'hired'],
            default: 'applied'
        },
        // Interview results
        interviewId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Interview'
        },
        interviewScore: Number,
        interviewCompleted: {
            type: Boolean,
            default: false
        },
        // Application answers and notes
        answers: [{
            questionIndex: Number,
            answer: String
        }],
        notes: String, // Recruiter notes
        rejectionReason: String,
        hiredAt: Date
    }],

    // Status
    status: {
        type: String,
        enum: ['draft', 'active', 'closed', 'filled'],
        default: 'active'
    },

    // Analytics
    views: {
        type: Number,
        default: 0
    },

    // AI-enhanced fields
    aiGenerated: {
        formattedDescription: String,
        suggestedSkills: [String],
        matchingCandidates: [{
            userId: mongoose.Schema.Types.ObjectId,
            matchScore: Number
        }]
    }
}, {
    timestamps: true
});

jobSchema.index({ recruiterId: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ 'requirements.skills': 1 });
jobSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Job', jobSchema);
