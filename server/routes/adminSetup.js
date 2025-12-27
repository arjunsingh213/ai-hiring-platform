/**
 * Admin Setup API Route
 * Allows initializing admin via API call (for serverless environments like Vercel)
 * Protected by secret key
 */

const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');

// Secret key for admin setup - should match ADMIN_SETUP_SECRET env variable
const SETUP_SECRET = process.env.ADMIN_SETUP_SECRET || 'your-super-secret-setup-key-2024';

/**
 * POST /api/admin-setup/initialize
 * Initialize/reset admin account (protected by secret)
 */
router.post('/initialize', async (req, res) => {
    try {
        const { secret, email, password, name } = req.body;

        // Verify secret key
        if (secret !== SETUP_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'Invalid setup secret'
            });
        }

        // Use provided credentials or defaults
        const adminEmail = email || 'admin@aihiring.com';
        const adminPassword = password || 'Admin@2024!';
        const adminName = name || 'System Administrator';

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: adminEmail });

        if (existingAdmin) {
            return res.json({
                success: true,
                message: 'Admin already exists',
                data: {
                    email: existingAdmin.email,
                    name: existingAdmin.name,
                    role: existingAdmin.role,
                    createdAt: existingAdmin.createdAt
                }
            });
        }

        // Create new admin
        const permissions = Admin.getDefaultPermissions('super_admin');
        const admin = new Admin({
            email: adminEmail,
            password: adminPassword,
            name: adminName,
            role: 'super_admin',
            permissions: permissions,
            isActive: true,
            mustResetPassword: false
        });

        await admin.save();

        console.log(`✅ Admin initialized: ${adminEmail}`);

        res.json({
            success: true,
            message: 'Admin created successfully',
            data: {
                email: admin.email,
                name: admin.name,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Admin setup error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/admin-setup/reset
 * Reset admin password (protected by secret)
 */
router.post('/reset', async (req, res) => {
    try {
        const { secret, email, newPassword } = req.body;

        // Verify secret key
        if (secret !== SETUP_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'Invalid setup secret'
            });
        }

        if (!email || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Email and new password required'
            });
        }

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found'
            });
        }

        admin.password = newPassword;
        admin.mustResetPassword = false;
        await admin.save();

        console.log(`✅ Admin password reset: ${email}`);

        res.json({
            success: true,
            message: 'Admin password reset successfully'
        });
    } catch (error) {
        console.error('Admin reset error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin-setup/check
 * Check if any admin exists (no secret required)
 */
router.get('/check', async (req, res) => {
    try {
        const adminCount = await Admin.countDocuments();
        const hasAdmin = adminCount > 0;

        res.json({
            success: true,
            data: {
                hasAdmin,
                adminCount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
