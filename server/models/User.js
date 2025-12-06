const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['jobseeker', 'recruiter'],
        required: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true, // Allow null for testing mode
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        select: false // Don't return password by default
    },

    // Common profile fields
    profile: {
        name: { type: String, required: true },
        age: Number,
        dob: Date,
        mobile: String,
        photo: String, // GridFS file ID or URL
    },

    // Job Seeker specific fields
    jobSeekerProfile: {
        profession: String,
        college: String,
        domain: String,
        experienceLevel: {
            type: String,
            enum: ['fresher', 'experienced']
        },
        desiredRole: String,
        portfolioLinks: {
            linkedin: String,
            github: String,
            portfolio: String
        },
        education: [{
            degree: String,
            institution: String,
            year: Number,
            field: String
        }]
    },

    // Recruiter specific fields
    recruiterProfile: {
        position: {
            type: String,
            enum: ['hr', 'hiring_manager', 'recruiter']
        },
        companyName: String,
        companyDomain: String,
        companyWebsite: String,
        companyRegistrationNumber: String,
        businessCard: String, // GridFS file ID
        verified: {
            type: Boolean,
            default: false
        }
    },

    // Resume reference
    resume: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume'
    },

    // Interview status
    interviewStatus: {
        completed: {
            type: Boolean,
            default: false
        },
        technicalScore: Number,
        hrScore: Number,
        overallScore: Number,
        cracked: {
            type: Boolean,
            default: false
        },
        strengths: [String],
        weaknesses: [String],
        proctoringFlags: [{
            type: String,
            timestamp: Date
        }]
    },

    // Activity tracking
    lastActive: {
        type: Date,
        default: Date.now
    },

    // Testing mode flag
    testingMode: {
        type: Boolean,
        default: true // Bypass authentication
    }
}, {
    timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'profile.name': 'text' });

module.exports = mongoose.model('User', userSchema);
