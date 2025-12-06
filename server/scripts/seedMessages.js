const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
require('dotenv').config();

const seedMessages = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📡 Connected to MongoDB');

        // Get the current user (job seeker)
        const currentUser = await User.findOne({ role: 'jobseeker' });
        if (!currentUser) {
            console.log('❌ No job seeker found. Please create a user first.');
            process.exit(1);
        }

        console.log(`✅ Found user: ${currentUser.profile?.name || currentUser.email}`);

        // Create or find test recruiters
        const recruiter1 = await User.findOneAndUpdate(
            { email: 'recruiter1@techcorp.com' },
            {
                email: 'recruiter1@techcorp.com',
                password: 'hashedpassword123',
                role: 'recruiter',
                profile: {
                    name: 'Sarah Johnson',
                    company: 'TechCorp Inc.',
                    title: 'Senior Technical Recruiter',
                    location: 'San Francisco, CA'
                }
            },
            { upsert: true, new: true }
        );

        const recruiter2 = await User.findOneAndUpdate(
            { email: 'recruiter2@startupxyz.com' },
            {
                email: 'recruiter2@startupxyz.com',
                password: 'hashedpassword123',
                role: 'recruiter',
                profile: {
                    name: 'Michael Chen',
                    company: 'StartupXYZ',
                    title: 'Talent Acquisition Manager',
                    location: 'New York, NY'
                }
            },
            { upsert: true, new: true }
        );

        const recruiter3 = await User.findOneAndUpdate(
            { email: 'hr@innovatetech.com' },
            {
                email: 'hr@innovatetech.com',
                password: 'hashedpassword123',
                role: 'recruiter',
                profile: {
                    name: 'Emily Rodriguez',
                    company: 'InnovateTech',
                    title: 'HR Manager',
                    location: 'Austin, TX'
                }
            },
            { upsert: true, new: true }
        );

        console.log('✅ Created/found test recruiters');

        // Clear existing messages for clean slate
        await Message.deleteMany({
            $or: [
                { senderId: currentUser._id },
                { recipientId: currentUser._id }
            ]
        });

        console.log('🗑️  Cleared existing messages');

        // Conversation 1: TechCorp - Recent, active conversation
        const conv1Messages = [
            {
                senderId: recruiter1._id,
                recipientId: currentUser._id,
                content: "Hi! I came across your profile and I'm impressed with your experience. We have an exciting Senior Developer position at TechCorp that might interest you.",
                read: true,
                readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            },
            {
                senderId: currentUser._id,
                recipientId: recruiter1._id,
                content: "Thank you for reaching out! I'd love to learn more about the position. Could you share more details?",
                read: true,
                readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                senderId: recruiter1._id,
                recipientId: currentUser._id,
                content: "Absolutely! It's a full-stack role working with React, Node.js, and AWS. Salary range is $120k-$150k with excellent benefits. The team is building a cutting-edge AI platform.",
                read: true,
                readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                senderId: currentUser._id,
                recipientId: recruiter1._id,
                content: "That sounds perfect! I have 5 years of experience with that exact stack. What are the next steps?",
                read: true,
                readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            },
            {
                senderId: recruiter1._id,
                recipientId: currentUser._id,
                content: "Great! I'd like to schedule a call this week. Are you available Tuesday or Wednesday afternoon?",
                read: false,
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
            }
        ];

        // Conversation 2: StartupXYZ - Unread messages
        const conv2Messages = [
            {
                senderId: recruiter2._id,
                recipientId: currentUser._id,
                content: "Hello! We're looking for a talented developer to join our startup. Would you be interested in a quick chat?",
                read: true,
                readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                senderId: currentUser._id,
                recipientId: recruiter2._id,
                content: "Sure! What's the role about?",
                read: true,
                readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            },
            {
                senderId: recruiter2._id,
                recipientId: currentUser._id,
                content: "We're building a fintech platform and need a frontend specialist. Equity + competitive salary. Interested?",
                read: false,
                createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
            }
        ];

        // Conversation 3: InnovateTech - Older conversation
        const conv3Messages = [
            {
                senderId: recruiter3._id,
                recipientId: currentUser._id,
                content: "Hi, thank you for applying to our Backend Engineer position. We'd like to move forward with your application.",
                read: true,
                readAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            },
            {
                senderId: currentUser._id,
                recipientId: recruiter3._id,
                content: "That's wonderful news! What's the next step in the process?",
                read: true,
                readAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
            },
            {
                senderId: recruiter3._id,
                recipientId: currentUser._id,
                content: "We'll send you a technical assessment by email. Please complete it within 48 hours. Good luck!",
                read: true,
                readAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            }
        ];

        // Insert all messages
        await Message.insertMany([...conv1Messages, ...conv2Messages, ...conv3Messages]);

        console.log('✅ Created test conversations:');
        console.log(`   - ${recruiter1.profile.name} (TechCorp): 5 messages, 1 unread`);
        console.log(`   - ${recruiter2.profile.name} (StartupXYZ): 3 messages, 1 unread`);
        console.log(`   - ${recruiter3.profile.name} (InnovateTech): 3 messages, all read`);

        console.log('\n🎉 Seed completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding messages:', error);
        process.exit(1);
    }
};

seedMessages();
