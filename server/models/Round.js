const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    type: {
        type: String,
        enum: ['AI', 'HUMAN'],
        required: true
    },
    subtype: {
        type: String,
        required: true
        // AI: screening, technical, coding, dsa, hr, assessment, system_design...
        // HUMAN: in_person, video, panel, technical_deep_dive, hR_discussion, managerial...
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    orderIndex: {
        type: Number,
        required: true
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CandidateBatch',
        default: null
    },
    configuration: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
        /* 
           AI Configuration:
           - difficulty
           - topics
           - questionCount
           - antiCheating: Boolean
           - timeLimit
           - codingConfig: { languages, problemCount, topics }
           - assessmentConfig: { assessmentTypes, questionCount, passingScore }

           HUMAN Configuration:
           - location
           - meetingLink
           - duration
           - interviewerNotes
           - evaluationCriteria
           - scorecardTemplate
        */
    },
    version: {
        type: Number,
        default: 1
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for efficient pipeline retrieval
roundSchema.index({ jobId: 1, orderIndex: 1 });
roundSchema.index({ batchId: 1 });

module.exports = mongoose.model('Round', roundSchema);
