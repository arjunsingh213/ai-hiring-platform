// Vercel Serverless API Entry Point
// This handles all /api/* routes

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Create Express app for serverless
const app = express();

// MongoDB connection (singleton for serverless)
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        isConnected = true;
        console.log('MongoDB Connected for Vercel');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        throw error;
    }
};

// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ai-hiring-platform-cm5t.vercel.app',
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin && allowed && origin.includes(allowed))) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(null, true); // Allow all in serverless for now
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`[Vercel] ${req.method} ${req.path}`);
    next();
});

// Connect to DB before handling routes
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database connection failed' });
    }
});

// Import routes from server folder
const authRoutes = require('../server/routes/authRoutes');
const userRoutes = require('../server/routes/userRoutes');
const jobRoutes = require('../server/routes/jobRoutes');
const postRoutes = require('../server/routes/postRoutes');
const messageRoutes = require('../server/routes/messageRoutes');
const notificationRoutes = require('../server/routes/notificationRoutes');
const interviewRoutes = require('../server/routes/interviewRoutes');
const profileRoutes = require('../server/routes/profileRoutes');
const resumeRoutes = require('../server/routes/resumeRoutes');
const hiringRoutes = require('../server/routes/hiring');
const documentsRoutes = require('../server/routes/documents');
const resumeParserRoutes = require('../server/routes/resumeParser');
const onboardingInterviewRoutes = require('../server/routes/onboardingInterview');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/hiring', hiringRoutes);
app.use('/api/hiring', documentsRoutes);
app.use('/api/resume', resumeParserRoutes);
app.use('/api/onboarding-interview', onboardingInterviewRoutes);

// Health check
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'AI Hiring Platform API is running on Vercel',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', environment: 'vercel' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: `API route not found: ${req.path}` });
});

// Export for Vercel
module.exports = app;
