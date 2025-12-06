const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const getUserId = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Find the job seeker user
        const jobseeker = await User.findOne({ role: 'jobseeker' });

        if (jobseeker) {
            console.log('\n✅ Job Seeker User Found:');
            console.log(`   Name: ${jobseeker.profile?.name || 'No name'}`);
            console.log(`   Email: ${jobseeker.email}`);
            console.log(`   User ID: ${jobseeker._id}`);
            console.log('\n📋 Copy this command and run it in your browser console:');
            console.log(`\n   localStorage.setItem('userId', '${jobseeker._id}');\n`);
            console.log('Then refresh the page!');
        } else {
            console.log('❌ No job seeker user found');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

getUserId();
