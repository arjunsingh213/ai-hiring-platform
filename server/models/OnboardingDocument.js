const mongoose = require('mongoose');

const onboardingDocumentSchema = new mongoose.Schema({
    hiringProcessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HiringProcess',
        required: true
    },

    // Document details
    type: {
        type: String,
        enum: [
            'id_proof',
            'education_certificate',
            'employment_letter',
            'address_proof',
            'bank_details',
            'emergency_contact',
            'background_check_consent',
            'nda_signed',
            'tax_form',
            'other'
        ],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    required: {
        type: Boolean,
        default: true
    },

    // File info
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    fileType: String,
    uploadedAt: Date,

    // Verification
    status: {
        type: String,
        enum: ['pending', 'uploaded', 'verified', 'rejected'],
        default: 'pending'
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,
    rejectionReason: String,
    notes: String
}, {
    timestamps: true
});

// Index for faster queries
onboardingDocumentSchema.index({ hiringProcessId: 1, status: 1 });
onboardingDocumentSchema.index({ type: 1 });

// Static method to create default documents for a hiring process
onboardingDocumentSchema.statics.createDefaultDocuments = async function (hiringProcessId) {
    const defaultDocs = [
        { type: 'id_proof', name: 'Government ID', description: 'Passport, Driver\'s License, or National ID', required: true },
        { type: 'education_certificate', name: 'Educational Certificates', description: 'Degree certificates and transcripts', required: true },
        { type: 'employment_letter', name: 'Previous Employment Letters', description: 'Experience letters from previous employers', required: false },
        { type: 'address_proof', name: 'Address Proof', description: 'Utility bill or rental agreement', required: true },
        { type: 'bank_details', name: 'Bank Account Details', description: 'For salary deposit', required: true },
        { type: 'emergency_contact', name: 'Emergency Contact Information', description: 'Contact details of emergency person', required: true },
        { type: 'background_check_consent', name: 'Background Check Consent', description: 'Signed consent form', required: true },
        { type: 'nda_signed', name: 'NDA/Confidentiality Agreement', description: 'Signed non-disclosure agreement', required: true },
        { type: 'tax_form', name: 'Tax Forms', description: 'W4/W9 or equivalent tax forms', required: true }
    ];

    const documents = defaultDocs.map(doc => ({
        hiringProcessId,
        ...doc
    }));

    return await this.insertMany(documents);
};

module.exports = mongoose.model('OnboardingDocument', onboardingDocumentSchema);
