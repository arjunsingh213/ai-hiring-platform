const mongoose = require('mongoose');
const Interview = require('../models/Interview');
require('dotenv').config({ path: 'server/.env' });

async function inspectInterview() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const interview = await Interview.findById('697b4641f5d8800630921347');
        console.log('Scoring Object:', JSON.stringify(interview.scoring, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

inspectInterview();
