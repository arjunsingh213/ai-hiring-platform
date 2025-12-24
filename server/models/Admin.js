const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'reviewer'],
        default: 'admin'
    },
    permissions: [{
        type: String,
        enum: [
            'view_interviews',
            'approve_interviews',
            'reject_interviews',
            'adjust_scores',
            'allow_reattempts',
            'view_users',
            'suspend_users',
            'manage_admins',
            'view_audit_logs',
            'export_data'
        ]
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    mustResetPassword: {
        type: Boolean,
        default: true // Force password reset on first login
    },
    lastLogin: Date,
    lastActivity: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    // Session tracking for inactivity logout
    activeSessions: [{
        token: String,
        createdAt: Date,
        lastActivity: Date,
        ipAddress: String,
        userAgent: String
    }]
}, {
    timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
adminSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
adminSchema.methods.isLocked = function () {
    return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
adminSchema.methods.incrementLoginAttempts = async function () {
    // Reset attempts if lock has expired
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock account after 5 failed attempts for 30 minutes
    if (this.loginAttempts + 1 >= 5) {
        updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
    }

    return this.updateOne(updates);
};

// Get default permissions based on role
adminSchema.statics.getDefaultPermissions = function (role) {
    const permissions = {
        super_admin: [
            'view_interviews',
            'approve_interviews',
            'reject_interviews',
            'adjust_scores',
            'allow_reattempts',
            'view_users',
            'suspend_users',
            'manage_admins',
            'view_audit_logs',
            'export_data'
        ],
        admin: [
            'view_interviews',
            'approve_interviews',
            'reject_interviews',
            'adjust_scores',
            'allow_reattempts',
            'view_users',
            'suspend_users',
            'view_audit_logs'
        ],
        reviewer: [
            'view_interviews',
            'approve_interviews',
            'view_users',
            'view_audit_logs'
        ]
    };

    return permissions[role] || permissions.reviewer;
};

adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

module.exports = mongoose.model('Admin', adminSchema);
