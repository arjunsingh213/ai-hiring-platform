// Vercel Serverless Function Entry Point
require('dotenv').config({ path: '../server/.env' });
const app = require('../server/server');

// Export for Vercel
module.exports = app;
