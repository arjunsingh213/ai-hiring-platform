const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (disabled in testing mode)
 * @access  Public
 */
router.post('/register', async (req, res) => {
    try {
        const { role, email, password, profile } = req.body;

        // In testing mode, create user without authentication
        const user = new User({
            role,
            email: email || null,
            profile,
            testingMode: true
        });

        await user.save();

        res.status(201).json({
            success: true,
            data: user,
            message: 'User registered successfully (testing mode)'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user (disabled in testing mode)
 * @access  Public
 */
router.post('/login', async (req, res) => {
    try {
        const { email } = req.body;

        // In testing mode, find or create user
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user,
            message: 'Login successful (testing mode)'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
