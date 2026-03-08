require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const googleSheetService = require('./services/googleSheetService');

async function syncAllUsers() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Fetching all users...');
        const users = await User.find({}).lean();
        console.log(`Found ${users.length} users`);

        console.log('Initializing Google Sheets Service...');
        const isInit = await googleSheetService.initialize();
        if (!isInit) {
            console.error('Failed to initialize Google Sheets service');
            process.exit(1);
        }

        console.log('Starting sync (this might take a while if there are many users)...');
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            console.log(`[${i + 1}/${users.length}] Syncing user: ${user.email}`);
            await googleSheetService._syncUserLogic(user); // wait for each to prevent rate limits

            // small delay to prevent rate limits
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log('Sync complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

syncAllUsers();
