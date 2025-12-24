const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    adminEmail: {
        type: String,
        required: true
    },
    action: {
        type: String,
        enum: [
            // Interview actions
            'view_interview',
            'approve_interview',
            'reject_interview',
            'adjust_score',
            'allow_reattempt',
            'confirm_cheating',
            'dismiss_cheating_flags',

            // User actions
            'view_user',
            'suspend_user',
            'unsuspend_user',
            'reset_interview_eligibility',
            'mark_repeat_offender',
            'unmark_repeat_offender',

            // Admin actions
            'create_admin',
            'deactivate_admin',
            'update_admin_permissions',

            // System actions
            'export_data',
            'view_audit_logs',
            'admin_login',
            'admin_logout',
            'password_reset'
        ],
        required: true
    },
    targetType: {
        type: String,
        enum: ['interview', 'user', 'admin', 'system'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetType'
    },
    targetEmail: String, // For user/admin targets
    previousValue: {
        type: mongoose.Schema.Types.Mixed
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed
    },
    reason: {
        type: String,
        maxlength: 1000
    },
    metadata: {
        interviewScore: Number,
        adjustedScore: Number,
        cheatingFlagsCount: Number,
        riskLevel: String
    },
    ipAddress: String,
    userAgent: String,
    sessionId: String
}, {
    timestamps: { createdAt: true, updatedAt: false } // Immutable - no updates allowed
});

// Prevent updates to audit logs
auditLogSchema.pre('updateOne', function (next) {
    const error = new Error('Audit logs cannot be modified');
    next(error);
});

auditLogSchema.pre('findOneAndUpdate', function (next) {
    const error = new Error('Audit logs cannot be modified');
    next(error);
});

// Static method to create audit log entry
auditLogSchema.statics.log = async function (data) {
    try {
        const log = new this(data);
        await log.save();
        return log;
    } catch (error) {
        console.error('Audit log creation failed:', error);
        // Don't throw - audit logging should not break main flow
        return null;
    }
};

// Static method to get logs with pagination
auditLogSchema.statics.getLogs = async function (options = {}) {
    const {
        page = 1,
        limit = 50,
        adminId,
        action,
        targetType,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = options;

    const query = {};

    if (adminId) query.adminId = adminId;
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [logs, total] = await Promise.all([
        this.find(query)
            .populate('adminId', 'name email')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

auditLogSchema.index({ adminId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
