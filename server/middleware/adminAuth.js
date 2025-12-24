const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');

// Admin JWT secret (separate from user secret)
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET + '_admin';
const ADMIN_TOKEN_EXPIRY = '8h';
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Generate admin JWT token
 */
const generateAdminToken = (admin) => {
    return jwt.sign(
        {
            adminId: admin._id,
            email: admin.email,
            role: admin.role,
            type: 'admin' // Distinguish from user tokens
        },
        ADMIN_JWT_SECRET,
        { expiresIn: ADMIN_TOKEN_EXPIRY }
    );
};

/**
 * Admin authentication middleware
 */
const adminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Admin authentication required',
                code: 'ADMIN_AUTH_REQUIRED'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, ADMIN_JWT_SECRET);
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Admin session expired',
                    code: 'ADMIN_SESSION_EXPIRED'
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Invalid admin token',
                code: 'INVALID_ADMIN_TOKEN'
            });
        }

        // Verify it's an admin token
        if (decoded.type !== 'admin') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token type',
                code: 'INVALID_TOKEN_TYPE'
            });
        }

        // Get admin from database
        const admin = await Admin.findById(decoded.adminId);

        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin not found',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Admin account is deactivated',
                code: 'ADMIN_DEACTIVATED'
            });
        }

        // Check for inactivity
        if (admin.lastActivity) {
            const timeSinceActivity = Date.now() - new Date(admin.lastActivity).getTime();
            if (timeSinceActivity > INACTIVITY_TIMEOUT) {
                return res.status(401).json({
                    success: false,
                    error: 'Session expired due to inactivity',
                    code: 'INACTIVITY_TIMEOUT'
                });
            }
        }

        // Update last activity
        await Admin.findByIdAndUpdate(admin._id, { lastActivity: new Date() });

        // Attach admin to request
        req.admin = admin;
        req.adminToken = token;

        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Check if admin has required permission
 */
const requirePermission = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin authentication required',
                code: 'ADMIN_AUTH_REQUIRED'
            });
        }

        // Super admin has all permissions
        if (req.admin.role === 'super_admin') {
            return next();
        }

        // Check if admin has at least one of the required permissions
        const hasPermission = requiredPermissions.some(
            perm => req.admin.permissions.includes(perm)
        );

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: requiredPermissions
            });
        }

        next();
    };
};

/**
 * Audit logging helper
 */
const auditLog = async (req, action, targetType, targetId, data = {}) => {
    try {
        await AuditLog.log({
            adminId: req.admin._id,
            adminEmail: req.admin.email,
            action,
            targetType,
            targetId,
            previousValue: data.previousValue,
            newValue: data.newValue,
            reason: data.reason,
            metadata: data.metadata,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
            sessionId: req.adminToken
        });
    } catch (error) {
        console.error('Audit log error:', error);
        // Don't throw - audit logging should not break main flow
    }
};

/**
 * Rate limiting for admin endpoints
 */
const adminRateLimits = new Map();

const adminRateLimiter = (maxRequests = 100, windowMs = 60000) => {
    return (req, res, next) => {
        const key = req.admin ? req.admin._id.toString() : req.ip;
        const now = Date.now();

        if (!adminRateLimits.has(key)) {
            adminRateLimits.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        const limit = adminRateLimits.get(key);

        if (now > limit.resetAt) {
            adminRateLimits.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (limit.count >= maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Too many requests',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((limit.resetAt - now) / 1000)
            });
        }

        limit.count++;
        next();
    };
};

module.exports = {
    generateAdminToken,
    adminAuth,
    requirePermission,
    auditLog,
    adminRateLimiter,
    ADMIN_JWT_SECRET,
    ADMIN_TOKEN_EXPIRY
};
