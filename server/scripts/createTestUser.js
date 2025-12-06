const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const createTestUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📡 Connected to MongoDB');

        // Delete existing test user
        await User.deleteOne({ email: 'test@jobseeker.com' });
        console.log('🗑️  Deleted old test user');

        // Create new user with properly hashed password
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const user = await User.create({
            email: 'test@jobseeker.com',
            password: hashedPassword,
            role: 'jobseeker',
            profile: {
                name: 'Test User'
            }
        });

        console.log('✅ Created test user:');
        console.log('   Email: test@jobseeker.com');
        console.log('   Password: password123');
        console.log('   User ID:', user._id);
        console.log('\n🎉 You can now login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createTestUser();
