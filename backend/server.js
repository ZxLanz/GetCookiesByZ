// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// =======================
// CORS Configuration - FIXED WITH DEBUG LOGGING
// =======================
const allowedOrigins = [
  'http://localhost:5173',
  'https://get-cookies-by-z.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 CORS Check - Origin:', origin);
    
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      console.log('✅ CORS: No origin (allowed)');
      return callback(null, true);
    }
    
    // Check if origin is in allowedOrigins array
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Origin in whitelist:', origin);
      return callback(null, true);
    }
    
    // Check if origin matches Vercel preview URL pattern
    const vercelPreviewPattern = /^https:\/\/get-cookies-by-.*\.vercel\.app$/;
    if (vercelPreviewPattern.test(origin)) {
      console.log('✅ CORS: Vercel preview URL matched:', origin);
      return callback(null, true);
    }
    
    // Log and reject other origins
    console.error('❌ CORS BLOCKED - Origin:', origin);
    console.error('   Allowed origins:', allowedOrigins);
    console.error('   Pattern test result:', vercelPreviewPattern.test(origin));
    
    const error = new Error('Not allowed by CORS');
    error.origin = origin;
    callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));

// =======================
// Body Parser
// =======================
app.use(express.json());

// =======================
// MongoDB Connection
// =======================
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected:', mongoose.connection.host);
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
  });

// =======================
// Import Routes
// =======================
const authRoutes = require('./routes/auth');
const storeRoutes = require('./routes/stores');
const cookieRoutes = require('./routes/cookies');
const settingsRoutes = require('./routes/settings');
const activityRoutes = require('./routes/activities');

// =======================
// Register Routes
// =======================
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/cookies', cookieRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/activities', activityRoutes);

// =======================
// Health Check
// =======================
app.get('/', (req, res) => {
  res.json({
    message: 'Kasir Pintar Cookie Manager API',
    status: 'running',
    version: '1.0.0',
    deployed: 'Vercel Serverless'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// =======================
// Error Handling Middleware
// =======================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      message: 'CORS policy violation',
      origin: err.origin || req.headers.origin,
      allowedOrigins: allowedOrigins,
      help: 'Check if your origin matches the allowed pattern'
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =======================
// Start Server (Local Only)
// =======================
const PORT = process.env.PORT || 5000;

// Only start server if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, () => {
    console.log(
      `🚀 Server running on port ${PORT} in ${
        process.env.NODE_ENV || 'development'
      } mode`
    );

    // =======================
    // Auto-Refresh Scheduler (Local Only)
    // =======================
    try {
      const {
        startAutoRefreshScheduler,
        getNextRefreshTime,
      } = require('./services/autoRefreshScheduler');

      startAutoRefreshScheduler();

      // Log countdown every 10 minutes
      setInterval(() => {
        const nextRefresh = getNextRefreshTime();
        console.log(`⏰ Next cookie refresh in: ${nextRefresh}`);
      }, 10 * 60 * 1000);
    } catch (error) {
      console.error('❌ Auto-Refresh Scheduler error:', error.message);
    }
  });

  // =======================
  // Graceful Shutdown (Local Only)
  // =======================
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      });
    });
  });
}

// =======================
// Export for Vercel
// =======================
module.exports = app;