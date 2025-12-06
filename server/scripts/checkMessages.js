const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
require('dotenv').config();

const checkMessages = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📡 Connected to MongoDB\n');

        // Get all users
        const users = await User.find().select('email role profile.name');
        console.log('👥 Users in database:');
        users.forEach(u => console.log(`  - ${u.email} (${u.role}) - ${u.profile?.name || 'No name'} - ID: ${u._id}`));

        // Get all messages
        const messages = await Message.find().populate('senderId recipientId');
        console.log(`\n💬 Total messages: ${messages.length}`);

        if (messages.length > 0) {
            console.log('\nMessages:');
            messages.forEach((m, i) => {
                console.log(`${i + 1}. From: ${m.senderId?.email} → To: ${m.recipientId?.email}`);
                console.log(`   Content: ${m.content.substring(0, 50)}...`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkMessages();
