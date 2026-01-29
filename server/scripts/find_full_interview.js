const mongoose = require('mongoose');
const Interview = require('../models/Interview');
require('dotenv').config({ path: 'server/.env' });

async function findFullInterview() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Find recent platform interview with many questions
        const interview = await Interview.findOne({
            interviewType: 'platform',
            $expr: { $gt: [{ $size: "$questions" }, 10] }
        }).sort({ createdAt: -1 });

        if (interview) {
            console.log(`FOUND FULL INTERVIEW:`);
            console.log(`ID: ${interview._id}`);
            console.log(`User ID: ${interview.userId}`);
            console.log(`Date: ${interview.createdAt}`);
            console.log(`Questions: ${interview.questions.length}`);
            console.log(`Score: ${interview.scoring?.overallScore}`);
        } else {
            console.log('No full platform interview found.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

findFullInterview();
