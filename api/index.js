// Vercel Serverless Function Entry Point
// Environment variables are loaded from Vercel dashboard (no dotenv needed)

// Set node environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Import the Express app
const app = require('../server/server');

// Export for Vercel serverless
module.exports = app;
