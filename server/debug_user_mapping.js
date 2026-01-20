
const mongoose = require('mongoose');
const User = require('./models/User');
const Job = require('./models/Job');
require('dotenv').config();

const debugMapping = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const recruiterId = '696d1cfc7fd117d1e51bb808';
        const user = await User.findById(recruiterId);

        console.log('--- Target Recruiter Debug ---');
        console.log('ID:', recruiterId);
        console.log('Email:', user?.email);
        console.log('Company (Profile):', user?.profile?.company);

        const jobs = await Job.find({ recruiterId });
        console.log('Jobs for this ID:', jobs.map(j => j.title));

        console.log('\n--- All Recruiter Users ---');
        const recruiters = await User.find({ role: 'recruiter' });
        recruiters.forEach(r => {
            console.log(`- ${r.profile?.name || 'No Name'} (${r.profile?.company || 'No Company'}) | ID: ${r._id}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

debugMapping();
