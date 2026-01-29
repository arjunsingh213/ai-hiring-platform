const mongoose = require('mongoose');
const Interview = require('../models/Interview');
require('dotenv').config({ path: 'server/.env' });

const targetUserId = '6979efaf14d968711bf93fea'; // From previous log

async function listInterviews() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const interviews = await Interview.find({
            userId: targetUserId,
            interviewType: 'platform'
        }).sort({ createdAt: -1 });

        console.log(`Found ${interviews.length} platform interviews for user ${targetUserId}`);

        interviews.forEach(i => {
            console.log(`ID: ${i._id}`);
            console.log(`  Date: ${i.createdAt}`);
            console.log(`  Score: ${i.scoring?.overallScore}`);
            console.log(`  Questions: ${i.questions?.length}`);
            console.log(`  Responses: ${i.responses?.length}`);
            console.log(`  Status: ${i.status}`);
            console.log('---');
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

listInterviews();
