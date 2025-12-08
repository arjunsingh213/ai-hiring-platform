const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/email');
const { getIO } = require('../config/socket');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
    try {
        const { role, email, password, profile } = req.body;

        // Validation
        if (!email || !password || !role) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email, password, and role'
            });
        }

        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
            // If user exists AND is verified, block them
            if (user.isVerified) {
                return res.status(400).json({
                    success: false,
                    error: 'User already exists with this email'
                });
            }

            // If user exists but NOT verified, we overwrite/update their info
            console.log(`Overwriting unverified user: ${email}`);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        if (user) {
            // Update existing unverified user
            user.role = role;
            user.password = hashedPassword;
            user.profile = profile || {};
            user.verificationToken = verificationToken;
        } else {
            // Create new user
            user = new User({
                role,
                email,
                password: hashedPassword,
                profile: profile || {},
                isVerified: false,
                verificationToken,
                testingMode: false
            });
        }

        await user.save();

        // Send verification email
        await sendVerificationEmail(user, verificationToken);

        res.status(201).json({
            success: true,
            data: {
                userId: user._id, // Return userId so frontend can listen for events
                message: 'Registration successful! Please check your email to verify your account.'
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify user email
 * @access  Public
 */
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Invalid token'
            });
        }

        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification link'
            });
        }

        // Verify user
        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        // Generate JWT token
        const jwtToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
            { expiresIn: '7d' }
        );

        // Emit socket event to notify other tabs (e.g., SignupPage)
        try {
            const io = getIO();
            const roomName = user._id.toString();
            console.log(`[Socket Debug] Attempting to emit 'email_verified' to room: ${roomName}`);

            // Check if room has members (optional, for debug)
            const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
            console.log(`[Socket Debug] Audience size for room ${roomName} is: ${roomSize}`);

            // Emit to a room named by userID (client should join this room)
            io.to(roomName).emit('email_verified', {
                success: true,
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role,
                    profile: user.profile,
                    isOnboardingComplete: user.isOnboardingComplete
                },
                token: jwtToken
            });
            console.log(`[Socket Debug] Emitted 'email_verified' event for user ${user._id}`);
        } catch (socketError) {
            console.error('Socket emission error:', socketError);
            // Don't fail the request if socket fails
        }

        res.json({
            success: true,
            data: {
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role,
                    profile: user.profile,
                    isOnboardingComplete: user.isOnboardingComplete
                },
                token: jwtToken
            },
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email and password'
            });
        }

        // Find user and explicitly include password field
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check verification status
        if (!user.isVerified && !user.testingMode) {
            return res.status(403).json({
                success: false,
                error: 'Please verify your email address before logging in',
                isUnverified: true // Flag for frontend to show resend link if needed
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            data: {
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role,
                    profile: user.profile,
                    isOnboardingComplete: user.isOnboardingComplete
                },
                token
            },
            message: 'Login successful'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
