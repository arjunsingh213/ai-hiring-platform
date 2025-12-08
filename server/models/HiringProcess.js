const mongoose = require('mongoose');

const hiringProcessSchema = new mongoose.Schema({
    // References
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    applicantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recruiterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Status tracking
    currentStage: {
        type: String,
        enum: [
            'offer_extended',
            'offer_accepted',
            'offer_declined',
            'documents_pending',
            'documents_complete',
            'onboarding_complete',
            'cancelled'
        ],
        default: 'offer_extended'
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },

    // Offer details
    offer: {
        position: {
            type: String,
            required: true
        },
        salary: {
            amount: {
                type: Number,
                required: true
            },
            currency: {
                type: String,
                default: 'USD'
            },
            period: {
                type: String,
                enum: ['annual', 'monthly'],
                default: 'annual'
            }
        },
        startDate: {
            type: Date,
            required: true
        },
        location: String,
        employmentType: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'internship'],
            default: 'full-time'
        },
        department: String,
        reportingManager: String,
        benefits: [String],
        customTerms: String,
        offerLetterUrl: String,
        expiryDate: {
            type: Date,
            required: true
        },
        acceptedAt: Date,
        declinedAt: Date,
        declineReason: String,
        signature: String  // Base64 encoded signature image
    },

    // Timeline
    timeline: {
        offerSentAt: {
            type: Date,
            default: Date.now
        },
        offerAcceptedAt: Date,
        documentsDeadline: Date,
        startDate: Date,
        actualStartDate: Date
    },

    // Progress tracking
    progress: {
        documentsCompleted: {
            type: Number,
            default: 0
        },
        documentsTotal: {
            type: Number,
            default: 10  // Total required documents
        },
        overallProgress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },

    // Notifications
    notifications: {
        remindersSent: {
            type: Number,
            default: 0
        },
        lastReminderAt: Date
    }
}, {
    timestamps: true
});

// Index for faster queries
hiringProcessSchema.index({ recruiterId: 1, status: 1 });
hiringProcessSchema.index({ applicantId: 1, status: 1 });
hiringProcessSchema.index({ currentStage: 1 });

// Method to calculate overall progress
hiringProcessSchema.methods.calculateProgress = function () {
    const stageWeights = {
        'offer_extended': 10,
        'offer_accepted': 30,
        'documents_pending': 50,
        'documents_complete': 80,
        'onboarding_complete': 100
    };

    let baseProgress = stageWeights[this.currentStage] || 0;

    // Add document completion progress if in documents stage
    if (this.currentStage === 'documents_pending' && this.progress.documentsTotal > 0) {
        const docProgress = (this.progress.documentsCompleted / this.progress.documentsTotal) * 30;
        baseProgress = 30 + docProgress;
    }

    this.progress.overallProgress = Math.round(baseProgress);
    return this.progress.overallProgress;
};

// Method to check if offer is expired
hiringProcessSchema.methods.isOfferExpired = function () {
    if (this.currentStage !== 'offer_extended') return false;
    return new Date() > this.offer.expiryDate;
};

module.exports = mongoose.model('HiringProcess', hiringProcessSchema);
