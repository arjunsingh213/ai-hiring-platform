const mongoose = require('mongoose');
require('dotenv').config();
const AIUsage = require('./models/AIUsage');
const connectDB = require('./config/database');

async function check() {
    await connectDB();
    console.log('--- AI Usage Records ---');
    const count = await AIUsage.countDocuments();
    console.log('Total Records:', count);

    const aiUsageService = require('./services/ai/aiUsageService');
    console.log('\n--- AI Global Stats ---');
    const stats = await aiUsageService.getGlobalStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n--- AI Recent Activity ---');
    const activity = await aiUsageService.getRecentActivity(5);
    console.log(JSON.stringify(activity, null, 2));

    process.exit(0);
}

check();
