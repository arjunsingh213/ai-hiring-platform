require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Interview = require('./models/Interview');

async function check() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-hiring';
        await mongoose.connect(uri);

        const stats = await Interview.aggregate([
            {
                $group: {
                    _id: {
                        status: '$status',
                        adminStatus: '$adminReview.status'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log('Interview Status Distribution:');
        stats.forEach(s => {
            console.log(`Status: ${s._id.status}, AdminStatus: ${s._id.adminStatus} => Count: ${s.count}`);
        });

        const recent = await Interview.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'email profile');
        console.log('\nMost Recent Interviews:');
        recent.forEach(i => {
            console.log(`ID: ${i._id}, Type: ${i.interviewType}, Status: ${i.status}, AdminStatus: ${i.adminReview?.status}, User: ${i.userId?.email || 'N/A'}, Name: ${i.userId?.profile?.name || 'N/A'}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
