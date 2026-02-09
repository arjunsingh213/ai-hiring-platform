const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

/**
 * User authentication middleware
 * Verifies JWT token and attaches user to request
 */
const userAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Session expired. Please log in again.',
                    code: 'SESSION_EXPIRED'
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        // Get user from database
        const user = await User.findById(decoded.userId || decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Attach user to request
        req.user = user;
        req.userId = user._id;
        req.token = token;

        next();
    } catch (error) {
        console.error('User auth error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // Continue without auth
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId || decoded.id);
            if (user) {
                req.user = user;
                req.userId = user._id;
                req.token = token;
            }
        } catch (jwtError) {
            // Token invalid, but we don't require it, so continue
        }

        next();
    } catch (error) {
        next(); // Continue without auth on error
    }
};

/**
 * Role-based access control middleware
 * Usage: requireRole('jobseeker') or requireRole('recruiter', 'admin')
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Insufficient permissions.',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

/**
 * Resource ownership middleware
 * Checks if the logged-in user owns the resource
 * Usage: requireOwnership('userId') - checks if req.params.userId matches req.userId
 */
const requireOwnership = (paramName = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const resourceOwnerId = req.params[paramName];
        const currentUserId = req.userId.toString();

        // Skip ownership check for recruiters viewing candidate data (they have read access)
        if (req.user.role === 'recruiter') {
            return next();
        }

        if (resourceOwnerId && resourceOwnerId !== currentUserId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You do not have permission to access this resource.',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

module.exports = {
    userAuth,
    optionalAuth,
    requireRole,
    requireOwnership
};
