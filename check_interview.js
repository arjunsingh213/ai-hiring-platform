const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function checkInterview() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully!');

        // Query for the specific interview
        const interviewId = '698a4e076fc8238d04a78a71';
        const interview = await mongoose.connection.db.collection('interviews')
            .findOne({ _id: new mongoose.Types.ObjectId(interviewId) });

        if (interview) {
            console.log('\n✅ Interview FOUND:');
            console.log('  - ID:', interview._id);
            console.log('  - Status:', interview.status);
            console.log('  - UserId:', interview.userId);
            console.log('  - CreatedAt:', interview.createdAt);
        } else {
            console.log('\n❌ Interview NOT FOUND in database');

            // Check total interviews count
            const totalCount = await mongoose.connection.db.collection('interviews').countDocuments();
            console.log(`  - Total interviews in DB: ${totalCount}`);

            // Get latest 3 interviews
            const latestInterviews = await mongoose.connection.db.collection('interviews')
                .find({})
                .sort({ createdAt: -1 })
                .limit(3)
                .toArray();

            console.log('\n  Latest Interviews:');
            latestInterviews.forEach((i, idx) => {
                console.log(`    ${idx + 1}. ID: ${i._id}, Status: ${i.status}, Created: ${i.createdAt}`);
            });
        }

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkInterview();
