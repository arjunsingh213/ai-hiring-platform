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

// --- Consolidated CORS Configuration (Must be first) ---
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ai-hiring-platform-cm5t.vercel.app',
    'https://ai-hiring-platform-sooly.vercel.app',
    'https://ai-hiring-platform-sooley.vercel.app',
    'https://froscel.com',
    'https://www.froscel.com',
    'https://froscel.xyz',
    'https://www.froscel.xyz',
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        try {
            const url = new URL(origin);
            const hostname = url.hostname.toLowerCase();

            // 1. Allow localhost
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return callback(null, true);
            }

            // 2. Allow all Froscel domains and subdomains
            if (hostname === 'froscel.com' || hostname.endsWith('.froscel.com') ||
                hostname === 'froscel.xyz' || hostname.endsWith('.froscel.xyz')) {
                return callback(null, true);
            }

            // 3. Allow all Vercel domains and subdomains
            if (hostname === 'vercel.app' || hostname.endsWith('.vercel.app')) {
                return callback(null, true);
            }

            // 4. Fallback: check explicit list (for any other domains)
            const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();
            const isExplicitlyAllowed = allowedOrigins.some(allowed =>
                allowed.replace(/\/$/, "").toLowerCase() === normalizedOrigin
            );

            if (isExplicitlyAllowed) {
                return callback(null, true);
            }

            // 5. Check Environment Variable
            if (process.env.CLIENT_URL) {
                const clientUrl = new URL(process.env.CLIENT_URL).hostname.toLowerCase();
                if (hostname === clientUrl) {
                    return callback(null, true);
                }
            }

            console.warn(`[CORS] Blocking origin: ${origin}`);
            callback(null, false);
        } catch (err) {
            console.error('[CORS] Origin parsing error:', err.message);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200
}));
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