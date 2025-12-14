const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileId: {
        type: String, // GridFS file ID or Cloudinary public_id
        required: true
    },
    fileName: String,
    fileType: String,
    fileUrl: String, // Cloudinary URL

    // HTML version of resume (for better parsing)
    htmlContent: String,

    // Parsed data from resume
    parsedData: {
        rawText: String,
        skills: [String],

        // Categorized skills for targeted interview questions
        skillCategories: {
            programmingLanguages: [String],
            frameworks: [String],
            databases: [String],
            tools: [String],
            softSkills: [String]
        },

        experience: [{
            company: String,
            position: String,
            duration: String,
            description: String,
            technologiesUsed: [String]
        }],
        education: [{
            degree: String,
            institution: String,
            year: String, // Can be "2020 - 2024" or just "2024"
            field: String
        }],
        projects: [{
            name: String,
            description: String,
            technologies: [String],
            role: String
        }],
        certifications: [String],
        languages: [String],
        totalYearsExperience: Number
    },

    // AI analysis
    aiAnalysis: {
        keyStrengths: [String],
        suggestedRoles: [String],
        skillLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert']
        },
        interviewFocus: [String] // Skills to focus on during interview
    }
}, {
    timestamps: true
});

resumeSchema.index({ userId: 1 });

module.exports = mongoose.model('Resume', resumeSchema);
