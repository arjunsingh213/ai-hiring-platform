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
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,

    // Password Reset Fields
    passwordResetOTP: String,
    passwordResetToken: String,
    passwordResetExpires: Date,

    isOnboardingComplete: {
        type: Boolean,
        default: false
    },

    // Platform Interview Status (Phase 1 - mandatory before applying)
    platformInterview: {
        status: {
            type: String,
            enum: ['pending', 'skipped', 'in_progress', 'passed', 'failed'],
            default: 'pending'
        },
        completedAt: Date,
        score: Number,
        attempts: { type: Number, default: 0 },
        lastAttemptAt: Date,
        // Retry policy: Can retry after 2 days of failure
        canRetry: { type: Boolean, default: true },
        retryAfter: Date,
        // Reminder tracking
        lastReminderAt: Date,
        lastEmailReminderAt: Date,
        reminderCount: { type: Number, default: 0 }
    },

    password: {
        type: String,
        select: false // Don't return password by default
    },

    // OAuth fields
    oauth: {
        googleId: String,
        facebookId: String,
        githubId: String,
        linkedinId: String,
        provider: {
            type: String,
            enum: ['local', 'google', 'facebook', 'github', 'linkedin'],
            default: 'local'
        }
    },

    // Common profile fields
    profile: {
        name: { type: String, default: '' },
        age: Number,
        dob: Date,
        mobile: String,
        photo: String, // GridFS file ID or URL
        headline: String, // Professional headline (e.g., "Full Stack Developer")
        bio: String, // Short bio (max 500 chars)
        location: String, // City/Country
        // Face Authentication Fields
        faceDescriptor: {
            type: [Number], // 128-dimension face encoding
            select: false // Don't return by default for security
        },
        faceVerified: {
            type: Boolean,
            default: false
        },
        faceVerifiedAt: Date,
        faceQualityScore: Number,
        livenessVerified: {
            type: Boolean,
            default: false
        }
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
        domain: String, // Field of study from college
        experienceLevel: {
            type: String,
            enum: ['fresher', 'experienced']
        },
        desiredRole: String,
        // Job domains user wants to work in (max 3)
        jobDomains: [{
            type: String,
            enum: ['web_dev', 'frontend', 'backend', 'fullstack', 'mobile', 'data_science', 'data_analyst', 'ml_ai', 'devops', 'cybersecurity', 'network', 'database', 'ui_ux', 'graphic_design', 'product', 'project', 'qa_testing', 'hr', 'marketing', 'sales', 'finance', 'content', 'support', 'research', 'consulting', 'other']
        }],
        about: String, // About me section (longer bio)
        bannerImage: String, // Banner image URL
        portfolioLinks: {
            linkedin: String,
            github: String,
            portfolio: String,
            twitter: String,
            website: String
        },
        skills: [{
            name: String,
            level: {
                type: String,
                enum: ['beginner', 'intermediate', 'advanced', 'expert'],
                default: 'intermediate'
            }
        }],
        experience: [{
            title: String,
            company: String,
            location: String,
            startDate: Date,
            endDate: Date,
            current: { type: Boolean, default: false },
            description: String
        }],
        education: [{
            degree: String,
            institution: String,
            year: Number,
            field: String,
            startYear: Number,
            endYear: Number,
            grade: String
        }],
        certifications: [{
            name: String,
            issuer: String,
            date: Date,
            url: String
        }],
        languages: [{
            language: String,
            proficiency: {
                type: String,
                enum: ['basic', 'conversational', 'fluent', 'native'],
                default: 'conversational'
            }
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

    // ==================== ACCOUNT STATUS (ADMIN CONTROL) ====================
    accountStatus: {
        isSuspended: {
            type: Boolean,
            default: false
        },
        suspendedAt: Date,
        suspendedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        },
        suspensionReason: String,
        isRepeatOffender: {
            type: Boolean,
            default: false
        },
        offenderMarkedAt: Date,
        offenderNotes: String
    },

    // ==================== AI TALENT PASSPORT (NEW ADDITIVE FEATURE) ====================
    // This is a PURE ADDITION - does not modify any existing fields or functionality
    aiTalentPassport: {
        // Core Scores (0-100)
        talentScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        domainScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        communicationScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        problemSolvingScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        gdScore: { // Group Discussion Score
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        professionalismScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        // Global Rankings
        globalPercentile: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        levelBand: {
            type: String,
            enum: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7'],
            default: 'Level 1'
        },

        // Skill Heatmap (AI-generated)
        skillHeatmap: [{
            skillName: String,
            proficiency: {
                type: Number,
                min: 0,
                max: 100
            },
            assessedDate: Date
        }],

        // Proof-of-Work Scores
        proofOfWork: {
            codingTasks: {
                completed: { type: Number, default: 0 },
                avgScore: { type: Number, default: 0 }
            },
            simulations: {
                completed: { type: Number, default: 0 },
                avgScore: { type: Number, default: 0 }
            },
            missions: {
                completed: { type: Number, default: 0 },
                avgScore: { type: Number, default: 0 }
            }
        },

        // Behavioral Profile
        behavioralProfile: {
            leadership: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },
            teamwork: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },
            confidence: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },
            stressResponse: {
                type: String,
                enum: ['Excellent', 'Good', 'Average', 'Needs Improvement'],
                default: 'Average'
            },
            communicationStyle: {
                type: String,
                enum: ['Assertive', 'Passive', 'Analytical', 'Expressive'],
                default: 'Analytical'
            }
        },

        // Reliability Metrics
        reliability: {
            punctuality: {
                type: Number,
                default: 100,
                min: 0,
                max: 100
            },
            taskCompletionRate: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },
            responsiveness: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },
            consistency: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            }
        },

        // Career Predictions (AI-generated)
        careerPredictions: {
            recommendedRoles: [{
                role: String,
                fitScore: Number,
                salaryEstimate: {
                    min: Number,
                    max: Number,
                    currency: { type: String, default: 'USD' }
                }
            }],
            readinessPercentage: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },
            learningRoadmap: [{
                skill: String,
                currentLevel: String,
                targetLevel: String,
                estimatedTime: String,
                priority: {
                    type: String,
                    enum: ['High', 'Medium', 'Low'],
                    default: 'Medium'
                }
            }]
        },

        // Role Fit Scores (for specific job types)
        roleFitScores: [{
            roleType: String, // e.g., "Full Stack Developer", "Data Scientist"
            fitScore: {
                type: Number,
                min: 0,
                max: 100
            },
            strengths: [String],
            gaps: [String]
        }],

        // Passport Versioning
        version: {
            type: String,
            default: 'v1.0'
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        },

        // Metadata
        totalAssessmentsCompleted: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    // ==================== END AI TALENT PASSPORT ====================

    // ==================== USER SETTINGS ====================
    settings: {
        language: {
            type: String,
            default: 'en'
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'system'],
            default: 'system'
        }
    },

    // ==================== SECURITY SETTINGS ====================
    security: {
        twoFactorEnabled: {
            type: Boolean,
            default: false
        },
        twoFactorSecret: {
            type: String,
            select: false // Don't return by default for security
        },
        sessions: [{
            deviceId: String,
            deviceInfo: String,
            ip: String,
            userAgent: String,
            lastActive: { type: Date, default: Date.now },
            createdAt: { type: Date, default: Date.now }
        }],
        loginHistory: [{
            ip: String,
            device: String,
            location: String,
            userAgent: String,
            timestamp: { type: Date, default: Date.now },
            success: { type: Boolean, default: true }
        }]
    },

    // Testing mode flag
    testingMode: {
        type: Boolean,
        default: true // Bypass authentication
    }
}, {
    timestamps: true
});

// Indexes for performance (email index already created by unique: true in schema)
userSchema.index({ role: 1 });
userSchema.index({ 'profile.name': 'text' });

module.exports = mongoose.model('User', userSchema);
