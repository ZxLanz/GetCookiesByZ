// backend/api/index.js
// This is the entry point for Vercel serverless function

const app = require('../server');

// Export for Vercel
module.exports = app;