
const mongoose = require('mongoose');
const Job = require('./models/Job');
const User = require('./models/User');
require('dotenv').config();

const migrateJob = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const oldRecruiterId = '696d1cfc7fd117d1e51bb808'; // arjunsingh73309@gmail.com
        const newRecruiterId = '696b64181e21819ad3f83b41'; // arjunthakur73308@gmail.com (Cognizant)

        console.log('--- Job Migration Started ---');
        console.log(`From: ${oldRecruiterId}`);
        console.log(`To:   ${newRecruiterId}`);

        const result = await Job.updateMany(
            { recruiterId: new mongoose.Types.ObjectId(oldRecruiterId) },
            { $set: { recruiterId: new mongoose.Types.ObjectId(newRecruiterId) } }
        );

        console.log(`Successfully migrated ${result.modifiedCount} jobs.`);

        // Verify
        const updatedJobs = await Job.find({ recruiterId: newRecruiterId });
        console.log('Jobs now owned by Cognizant:', updatedJobs.map(j => j.title));

        await mongoose.disconnect();
        console.log('--- Migration Finished ---');
    } catch (err) {
        console.error('Migration failed:', err);
    }
};

migrateJob();
