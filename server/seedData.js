// Sample Data Seeder for AI Interview Platform
// Run this script to populate the database with sample posts and jobs

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Post = require('./models/Post');
const Job = require('./models/Job');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get existing users
        const jobSeekers = await User.find({ role: 'jobseeker' }).limit(3);
        const recruiters = await User.find({ role: 'recruiter' }).limit(2);

        if (jobSeekers.length === 0) {
            console.log('⚠️  No job seekers found. Please create some users first.');
            return;
        }

        if (recruiters.length === 0) {
            console.log('⚠️  No recruiters found. Please create some recruiters first.');
            return;
        }

        // Clear existing sample data
        await Post.deleteMany({});
        await Job.deleteMany({});
        console.log('🗑️  Cleared existing posts and jobs');

        // Create sample posts
        const samplePosts = [
            {
                userId: jobSeekers[0]._id,
                content: {
                    text: "Just completed my AI interview! The experience was amazing. The questions were really challenging and made me think deeply about my skills. Excited to see the results! 🚀"
                },
                postType: 'text',
                visibility: 'public',
                engagement: {
                    likes: [
                        { userId: jobSeekers[1]._id },
                        { userId: jobSeekers[2]._id }
                    ],
                    comments: [{
                        userId: jobSeekers[1]._id,
                        text: "Congratulations! How was the experience?",
                        createdAt: new Date()
                    }]
                }
            },
            {
                userId: jobSeekers[1]._id,
                content: {
                    text: "Looking for opportunities in Full Stack Development. Open to remote positions. Check out my portfolio! 💼 #OpenToWork #FullStack #React #Node"
                },
                postType: 'text',
                visibility: 'public',
                engagement: {
                    likes: [{ userId: jobSeekers[0]._id }],
                    shares: []
                }
            },
            {
                userId: jobSeekers[2]._id,
                content: {
                    text: "Just got my interview results - 85/100! Really happy with the feedback. The AI interviewer was incredibly insightful. Time to apply for my dream job! ✨"
                },
                postType: 'text',
                visibility: 'public',
                engagement: {
                    likes: [
                        { userId: jobSeekers[0]._id },
                        { userId: jobSeekers[1]._id }
                    ],
                    comments: [{
                        userId: jobSeekers[0]._id,
                        text: "That's awesome! Congratulations!",
                        createdAt: new Date()
                    }]
                }
            },
            {
                userId: recruiters[0]._id,
                content: {
                    text: "We're hiring! Looking for talented developers to join our team. Check out our latest job postings. Great benefits and remote work options available! 🎯"
                },
                postType: 'text',
                visibility: 'public',
                engagement: {
                    likes: [
                        { userId: jobSeekers[0]._id },
                        { userId: jobSeekers[1]._id },
                        { userId: jobSeekers[2]._id }
                    ],
                    shares: []
                }
            }
        ];

        const createdPosts = await Post.insertMany(samplePosts);
        console.log(`✅ Created ${createdPosts.length} sample posts`);

        // Create sample jobs
        const sampleJobs = [
            {
                recruiterId: recruiters[0]._id,
                title: 'Senior Full Stack Developer',
                description: 'We are looking for an experienced Full Stack Developer to join our growing team. You will be working on cutting-edge web applications using React, Node.js, and MongoDB. This is a great opportunity to work with a talented team and make a real impact.',
                requirements: {
                    skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'REST APIs'],
                    experienceLevel: 'senior',
                    minExperience: 5,
                    maxExperience: 10,
                    education: ["Bachelor's in Computer Science or related field"]
                },
                jobDetails: {
                    type: 'full-time',
                    location: 'San Francisco, CA',
                    remote: true,
                    salary: {
                        min: 120000,
                        max: 180000,
                        currency: 'USD',
                        period: 'yearly'
                    },
                    benefits: ['Health Insurance', '401k', 'Remote Work', 'Flexible Hours']
                },
                status: 'active',
                views: 245
            },
            {
                recruiterId: recruiters[0]._id,
                title: 'Frontend Developer (React)',
                description: 'Join our team as a Frontend Developer! You will be responsible for building beautiful, responsive user interfaces using React and modern web technologies. We value creativity, attention to detail, and a passion for great UX.',
                requirements: {
                    skills: ['React', 'JavaScript', 'CSS', 'HTML', 'Redux'],
                    experienceLevel: 'mid',
                    minExperience: 2,
                    maxExperience: 5,
                    education: ["Bachelor's degree or equivalent experience"]
                },
                jobDetails: {
                    type: 'full-time',
                    location: 'New York, NY',
                    remote: true,
                    salary: {
                        min: 90000,
                        max: 130000,
                        currency: 'USD',
                        period: 'yearly'
                    }
                },
                status: 'active',
                views: 189
            },
            {
                recruiterId: recruiters[1]._id,
                title: 'Backend Engineer (Node.js)',
                description: 'We are seeking a talented Backend Engineer to help build scalable APIs and microservices. You will work with Node.js, Express, and MongoDB to create robust backend systems that power our applications.',
                requirements: {
                    skills: ['Node.js', 'Express', 'MongoDB', 'Docker', 'AWS'],
                    experienceLevel: 'mid',
                    minExperience: 3,
                    maxExperience: 6,
                    education: ["Bachelor's in Computer Science"]
                },
                jobDetails: {
                    type: 'full-time',
                    location: 'Austin, TX',
                    remote: false,
                    salary: {
                        min: 100000,
                        max: 140000,
                        currency: 'USD',
                        period: 'yearly'
                    }
                },
                status: 'active',
                views: 156
            },
            {
                recruiterId: recruiters[1]._id,
                title: 'DevOps Engineer',
                description: 'Looking for a DevOps Engineer to manage our cloud infrastructure and CI/CD pipelines. You will work with AWS, Docker, Kubernetes, and various automation tools to ensure smooth deployments and system reliability.',
                requirements: {
                    skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'],
                    experienceLevel: 'senior',
                    minExperience: 4,
                    maxExperience: 8,
                    education: ["Bachelor's degree in relevant field"]
                },
                jobDetails: {
                    type: 'full-time',
                    location: 'Seattle, WA',
                    remote: true,
                    salary: {
                        min: 110000,
                        max: 160000,
                        currency: 'USD',
                        period: 'yearly'
                    }
                },
                status: 'active',
                views: 203
            },
            {
                recruiterId: recruiters[0]._id,
                title: 'UI/UX Designer',
                description: 'We are looking for a creative UI/UX Designer to craft beautiful and intuitive user experiences. You will work closely with developers and product managers to design interfaces that users love.',
                requirements: {
                    skills: ['Figma', 'Adobe XD', 'UI Design', 'UX Research', 'Prototyping'],
                    experienceLevel: 'mid',
                    minExperience: 2,
                    maxExperience: 5,
                    education: ["Bachelor's in Design or related field"]
                },
                jobDetails: {
                    type: 'full-time',
                    location: 'Los Angeles, CA',
                    remote: true,
                    salary: {
                        min: 80000,
                        max: 120000,
                        currency: 'USD',
                        period: 'yearly'
                    }
                },
                status: 'active',
                views: 178
            }
        ];

        const createdJobs = await Job.insertMany(sampleJobs);
        console.log(`✅ Created ${createdJobs.length} sample jobs`);

        console.log('\n🎉 Sample data seeded successfully!');
        console.log(`\nSummary:`);
        console.log(`- ${createdPosts.length} posts created`);
        console.log(`- ${createdJobs.length} jobs created`);
        console.log(`\nYou can now test the application with this sample data!`);

    } catch (error) {
        console.error('❌ Error seeding data:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
};

// Run the seeder
seedData();
