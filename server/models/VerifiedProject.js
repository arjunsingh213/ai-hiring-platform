const mongoose = require('mongoose');

const verifiedProjectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    githubUrl: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    domain: {
        type: String,
        required: true
    },
    techStack: [{ type: String, trim: true }],

    // Review status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },

    // Admin review
    adminReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    adminNotes: String,
    reviewedAt: Date,

    // Project metrics (filled by admin during review)
    complexity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    linesOfCode: Number,
    isOriginal: {
        type: Boolean,
        default: null // null = not yet verified
    },

    // ATP impact
    atpImpactApplied: {
        type: Boolean,
        default: false
    },
    atpImpactScore: {
        type: Number,
        default: 0
    },

    // Automated GitHub analysis results
    githubAnalysis: {
        analyzedAt: Date,
        techStackDetected: [String],
        commitCount: { type: Number, default: 0 },
        contributorCount: { type: Number, default: 0 },
        estimatedLOC: { type: Number, default: 0 },
        complexityEstimate: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        originalityScore: { type: Number, default: 0 },
        isFork: { type: Boolean, default: false },
        atpImpactEstimate: { type: Number, default: 0 },
        developmentDays: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

verifiedProjectSchema.index({ userId: 1 });
verifiedProjectSchema.index({ status: 1 });
verifiedProjectSchema.index({ userId: 1, domain: 1 });
verifiedProjectSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('VerifiedProject', verifiedProjectSchema);
