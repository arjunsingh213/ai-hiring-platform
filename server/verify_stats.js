const mongoose = require('mongoose');
require('dotenv').config();
const aiUsageService = require('./services/ai/aiUsageService');
const connectDB = require('./config/database');

async function test() {
    try {
        await connectDB();
        console.log('Connected to DB');

        console.log('--- AI Global Stats ---');
        const stats = await aiUsageService.getGlobalStats();
        console.log(JSON.stringify(stats, null, 2));

        console.log('\n--- AI Activity ---');
        const activity = await aiUsageService.getRecentActivity(10);
        console.log(JSON.stringify(activity, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

test();
