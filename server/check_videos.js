const mongoose = require('mongoose');
const Interview = require('./models/Interview');
const fs = require('fs');
require('dotenv').config();

async function checkInterviews() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        let output = 'Connected to MongoDB\n';

        const total = await Interview.countDocuments();
        const withVideo = await Interview.countDocuments({ 'videoRecording.secureUrl': { $exists: true, $ne: null } });

        output += `Total Interviews: ${total}\n`;
        output += `Interviews with Video: ${withVideo}\n`;

        const samples = await Interview.find({ 'videoRecording.secureUrl': { $exists: true, $ne: null } })
            .limit(5)
            .select('interviewType videoRecording.secureUrl videoRecording.uploadedAt');

        output += 'Sample Video Records:\n' + JSON.stringify(samples, null, 2);

        fs.writeFileSync('video_check_results.txt', output);
        process.exit(0);
    } catch (error) {
        fs.writeFileSync('video_check_results.txt', 'Error: ' + error.message);
        process.exit(1);
    }
}

checkInterviews();
