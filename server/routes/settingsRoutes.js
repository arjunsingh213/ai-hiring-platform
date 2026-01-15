/**
 * Settings Routes
 * Handles all user settings: notifications, privacy, security, account management
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// ==================== GET SETTINGS ====================
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select(
            'notificationSettings connections.profileVisibility connections.showEmail connections.showPhone settings security.twoFactorEnabled security.sessions security.loginHistory email'
        );

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                email: user.email,
                notifications: {
                    email: user.notificationSettings?.emailNotifications ?? true,
                    push: user.notificationSettings?.pushNotifications ?? true,
                    jobAlerts: user.notificationSettings?.notifyOnFollow ?? true,
                    messageAlerts: user.notificationSettings?.notifyOnMessage ?? true
                },
                privacy: {
                    profileVisibility: user.connections?.profileVisibility || 'public',
                    showEmail: user.connections?.showEmail || false,
                    showPhone: user.connections?.showPhone || false
                },
                security: {
                    twoFactorEnabled: user.security?.twoFactorEnabled || false
                },
                language: user.settings?.language || 'en'
            }
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== SAVE SETTINGS (notifications/privacy) ====================
router.put('/:userId', async (req, res) => {
    try {
        const { notifications, privacy, language } = req.body;

        const updateData = {};

        if (notifications) {
            updateData['notificationSettings.emailNotifications'] = notifications.email;
            updateData['notificationSettings.pushNotifications'] = notifications.push;
            updateData['notificationSettings.notifyOnFollow'] = notifications.jobAlerts;
            updateData['notificationSettings.notifyOnMessage'] = notifications.messageAlerts;
        }

        if (privacy) {
            updateData['connections.profileVisibility'] = privacy.profileVisibility;
            updateData['connections.showEmail'] = privacy.showEmail;
            updateData['connections.showPhone'] = privacy.showPhone;
        }

        if (language) {
            updateData['settings.language'] = language;
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: updateData },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== CHANGE EMAIL ====================
router.put('/:userId/email', async (req, res) => {
    try {
        const { newEmail, password } = req.body;

        if (!newEmail || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser && existingUser._id.toString() !== req.params.userId) {
            return res.status(400).json({ success: false, error: 'Email already in use' });
        }

        // Verify current password
        const user = await User.findById(req.params.userId).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Incorrect password' });
        }

        // Update email
        user.email = newEmail;
        await user.save();

        res.json({ success: true, message: 'Email updated successfully' });
    } catch (error) {
        console.error('Change email error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== CHANGE PASSWORD ====================
router.put('/:userId/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.params.userId).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== DELETE ACCOUNT ====================
router.delete('/:userId', async (req, res) => {
    try {
        const { password } = req.body;

        const user = await User.findById(req.params.userId).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Verify password if provided (for security)
        if (password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, error: 'Incorrect password' });
            }
        }

        // Delete user and all related data
        await User.findByIdAndDelete(req.params.userId);

        // TODO: Delete related data (applications, messages, posts, etc.)

        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 2FA - ENABLE (Generate Secret) ====================
router.post('/:userId/2fa/enable', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `Froscel (${user.email})`,
            length: 20
        });

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Save secret temporarily (not enabled until verified)
        user.security = user.security || {};
        user.security.twoFactorSecret = secret.base32;
        await user.save();

        res.json({
            success: true,
            data: {
                secret: secret.base32,
                qrCode: qrCodeUrl
            }
        });
    } catch (error) {
        console.error('2FA enable error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 2FA - VERIFY AND ACTIVATE ====================
router.post('/:userId/2fa/verify', async (req, res) => {
    try {
        const { token } = req.body;

        const user = await User.findById(req.params.userId).select('+security.twoFactorSecret');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (!user.security?.twoFactorSecret) {
            return res.status(400).json({ success: false, error: '2FA setup not initiated' });
        }

        // Verify token
        const verified = speakeasy.totp.verify({
            secret: user.security.twoFactorSecret,
            encoding: 'base32',
            token: token
        });

        if (!verified) {
            return res.status(400).json({ success: false, error: 'Invalid verification code' });
        }

        // Enable 2FA
        user.security.twoFactorEnabled = true;
        await user.save();

        res.json({ success: true, message: '2FA enabled successfully' });
    } catch (error) {
        console.error('2FA verify error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 2FA - DISABLE ====================
router.post('/:userId/2fa/disable', async (req, res) => {
    try {
        const { password } = req.body;

        const user = await User.findById(req.params.userId).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Incorrect password' });
        }

        user.security = user.security || {};
        user.security.twoFactorEnabled = false;
        user.security.twoFactorSecret = null;
        await user.save();

        res.json({ success: true, message: '2FA disabled successfully' });
    } catch (error) {
        console.error('2FA disable error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== GET ACTIVE SESSIONS ====================
router.get('/:userId/sessions', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('security.sessions');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            data: user.security?.sessions || []
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== LOGOUT ALL SESSIONS ====================
router.delete('/:userId/sessions', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        user.security = user.security || {};
        user.security.sessions = [];
        await user.save();

        res.json({ success: true, message: 'All sessions logged out' });
    } catch (error) {
        console.error('Logout sessions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== GET LOGIN HISTORY ====================
router.get('/:userId/login-history', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('security.loginHistory');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Return last 20 login attempts
        const history = (user.security?.loginHistory || []).slice(-20).reverse();

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Get login history error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
