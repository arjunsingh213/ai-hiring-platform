const mongoose = require('mongoose');
const Interview = require('./models/Interview');
const fs = require('fs');
require('dotenv').config();

async function checkInterviews() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        let output = 'Connected to MongoDB\n';

        const counts = await Interview.aggregate([
            {
                $group: {
                    _id: "$interviewType",
                    total: { $sum: 1 },
                    withVideo: {
                        $sum: {
                            $cond: [{ $ifNull: ["$videoRecording.secureUrl", false] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        output += 'Interview Stats by Type:\n' + JSON.stringify(counts, null, 2);

        fs.writeFileSync('video_check_results_detailed.txt', output);
        process.exit(0);
    } catch (error) {
        fs.writeFileSync('video_check_results_detailed.txt', 'Error: ' + error.message);
        process.exit(1);
    }
}

checkInterviews();
