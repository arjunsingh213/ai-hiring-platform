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
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email to user
 * @access  Public
 */
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Please provide an email address'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if user exists for security
            return res.json({
                success: true,
                message: 'If an account with that email exists, a new verification email has been sent.'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                error: 'This email is already verified. Please login.'
            });
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        await user.save();

        // Send new verification email
        await sendVerificationEmail(user, verificationToken);

        res.json({
            success: true,
            message: 'Verification email sent successfully!'
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send verification email. Please try again.'
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

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset OTP to email
 * @access  Public
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Please provide an email address'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({
                success: true,
                message: 'If an account with that email exists, an OTP has been sent.'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP and expiry (10 minutes)
        user.passwordResetOTP = otp;
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        // Send OTP email
        const { sendPasswordResetOTP } = require('../utils/email');
        await sendPasswordResetOTP(user, otp);

        res.json({
            success: true,
            message: 'If an account with that email exists, an OTP has been sent.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process request. Please try again.'
        });
    }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify the OTP for password reset
 * @access  Public
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email and OTP'
            });
        }

        const user = await User.findOne({
            email,
            passwordResetOTP: otp,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired OTP'
            });
        }

        // Generate a temporary reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = resetToken;
        await user.save();

        res.json({
            success: true,
            data: { resetToken },
            message: 'OTP verified successfully'
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with verified token
 * @access  Public
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;

        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email, reset token, and new password'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }

        const user = await User.findOne({
            email,
            passwordResetToken: resetToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token. Please start over.'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear reset fields
        user.passwordResetOTP = undefined;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save();

        res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/send-work-email-otp
 * @desc    Send OTP to recruiter work email
 * @access  Public (or protected if user is logged in, but safe to be public with user ID)
 */
router.post('/send-work-email-otp', async (req, res) => {
    try {
        const { userId, workEmail, companyName } = req.body;

        if (!userId || !workEmail) {
            return res.status(400).json({ error: 'User ID and work email are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Validate basic domain match if possible, but for now rely on OTP
        // Ensure email is not same as personal email (optional check)
        if (workEmail.toLowerCase() === user.email.toLowerCase()) {
            return res.status(400).json({
                error: 'Work email cannot be the same as your personal login email.'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Update user
        user.recruiterProfile = user.recruiterProfile || {};
        user.recruiterProfile.workEmail = workEmail;
        user.recruiterProfile.workEmailOTP = otp;
        user.recruiterProfile.workEmailOTPExpires = Date.now() + 10 * 60 * 1000; // 10 mins
        user.recruiterProfile.companyName = companyName || user.recruiterProfile.companyName;

        await user.save();

        const { sendWorkEmailOTP } = require('../utils/email');
        await sendWorkEmailOTP(user, workEmail, otp);

        res.json({ success: true, message: 'OTP sent to work email' });
    } catch (error) {
        console.error('Send Work Email OTP error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/auth/verify-work-email-otp
 * @desc    Verify work email OTP
 * @access  Public
 */
router.post('/verify-work-email-otp', async (req, res) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({ error: 'User ID and OTP are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (
            user.recruiterProfile.workEmailOTP !== otp ||
            user.recruiterProfile.workEmailOTPExpires < Date.now()
        ) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Verify
        user.recruiterProfile.workEmailVerified = true;
        user.recruiterProfile.workEmailOTP = undefined;
        user.recruiterProfile.workEmailOTPExpires = undefined;

        await user.save();

        res.json({ success: true, message: 'Work email verified successfully' });
    } catch (error) {
        console.error('Verify Work Email OTP error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
