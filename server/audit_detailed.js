const mongoose = require('mongoose');
const Interview = require('./models/Interview');
const fs = require('fs');
require('dotenv').config();

async function checkInterviews() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        let output = 'Detailed Interview Audit\n';

        const counts = await Interview.aggregate([
            {
                $group: {
                    _id: { $toLower: "$interviewType" },
                    originalNames: { $addToSet: "$interviewType" },
                    total: { $sum: 1 },
                    withVideo: {
                        $sum: {
                            $cond: [{ $ifNull: ["$videoRecording.secureUrl", false] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        output += JSON.stringify(counts, null, 2);

        fs.writeFileSync('detailed_audit.txt', output);
        process.exit(0);
    } catch (error) {
        fs.writeFileSync('detailed_audit.txt', 'Error: ' + error.message);
        process.exit(1);
    }
}

checkInterviews();
