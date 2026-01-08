/**
 * Seed Messages Script
 * Populates the database with realistic conversations between recruiters and job seekers
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Message = require('../models/Message');

const seedMessages = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get existing users
        const jobSeekers = await User.find({ role: 'jobseeker' }).limit(5);
        const recruiters = await User.find({ role: 'recruiter' }).limit(3);

        if (jobSeekers.length === 0 || recruiters.length === 0) {
            console.log('⚠️  No users found. Please ensure users exist first.');
            return;
        }

        console.log(`Found ${jobSeekers.length} job seekers and ${recruiters.length} recruiters`);

        // Clear existing messages (optional - comment out to keep existing)
        await Message.deleteMany({});
        console.log('🗑️  Cleared existing messages');

        const now = new Date();
        const messages = [];

        // Helper to create timestamp offsets
        const daysAgo = (days) => new Date(now - days * 24 * 60 * 60 * 1000);
        const hoursAgo = (hours) => new Date(now - hours * 60 * 60 * 1000);
        const minutesAgo = (minutes) => new Date(now - minutes * 60 * 1000);

        // Conversation 1: Recruiter 1 → Job Seeker 1 (Recent, about job opportunity)
        if (recruiters[0] && jobSeekers[0]) {
            messages.push(
                {
                    senderId: recruiters[0]._id,
                    recipientId: jobSeekers[0]._id,
                    content: `Hi ${jobSeekers[0].profile?.name || 'there'}! I came across your profile and I'm impressed by your background. We have an exciting opportunity for a Senior Full Stack Developer role. Would you be interested in learning more?`,
                    read: true,
                    readAt: hoursAgo(2),
                    createdAt: daysAgo(2)
                },
                {
                    senderId: jobSeekers[0]._id,
                    recipientId: recruiters[0]._id,
                    content: `Hello! Thank you for reaching out. Yes, I'd definitely be interested in hearing more about the position. What are the key requirements?`,
                    read: true,
                    readAt: hoursAgo(1),
                    createdAt: daysAgo(1) + 1000
                },
                {
                    senderId: recruiters[0]._id,
                    recipientId: jobSeekers[0]._id,
                    content: `Great! We're looking for someone with 5+ years of experience in React, Node.js, and MongoDB. The role is fully remote with a competitive salary range of $120k-$180k. The team is working on cutting-edge AI-powered applications.`,
                    read: true,
                    readAt: minutesAgo(45),
                    createdAt: daysAgo(1) + 2000
                },
                {
                    senderId: jobSeekers[0]._id,
                    recipientId: recruiters[0]._id,
                    content: `That sounds perfect! I have 6 years of experience with the MERN stack and I've been working on AI/ML integration in my current role. When would be a good time to discuss this further?`,
                    read: true,
                    readAt: minutesAgo(30),
                    createdAt: minutesAgo(120)
                },
                {
                    senderId: recruiters[0]._id,
                    recipientId: jobSeekers[0]._id,
                    content: `Excellent! How about tomorrow at 2 PM for a quick call? I can send you a calendar invite. Also, I'd love to see your portfolio or any recent projects you've worked on.`,
                    read: false,
                    createdAt: minutesAgo(5)
                }
            );
        }

        // Conversation 2: Recruiter 2 → Job Seeker 2 (Older conversation)
        if (recruiters[1] && jobSeekers[1]) {
            messages.push(
                {
                    senderId: recruiters[1]._id,
                    recipientId: jobSeekers[1]._id,
                    content: `Hi! Your interview results were impressive - 85/100! We'd like to move forward with your application for the Frontend Developer position.`,
                    read: true,
                    readAt: daysAgo(5),
                    createdAt: daysAgo(7)
                },
                {
                    senderId: jobSeekers[1]._id,
                    recipientId: recruiters[1]._id,
                    content: `Thank you so much! I'm really excited about this opportunity. What are the next steps?`,
                    read: true,
                    readAt: daysAgo(4),
                    createdAt: daysAgo(6)
                },
                {
                    senderId: recruiters[1]._id,
                    recipientId: jobSeekers[1]._id,
                    content: `The next step would be a technical interview with our engineering team. Are you available next week?`,
                    read: true,
                    readAt: daysAgo(3),
                    createdAt: daysAgo(5)
                }
            );
        }

        // Conversation 3: Job Seeker 3 → Recruiter 1 (Initiated by job seeker)
        if (jobSeekers[2] && recruiters[0]) {
            messages.push(
                {
                    senderId: jobSeekers[2]._id,
                    recipientId: recruiters[0]._id,
                    content: `Hello! I applied for the UI/UX Designer position last week. I wanted to follow up on my application status.`,
                    read: true,
                    readAt: daysAgo(3),
                    createdAt: daysAgo(4)
                },
                {
                    senderId: recruiters[0]._id,
                    recipientId: jobSeekers[2]._id,
                    content: `Hi! Thanks for following up. We're currently reviewing applications and will get back to you by the end of this week. Your portfolio looks great!`,
                    read: true,
                    readAt: daysAgo(2),
                    createdAt: daysAgo(3)
                },
                {
                    senderId: jobSeekers[2]._id,
                    recipientId: recruiters[0]._id,
                    content: `Thank you for the update! Looking forward to hearing from you.`,
                    read: true,
                    readAt: hoursAgo(48),
                    createdAt: daysAgo(2) + 1000
                }
            );
        }

        // Conversation 4: Recruiter 3 → Job Seeker 4 (Very recent, unread)
        if (recruiters[2] && jobSeekers[3]) {
            messages.push(
                {
                    senderId: recruiters[2]._id,
                    recipientId: jobSeekers[3]._id,
                    content: `Hi! We have an urgent opening for a Backend Engineer (Node.js). Based on your profile, you seem like a perfect fit. Are you currently open to new opportunities?`,
                    read: false,
                    createdAt: minutesAgo(30)
                }
            );
        }

        // Conversation 5: Job Seeker 5 → Recruiter 2 (Question about company)
        if (jobSeekers[4] && recruiters[1]) {
            messages.push(
                {
                    senderId: jobSeekers[4]._id,
                    recipientId: recruiters[1]._id,
                    content: `Hi! I saw the DevOps Engineer position. Could you tell me more about the team structure and the tech stack you're using?`,
                    read: true,
                    readAt: hoursAgo(12),
                    createdAt: daysAgo(1)
                },
                {
                    senderId: recruiters[1]._id,
                    recipientId: jobSeekers[4]._id,
                    content: `Absolutely! Our DevOps team consists of 5 engineers. We primarily use AWS, Docker, Kubernetes, and Terraform. The team follows agile methodology and you'd be working on improving our CI/CD pipelines and infrastructure automation.`,
                    read: true,
                    readAt: hoursAgo(6),
                    createdAt: hoursAgo(18)
                },
                {
                    senderId: jobSeekers[4]._id,
                    recipientId: recruiters[1]._id,
                    content: `That sounds great! I have extensive experience with all of those tools. What's the interview process like?`,
                    read: false,
                    createdAt: hoursAgo(4)
                }
            );
        }

        // Insert all messages
        const insertedMessages = await Message.insertMany(messages);
        console.log(`✅ Created ${insertedMessages.length} messages`);

        // Display conversation summary
        console.log('\n📊 Conversation Summary:');
        const conversationGroups = {};
        insertedMessages.forEach(msg => {
            const key = `${msg.senderId}-${msg.recipientId}`;
            conversationGroups[key] = (conversationGroups[key] || 0) + 1;
        });

        let convNum = 1;
        for (const [key, count] of Object.entries(conversationGroups)) {
            console.log(`   Conversation ${convNum++}: ${count} messages`);
        }

        console.log('\n🎉 Message seeding completed successfully!');
        console.log('\n💡 Tip: Navigate to /jobseeker/messages to see the conversations');

    } catch (error) {
        console.error('❌ Error seeding messages:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
};

// Run the seeder
seedMessages();
