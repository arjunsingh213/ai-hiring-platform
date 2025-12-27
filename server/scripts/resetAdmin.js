/**
 * Reset Admin - Delete existing admin and create new one
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function resetAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        // Delete all admins
        const deleted = await Admin.deleteMany({});
        console.log(`Deleted ${deleted.deletedCount} admin(s)`);

        // Create new admin
        const permissions = Admin.getDefaultPermissions('super_admin');
        const admin = new Admin({
            email: 'admin@aihiring.com',
            password: 'Admin@2024!',
            name: 'System Administrator',
            role: 'super_admin',
            permissions: permissions,
            isActive: true,
            mustResetPassword: false // No reset required for testing
        });

        await admin.save();
        console.log('\nAdmin created successfully!');
        console.log('Email: admin@aihiring.com');
        console.log('Password: Admin@2024!');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetAdmin();
