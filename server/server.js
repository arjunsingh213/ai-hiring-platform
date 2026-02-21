require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const session = require('express-session');
const connectDB = require('./config/database');
const { initializeSocket } = require('./config/socket');

// Initialize Passport (loads Google strategy)
const passport = require('./config/passport');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Trust proxy for Vercel (Required for secure cookies and session support)
app.set('trust proxy', 1);

// --- Consolidated CORS Configuration (Must be first) ---
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const domain = origin.toLowerCase();

        // Robust pattern matching for allowed domains
        const isAllowed =
            domain.includes('localhost') ||
            domain.includes('127.0.0.1') ||
            domain.includes('froscel.xyz') ||
            domain.includes('froscel.com') ||
            domain.includes('vercel.app');

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Rejected Origin: ${origin}`);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cookie',
        'Set-Cookie'
    ],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Handle preflight globally
app.options('*', cors(corsOptions));
// -------------------------------------------------------

// Initialize Socket.io
const io = initializeSocket(server);

// Connect to MongoDB
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (required for Passport OAuth)
app.use(session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
const authOAuthRoutes = require('./routes/authOAuth'); // Added back OAuth routes
const feedbackRoutes = require('./routes/feedbackRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const jobRoutes = require('./routes/jobRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const resumeParserRoutes = require('./routes/resumeParser');
const interviewRoutes = require('./routes/interviewRoutes');
const onboardingInterviewRoutes = require('./routes/onboardingInterview');
const documentRoutes = require('./routes/documents');
const hiringRoutes = require('./routes/hiring');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const contactRoutes = require('./routes/contactRoutes');
const postRoutes = require('./routes/postRoutes');
const talentPassportRoutes = require('./routes/talentPassportRoutes');
const jobInterviewRoutes = require('./routes/jobInterview');
const companyRoutes = require('./routes/companyRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const codeExecutionRoutes = require('./routes/codeExecutionRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Added adminRoutes
const adminSetupRoutes = require('./routes/adminSetup'); // Added adminSetupRoutes
const skillNodeRoutes = require('./routes/skillNodeRoutes');
const challengeAdminRoutes = require('./routes/challengeAdminRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/auth', authOAuthRoutes); // OAuth routes
app.use('/api/feedback', feedbackRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/resume', resumeRoutes); // Changed from /api/resumes
app.use('/api/parse-resume', resumeParserRoutes); // Changed from /api/resume
app.use('/api/interviews', interviewRoutes); // Fixed: must match frontend API calls
app.use('/api/onboarding-interview', onboardingInterviewRoutes);
app.use('/api/documents', documentRoutes); // Changed from /api/hiring
app.use('/api/hiring', hiringRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/talent-passport', talentPassportRoutes);
app.use('/api/job-interview', jobInterviewRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/code', codeExecutionRoutes);
app.use('/api/challenges', challengeRoutes);

// Admin Review System
app.use('/api/admin', adminRoutes);

// Admin Setup (for Vercel deployments - protected by secret)
app.use('/api/admin-setup', adminSetupRoutes);

// Skill Nodes
app.use('/api/skill-nodes', skillNodeRoutes);

// Verified Projects (ATP)
const projectRoutes = require('./routes/projectRoutes');
app.use('/api/projects', projectRoutes);

// Challenge Admin
app.use('/api/admin/challenges', challengeAdminRoutes);

// Hybrid Pipeline Routes
const roundRoutes = require('./routes/roundRoutes');
const batchRoutes = require('./routes/batchRoutes');
app.use('/api/rounds', roundRoutes);
app.use('/api/batches', batchRoutes);

// Froscel Interview Room™ — Video Room Routes
const videoRoomRoutes = require('./routes/videoRoomRoutes');
app.use('/api/video-rooms', videoRoomRoutes);

// Initialize Video Room Socket namespace
const { setupVideoRoomNamespace } = require('./config/socket');
setupVideoRoomNamespace(io);

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'AI Hiring Platform API is running',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            posts: '/api/posts',
            jobs: '/api/jobs',
            interviews: '/api/interviews',
            messages: '/api/messages',
            notifications: '/api/notifications'
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'AI Interview Platform API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Start server (only for local development)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Socket.io initialized`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

        // Initialize skill decay cron job
        try {
            const { scheduleSkillDecay } = require('./jobs/skillDecay');
            scheduleSkillDecay();
        } catch (err) {
            console.log('⚠️ Skill decay cron not started:', err.message);
        }
    });
}

// Export for Vercel
module.exports = app;