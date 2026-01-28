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

// Initialize Socket.io
const io = initializeSocket(server);

// Connect to MongoDB
connectDB();

// Middleware - CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ai-hiring-platform-cm5t.vercel.app',
    'https://ai-hiring-platform-sooly.vercel.app',
    'https://froscel.com',
    'https://www.froscel.com',
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin.includes(allowed))) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
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
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/auth', require('./routes/authOAuth')); // OAuth routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/resumes', require('./routes/resumeRoutes'));
app.use('/api/interviews', require('./routes/interviewRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/profiles', require('./routes/profileRoutes'));
app.use('/api/hiring', require('./routes/hiring'));
app.use('/api/hiring', require('./routes/documents'));
app.use('/api/resume', require('./routes/resumeParser'));
app.use('/api/onboarding-interview', require('./routes/onboardingInterview'));
app.use('/api/code', require('./routes/codeExecutionRoutes'));
app.use('/api/job-interview', require('./routes/jobInterview'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

// Admin Review System
app.use('/api/admin', require('./routes/adminRoutes'));

// Admin Setup (for Vercel deployments - protected by secret)
app.use('/api/admin-setup', require('./routes/adminSetup'));

// AI Talent Passport
app.use('/api/talent-passport', require('./routes/talentPassportRoutes'));

// User Settings (Account, Privacy, Security, Notifications)
app.use('/api/settings', require('./routes/settingsRoutes'));

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
    });
}

// Export for Vercel
module.exports = app;
