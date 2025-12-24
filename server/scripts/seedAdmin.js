/**
 * Admin Seed Script
 * 
 * Creates the first admin account if no admin exists.
 * Run with: node server/scripts/seedAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import Admin model
const Admin = require('../models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-interview-platform';

// Default admin credentials (should be changed on first login)
const DEFAULT_ADMIN = {
    email: 'admin@aihiring.com',
    password: 'Admin@2024!', // Strong default password
    name: 'System Administrator',
    role: 'super_admin'
};

async function seedAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if any admin exists
        const existingAdmin = await Admin.findOne();

        if (existingAdmin) {
            console.log('Admin account already exists. Seed skipped.');
            console.log(`Existing admin email: ${existingAdmin.email}`);
            process.exit(0);
        }

        // Get default permissions for super_admin
        const permissions = Admin.getDefaultPermissions('super_admin');

        // Create the first admin
        const admin = new Admin({
            email: DEFAULT_ADMIN.email,
            password: DEFAULT_ADMIN.password, // Will be hashed by pre-save hook
            name: DEFAULT_ADMIN.name,
            role: DEFAULT_ADMIN.role,
            permissions: permissions,
            isActive: true,
            mustResetPassword: true // Force password reset on first login
        });

        await admin.save();

        console.log('\n========================================');
        console.log('First admin account created successfully!');
        console.log('========================================');
        console.log(`Email: ${DEFAULT_ADMIN.email}`);
        console.log(`Password: ${DEFAULT_ADMIN.password}`);
        console.log(`Role: ${DEFAULT_ADMIN.role}`);
        console.log('\nIMPORTANT: Password reset will be required on first login.');
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

// Allow running directly
if (require.main === module) {
    seedAdmin();
}

module.exports = seedAdmin;
