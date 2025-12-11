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
