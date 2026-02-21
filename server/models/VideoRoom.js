const mongoose = require('mongoose');

/* ═══════════════════════════════════════════════════════════════
   FROSCEL INTERVIEW ROOM™ — VideoRoom Model
   Enterprise-grade video interview room management
   ═══════════════════════════════════════════════════════════════ */

const participantSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['recruiter', 'panelist', 'candidate'], required: true },
    name: String,
    email: String,
    joinedAt: Date,
    leftAt: Date,
    accessToken: String,
    isActive: { type: Boolean, default: false },
    // Connection quality tracking
    connectionQuality: { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'good' }
}, { _id: true });

const integritySignalSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['green', 'yellow', 'red'], required: true },
    reason: String,
    details: {
        type: { type: String },
        description: String,
        aiConfidence: Number // 0-100
    },
    // Only visible to recruiter & admin
    visibleTo: [{ type: String, enum: ['recruiter', 'admin'] }]
}, { _id: true });

const transcriptEntrySchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    speakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    speakerRole: { type: String, enum: ['recruiter', 'panelist', 'candidate', 'ai'] },
    speakerName: String,
    text: String,
    // Competency mapping
    competencyTags: [String],
    strengthIndicator: { type: Boolean, default: false },
    weaknessIndicator: { type: Boolean, default: false },
    aiGenerated: { type: Boolean, default: false }
}, { _id: true });

const noteSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['auto', 'manual', 'ai_suggestion'] },
    content: String,
    competencyCategory: String,
    skillNodes: [String],
    createdBy: { type: String, enum: ['ai', 'recruiter', 'panelist'] }
}, { _id: true });

const auditEntrySchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    action: {
        type: String,
        enum: [
            'room_created', 'room_started', 'room_ended',
            'participant_joined', 'participant_left',
            'recording_started', 'recording_stopped',
            'screen_share_started', 'screen_share_stopped',
            'ai_suggestion_generated', 'ai_suggestion_approved', 'ai_suggestion_rejected',
            'ai_question_asked', 'ai_disabled', 'ai_enabled',
            'integrity_signal_changed',
            'whiteboard_opened', 'code_editor_opened',
            'recruiter_note_added',
            'report_generated', 'report_validated',
            'atp_update_approved', 'atp_update_rejected'
        ]
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: String,
    details: mongoose.Schema.Types.Mixed,
    // Immutable — no updates allowed after creation
    immutable: { type: Boolean, default: true }
}, { _id: true });

const videoRoomSchema = new mongoose.Schema({
    // Unique short room code for joining
    roomCode: {
        type: String,
        unique: true,
        required: true,
        index: true
    },

    // References
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
    roundIndex: { type: Number, default: 0 },

    // Room status
    status: {
        type: String,
        enum: ['scheduled', 'waiting', 'live', 'completed', 'cancelled', 'archived'],
        default: 'scheduled'
    },

    // Schedule
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 45 }, // minutes
    startedAt: Date,
    endedAt: Date,

    // Interview type
    interviewType: {
        type: String,
        enum: ['one_on_one', 'panel'],
        default: 'one_on_one'
    },

    // Participants
    participants: [participantSchema],

    // Recording
    recording: {
        enabled: { type: Boolean, default: true },
        status: { type: String, enum: ['idle', 'recording', 'processing', 'ready', 'failed'], default: 'idle' },
        cloudinaryPublicId: String,
        cloudinaryUrl: String,
        cloudinarySecureUrl: String,
        duration: Number, // seconds
        fileSize: Number, // bytes
        format: String,
        uploadedAt: Date
    },

    // AI Co-Interviewer Configuration
    aiConfig: {
        enabled: { type: Boolean, default: false },
        permissions: {
            suggestFollowUps: { type: Boolean, default: true },
            askDirectly: { type: Boolean, default: false },
            probeVagueAnswers: { type: Boolean, default: true },
            detectContradictions: { type: Boolean, default: true },
            suggestDifficultyEscalation: { type: Boolean, default: true }
        },
        scope: {
            skills: [String],
            competencies: [String],
            maxDirectQuestions: { type: Number, default: 3 }
        },
        // Runtime state
        disabledAt: Date,
        disabledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // Integrity monitoring
    integritySignals: [integritySignalSchema],
    overallIntegrity: {
        type: String,
        enum: ['green', 'yellow', 'red'],
        default: 'green'
    },

    // Live documentation
    transcript: [transcriptEntrySchema],
    notes: [noteSchema],

    // Audit log (immutable)
    auditLog: [auditEntrySchema],

    // Post-interview report
    postInterviewReport: {
        generated: { type: Boolean, default: false },
        generatedAt: Date,
        summary: String,
        questionAnswerMap: [{
            question: String,
            answer: String,
            competencyTags: [String],
            score: Number,
            strengthIndicator: Boolean,
            riskIndicator: Boolean
        }],
        competencyAnalysis: [{
            competency: String,
            score: Number,
            evidence: [String],
            strengthAreas: [String],
            improvementAreas: [String]
        }],
        domainSkillImpact: [{
            skill: String,
            currentLevel: Number,
            suggestedDelta: Number,
            confidence: Number
        }],
        atpScorecard: {
            suggestedSkillXP: mongoose.Schema.Types.Mixed,
            suggestedDomainExpertise: mongoose.Schema.Types.Mixed,
            cognitiveMetrics: mongoose.Schema.Types.Mixed,
            behavioralProfile: mongoose.Schema.Types.Mixed,
            reliabilityIndex: Number,
            riskAdjustmentFactor: Number
        },
        strengthIndicators: [String],
        riskIndicators: [String],
        aiFollowUpLog: [{
            suggestion: String,
            approved: Boolean,
            recruiterAction: { type: String, enum: ['approved', 'edited', 'rejected'] },
            editedVersion: String,
            timestamp: Date
        }],
        recruiterOverrides: [{
            field: String,
            originalValue: mongoose.Schema.Types.Mixed,
            overriddenValue: mongoose.Schema.Types.Mixed,
            reason: String,
            timestamp: Date
        }],
        behavioralTelemetry: {
            responseLatency: { avg: Number, stdDev: Number },
            engagementLevel: Number,
            communicationClarity: Number,
            confidenceLevel: Number,
            stressIndicators: Number
        },
        confidenceScore: Number,
        recencyWeight: Number,
        integritySignalSummary: {
            greenCount: Number,
            yellowCount: Number,
            redCount: Number,
            overallAssessment: String
        }
    },

    // Recruiter validation
    recruiterValidation: {
        status: { type: String, enum: ['pending', 'validated', 'rejected'], default: 'pending' },
        validatedAt: Date,
        validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comments: String,
        aiObservations: [{
            observation: String,
            action: { type: String, enum: ['accepted', 'edited', 'rejected'] },
            editedVersion: String,
            recruiterComment: String
        }],
        finalEvaluation: {
            recommendation: { type: String, enum: ['strongly_recommend', 'recommend', 'neutral', 'not_recommend'] },
            overallScore: Number,
            notes: String
        },
        atpUpdateApproved: { type: Boolean, default: false }
    },

    // Interviewer notes (free-form)
    interviewerNotes: String,
    evaluationCriteria: [String],

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// Indexes
videoRoomSchema.index({ roomCode: 1 });
videoRoomSchema.index({ jobId: 1, candidateId: 1 });
videoRoomSchema.index({ recruiterId: 1, status: 1 });
videoRoomSchema.index({ candidateId: 1, status: 1 });
videoRoomSchema.index({ scheduledAt: 1 });
videoRoomSchema.index({ status: 1 });

// Pre-save: generate room code if not present
videoRoomSchema.pre('save', async function () {
    if (!this.roomCode) {
        const { v4: uuidv4 } = await import('uuid');
        this.roomCode = uuidv4().split('-')[0].toUpperCase(); // e.g. "A1B2C3D4"
    }
});

// Method: add audit entry (immutable)
videoRoomSchema.methods.addAuditEntry = function (action, actorId, actorRole, details = {}) {
    this.auditLog.push({
        action,
        actorId,
        actorRole,
        details,
        timestamp: new Date(),
        immutable: true
    });
};

// Method: add integrity signal
videoRoomSchema.methods.addIntegritySignal = function (level, reason, details = {}) {
    this.integritySignals.push({
        level,
        reason,
        details,
        visibleTo: ['recruiter', 'admin'],
        timestamp: new Date()
    });

    // Update overall integrity (worst signal wins)
    const signals = this.integritySignals;
    if (signals.some(s => s.level === 'red')) this.overallIntegrity = 'red';
    else if (signals.some(s => s.level === 'yellow')) this.overallIntegrity = 'yellow';
    else this.overallIntegrity = 'green';
};

// Method: add transcript entry
videoRoomSchema.methods.addTranscriptEntry = function (speakerId, speakerRole, speakerName, text, options = {}) {
    this.transcript.push({
        speakerId,
        speakerRole,
        speakerName,
        text,
        ...options,
        timestamp: new Date()
    });
};

module.exports = mongoose.model('VideoRoom', videoRoomSchema);
