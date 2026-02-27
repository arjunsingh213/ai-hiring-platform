const mongoose = require('mongoose');

const skillNodeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    skillName: {
        type: String,
        required: true,
        trim: true
    },
    // Normalized lowercase version for matching
    skillNameNormalized: {
        type: String,
        trim: true,
        lowercase: true
    },
    domainCategories: [{
        type: String,
        default: 'Others'
    }],
    // Level 0→4: Unverified → Basic → Intermediate → Advanced → Expert
    level: {
        type: Number,
        default: 0,
        min: 0,
        max: 4
    },
    // Cumulative XP — thresholds: 0→100(L1), 100→300(L2), 300→600(L3), 600→1000(L4)
    xp: {
        type: Number,
        default: 0,
        min: 0
    },
    verifiedStatus: {
        type: String,
        enum: ['not_verified', 'in_progress', 'verified', 'expert'],
        default: 'not_verified'
    },
    // Aggregated anti-cheat risk across all challenge attempts for this skill
    riskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    challengesCompleted: {
        type: Number,
        default: 0
    },
    // Highest challenge level completed for this skill
    highestLevelCompleted: {
        type: Number,
        default: 0,
        min: 0,
        max: 4
    },
    lastChallengeAt: Date,
    source: {
        type: String,
        enum: ['resume', 'manual', 'challenge'],
        default: 'resume'
    },
    // Sub-skills or tools detected (e.g., Python → Django, Flask, NumPy)
    subSkills: [{ type: String, trim: true }],
    // XP history for audit trail
    xpHistory: [{
        amount: Number,
        reason: String,        // e.g., 'challenge_completion', 'admin_adjustment'
        challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
        timestamp: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Pre-save: auto-generate normalized name
skillNodeSchema.pre('save', async function () {
    if (this.isModified('skillName')) {
        this.skillNameNormalized = this.skillName.toLowerCase().trim();
    }
});

// Pre-save: auto-calculate level from XP
skillNodeSchema.pre('save', async function () {
    if (this.isModified('xp')) {
        const thresholds = [0, 100, 300, 600, 1000];
        let newLevel = 0;
        for (let i = thresholds.length - 1; i >= 0; i--) {
            if (this.xp >= thresholds[i]) {
                newLevel = i;
                break;
            }
        }
        // Only go up to highestLevelCompleted + 1 (must complete challenges to level up)
        this.level = Math.min(newLevel, Math.max(this.highestLevelCompleted, 0));

        // Auto-update verified status
        if (this.level >= 4) this.verifiedStatus = 'expert';
        else if (this.level >= 2) this.verifiedStatus = 'verified';
        else if (this.level >= 1) this.verifiedStatus = 'in_progress';
        else this.verifiedStatus = 'not_verified';
    }
});

// Static: XP thresholds for each level
skillNodeSchema.statics.XP_THRESHOLDS = [0, 100, 300, 600, 1000];

// Static: XP needed for next level
skillNodeSchema.statics.xpForNextLevel = function (currentLevel) {
    const thresholds = [0, 100, 300, 600, 1000];
    return currentLevel < 4 ? thresholds[currentLevel + 1] : thresholds[4];
};

// Static: Level labels
skillNodeSchema.statics.LEVEL_LABELS = ['Unverified', 'Basic', 'Intermediate', 'Advanced', 'Expert'];

// Unique constraint per user per skill
skillNodeSchema.index({ userId: 1, skillNameNormalized: 1 }, { unique: true });
skillNodeSchema.index({ userId: 1, domainCategories: 1 });
skillNodeSchema.index({ userId: 1, level: -1 });
skillNodeSchema.index({ userId: 1, verifiedStatus: 1 });

module.exports = mongoose.model('SkillNode', skillNodeSchema);
