
const mongoose = require('mongoose');
const Job = require('./models/Job');
const User = require('./models/User');
require('dotenv').config();

const testFetch = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const recruiterId = '696d1cfc7fd117d1e51bb808';
        console.log('Testing recruiterId:', recruiterId);

        // Test 1: Finding user
        const user = await User.findById(recruiterId);
        console.log('User found:', user ? user.email : 'NOT FOUND');

        // Test 2: Finding jobs by string recruiterId
        const jobsByString = await Job.find({ recruiterId }).lean();
        console.log('Jobs found by string ID:', jobsByString.length);

        // Test 3: Finding jobs by ObjectId
        const jobsByObjectId = await Job.find({ recruiterId: new mongoose.Types.ObjectId(recruiterId) }).lean();
        console.log('Jobs found by ObjectId:', jobsByObjectId.length);

        if (jobsByString.length > 0) {
            console.log('First job found:', jobsByString[0].title, 'Status:', jobsByString[0].status);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

testFetch();
