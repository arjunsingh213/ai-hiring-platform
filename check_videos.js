const mongoose = require('mongoose');
const Interview = require('./server/models/Interview');
require('dotenv').config();

async function checkInterviews() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const total = await Interview.countDocuments();
        const withVideo = await Interview.countDocuments({ 'videoRecording.secureUrl': { $exists: true, $ne: null } });

        console.log(`Total Interviews: ${total}`);
        console.log(`Interviews with Video: ${withVideo}`);

        const samples = await Interview.find({ 'videoRecording.secureUrl': { $exists: true, $ne: null } })
            .limit(5)
            .select('interviewType videoRecording.secureUrl videoRecording.uploadedAt');

        console.log('Sample Video Records:', JSON.stringify(samples, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkInterviews();
