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
        headline: String, // Professional headline (e.g., "Full Stack Developer")
        bio: String, // Short bio (max 500 chars)
        location: String // City/Country
    },

    // Social connections
    connections: {
        followers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        following: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        followersCount: {
            type: Number,
            default: 0
        },
        followingCount: {
            type: Number,
            default: 0
        }
    },

    // Privacy settings
    privacy: {
        profileVisibility: {
            type: String,
            enum: ['public', 'private', 'connections-only'],
            default: 'public'
        },
        showEmail: {
            type: Boolean,
            default: false
        },
        showPhone: {
            type: Boolean,
            default: false
        },
        allowMessages: {
            type: String,
            enum: ['everyone', 'connections', 'none'],
            default: 'everyone'
        }
    },

    // Notification preferences
    notificationSettings: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        pushNotifications: {
            type: Boolean,
            default: true
        },
        notifyOnFollow: {
            type: Boolean,
            default: true
        },
        notifyOnMessage: {
            type: Boolean,
            default: true
        },
        notifyOnLike: {
            type: Boolean,
            default: true
        },
        notifyOnComment: {
            type: Boolean,
            default: true
        }
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
