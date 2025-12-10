// Vercel Serverless Function - Native Format
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// MongoDB singleton connection
let cachedDb = null;
async function connectToDatabase() {
    if (cachedDb) return cachedDb;

    const client = await mongoose.connect(process.env.MONGODB_URI);
    cachedDb = client;
    console.log('MongoDB connected');
    return cachedDb;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to DB middleware
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        console.error('DB Error:', error);
        return res.status(500).json({ error: 'Database connection failed' });
    }
});

// Routes
app.use('/api/auth', require('../server/routes/authRoutes'));
app.use('/api/users', require('../server/routes/userRoutes'));
app.use('/api/jobs', require('../server/routes/jobRoutes'));
app.use('/api/posts', require('../server/routes/postRoutes'));
app.use('/api/messages', require('../server/routes/messageRoutes'));
app.use('/api/notifications', require('../server/routes/notificationRoutes'));
app.use('/api/interviews', require('../server/routes/interviewRoutes'));
app.use('/api/profiles', require('../server/routes/profileRoutes'));
app.use('/api/resumes', require('../server/routes/resumeRoutes'));
app.use('/api/hiring', require('../server/routes/hiring'));
app.use('/api/hiring', require('../server/routes/documents'));
app.use('/api/resume', require('../server/routes/resumeParser'));
app.use('/api/onboarding-interview', require('../server/routes/onboardingInterview'));

// Health endpoints
app.get('/api', (req, res) => {
    res.json({ success: true, message: 'API Running', time: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// 404 for API
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'Not found', path: req.path });
});

// Export as Vercel handler
module.exports = app;
