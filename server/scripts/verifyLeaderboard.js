const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to Atlas');

        const aiEngCount = await User.countDocuments({ 'jobSeekerProfile.jobDomains': 'AI Engineer' });
        console.log('AI Engineer Domain Count:', aiEngCount);

        const users = await User.find({ 'jobSeekerProfile.jobDomains': 'AI Engineer' });
        users.forEach(u => {
            console.log(`- ${u.profile.name} (Score: ${u.aiTalentPassport?.talentScore})`);
            console.log(`  Domains: ${u.jobSeekerProfile.jobDomains}`);
        });

        const totalJobseekersWithScore = await User.countDocuments({ role: 'jobseeker', 'aiTalentPassport.talentScore': { $gt: 0 } });
        console.log('Total Jobseekers with Score > 0:', totalJobseekersWithScore);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

verify();
