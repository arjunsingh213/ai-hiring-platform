const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileId: {
        type: String, // GridFS file ID
        required: true
    },
    fileName: String,
    fileType: String,

    // Parsed data from resume
    parsedData: {
        rawText: String,
        skills: [String],
        experience: [{
            company: String,
            position: String,
            duration: String,
            description: String
        }],
        education: [{
            degree: String,
            institution: String,
            year: Number,
            field: String
        }],
        projects: [{
            name: String,
            description: String,
            technologies: [String]
        }],
        certifications: [String],
        languages: [String]
    },

    // AI analysis
    aiAnalysis: {
        keyStrengths: [String],
        suggestedRoles: [String],
        skillLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert']
        }
    }
}, {
    timestamps: true
});

resumeSchema.index({ userId: 1 });

module.exports = mongoose.model('Resume', resumeSchema);
