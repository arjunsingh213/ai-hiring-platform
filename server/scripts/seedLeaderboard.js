/**
 * Expanded Leaderboard Seed Script
 * 
 * Creates 10+ mock candidates for the "AI Engineer" domain.
 * Run with: node server/scripts/seedLeaderboard.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import User model
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-interview-platform';

const MOCK_CANDIDATES = [
    {
        email: 'arjun.singh@example.com',
        role: 'jobseeker',
        isOnboardingComplete: true,
        profile: {
            name: 'Arjun Singh Back-end engineers',
            headline: 'Senior Back-end Engineer',
            location: 'New Delhi, India'
        },
        jobSeekerProfile: {
            desiredRole: 'Senior Back-end Engineer',
            jobDomains: ['AI Engineer', 'AI & Machine Learning'],
            experienceLevel: 'experienced',
            yearsOfExperience: 6
        },
        aiTalentPassport: {
            talentScore: 96,
            levelBand: 'Level 6',
            domainScore: 94,
            communicationScore: 90,
            problemSolvingScore: 98,
            lastUpdated: new Date()
        },
        testingMode: true
    },
    {
        email: 'rohit.v@example.com',
        role: 'jobseeker',
        isOnboardingComplete: true,
        profile: {
            name: 'Rohit Verma',
            headline: 'AI System Architect',
            location: 'Bangalore, India'
        },
        jobSeekerProfile: {
            desiredRole: 'AI Engineer',
            jobDomains: ['AI Engineer'],
            experienceLevel: 'experienced',
            yearsOfExperience: 8
        },
        aiTalentPassport: {
            talentScore: 91,
            levelBand: 'Level 5',
            domainScore: 93,
            communicationScore: 85,
            problemSolvingScore: 95,
            lastUpdated: new Date()
        },
        testingMode: true
    },
    {
        email: 'priya.s@example.com',
        role: 'jobseeker',
        isOnboardingComplete: true,
        profile: {
            name: 'Priya Sharma',
            headline: 'MLOps Engineer',
            location: 'Mumbai, India'
        },
        jobSeekerProfile: {
            desiredRole: 'AI Engineering Specialist',
            jobDomains: ['AI Engineer'],
            experienceLevel: 'experienced',
            yearsOfExperience: 3
        },
        aiTalentPassport: {
            talentScore: 84,
            levelBand: 'Level 4',
            domainScore: 82,
            communicationScore: 88,
            problemSolvingScore: 80,
            lastUpdated: new Date()
        },
        testingMode: true
    },
    {
        email: 'michael.lee@example.com',
        role: 'jobseeker',
        isOnboardingComplete: true,
        profile: {
            name: 'Michael Lee',
            headline: 'Deep Learning Researcher',
            location: 'San Francisco, USA'
        },
        jobSeekerProfile: {
            desiredRole: 'AI Researcher',
            jobDomains: ['AI Engineer'],
            experienceLevel: 'experienced',
            yearsOfExperience: 4
        },
        aiTalentPassport: {
            talentScore: 89,
            levelBand: 'Level 5',
            domainScore: 90,
            communicationScore: 82,
            problemSolvingScore: 92,
            lastUpdated: new Date()
        }
    },
    {
        email: 'sarah.t@example.com',
        role: 'jobseeker',
        isOnboardingComplete: true,
        profile: {
            name: 'Sarah Thompson',
            headline: 'Computer Vision Engineer',
            location: 'London, UK'
        },
        jobSeekerProfile: {
            desiredRole: 'AI Engineer',
            jobDomains: ['AI Engineer'],
            experienceLevel: 'experienced',
            yearsOfExperience: 5
        },
        aiTalentPassport: {
            talentScore: 87,
            levelBand: 'Level 5',
            domainScore: 85,
            communicationScore: 92,
            problemSolvingScore: 86,
            lastUpdated: new Date()
        }
    },
    {
        email: 'chen.wei@example.com',
        role: 'jobseeker',
        isOnboardingComplete: true,
        profile: {
            name: 'Chen Wei',
            headline: 'NLP Specialist',
            location: 'Beijing, China'
        },
        jobSeekerProfile: {
            desiredRole: 'AI Engineer',
            jobDomains: ['AI Engineer'],
            experienceLevel: 'experienced',
            yearsOfExperience: 6
        },
        aiTalentPassport: {
            talentScore: 78,
            levelBand: 'Level 4',
            domainScore: 80,
            communicationScore: 70,
            problemSolvingScore: 85,
            lastUpdated: new Date()
        }
    },
    {
        email: 'amina.b@example.com',
        role: 'jobseeker',
        isOnboardingComplete: true,
        profile: {
            name: 'Amina Bekker',
            headline: 'Data Scientist (AI Focus)',
            location: 'Cape Town, South Africa'
        },
        jobSeekerProfile: {
            desiredRole: 'AI Engineer',
            jobDomains: ['AI Engineer'],
            experienceLevel: 'experienced',
            yearsOfExperience: 3
        },
        aiTalentPassport: {
            talentScore: 75,
            levelBand: 'Level 3',
            domainScore: 72,
            communicationScore: 80,
            problemSolvingScore: 76,
            lastUpdated: new Date()
        }
    },
    {
        email: 'diego.r@example.com',
        role: 'jobseeker',
        isOnboardingComplete: true,
        profile: {
            name: 'Diego Rodriguez',
            headline: 'AI Product Engineer',
            location: 'Madrid, Spain'
        },
        jobSeekerProfile: {
            desiredRole: 'Software Engineer',
            jobDomains: ['AI Engineer'],
            experienceLevel: 'experienced',
            yearsOfExperience: 4
        },
        aiTalentPassport: {
            talentScore: 72,
            levelBand: 'Level 3',
            domainScore: 70,
            communicationScore: 75,
            problemSolvingScore: 74,
            lastUpdated: new Date()
        }
    },
    {
        email: 'claire.d@example.com',
        role: 'jobseeker',
        isOnboardingComplete: true,
        profile: {
            name: 'Claire Dubois',
            headline: 'ML Research Lead',
            location: 'Paris, France'
        },
        jobSeekerProfile: {
            desiredRole: 'AI Researcher',
            jobDomains: ['AI Engineer'],
            experienceLevel: 'senior',
            yearsOfExperience: 10
        },
        aiTalentPassport: {
            talentScore: 94,
            levelBand: 'Level 7',
            domainScore: 96,
            communicationScore: 88,
            problemSolvingScore: 94,
            lastUpdated: new Date()
        }
    },
    {
        email: 'yuki.s@example.com',
        role: 'jobseeker',
        isOnboardingComplete: true,
        profile: {
            name: 'Yuki Sato',
            headline: 'Robotics & AI Engineer',
            location: 'Tokyo, Japan'
        },
        jobSeekerProfile: {
            desiredRole: 'AI Engineer',
            jobDomains: ['AI Engineer'],
            experienceLevel: 'experienced',
            yearsOfExperience: 5
        },
        aiTalentPassport: {
            talentScore: 82,
            levelBand: 'Level 4',
            domainScore: 84,
            communicationScore: 78,
            problemSolvingScore: 86,
            lastUpdated: new Date()
        }
    }
];

async function seedLeaderboard() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const candidateData of MOCK_CANDIDATES) {
            // Upsert based on email
            const user = await User.findOneAndUpdate(
                { email: candidateData.email },
                { $set: candidateData },
                { upsert: true, new: true }
            );
            console.log(`Seeded/Updated candidate: ${user.profile.name} in domains: ${user.jobSeekerProfile.jobDomains.join(', ')}`);
        }

        console.log('\n========================================');
        console.log('Leaderboard seeding completed for 10 candidates!');
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

seedLeaderboard();
