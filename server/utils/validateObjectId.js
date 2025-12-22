/**
 * MongoDB ObjectId Validation Utility
 * Industry-standard validation for MongoDB ObjectId parameters
 */

const mongoose = require('mongoose');

/**
 * Check if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid ObjectId format
 */
const isValidObjectId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return mongoose.Types.ObjectId.isValid(id) &&
        new mongoose.Types.ObjectId(id).toString() === id;
};

/**
 * Express middleware to validate ObjectId in request params
 * Usage: router.get('/:id', validateObjectId('id'), handler)
 * @param {string} paramName - The name of the param to validate
 */
const validateObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: `Invalid ${paramName}: must be a valid MongoDB ObjectId`,
                code: 'INVALID_OBJECT_ID'
            });
        }

        next();
    };
};

/**
 * Express middleware to validate ObjectId in request query
 * Usage: router.get('/', validateQueryObjectId('userId'), handler)
 * @param {string} paramName - The name of the query param to validate
 * @param {boolean} required - Whether the param is required
 */
const validateQueryObjectId = (paramName, required = true) => {
    return (req, res, next) => {
        const id = req.query[paramName];

        // If not required and not provided, skip validation
        if (!required && !id) {
            return next();
        }

        // If required but not provided
        if (required && !id) {
            return res.status(400).json({
                success: false,
                error: `${paramName} is required`,
                code: 'MISSING_PARAMETER'
            });
        }

        // Validate format
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: `Invalid ${paramName}: must be a valid MongoDB ObjectId`,
                code: 'INVALID_OBJECT_ID'
            });
        }

        next();
    };
};

/**
 * Express middleware to validate ObjectId in request body
 * Usage: router.post('/', validateBodyObjectId('userId'), handler)
 * @param {string} paramName - The name of the body field to validate
 * @param {boolean} required - Whether the field is required
 */
const validateBodyObjectId = (paramName, required = true) => {
    return (req, res, next) => {
        const id = req.body[paramName];

        // If not required and not provided, skip validation
        if (!required && !id) {
            return next();
        }

        // If required but not provided
        if (required && !id) {
            return res.status(400).json({
                success: false,
                error: `${paramName} is required in request body`,
                code: 'MISSING_PARAMETER'
            });
        }

        // Validate format
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: `Invalid ${paramName}: must be a valid MongoDB ObjectId`,
                code: 'INVALID_OBJECT_ID'
            });
        }

        next();
    };
};

module.exports = {
    isValidObjectId,
    validateObjectId,
    validateQueryObjectId,
    validateBodyObjectId
};
