// backend/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/database');

const app = express();

// =======================
// CORS Configuration
// =======================
const allowedOrigins = [
  'http://localhost:5173',
  'https://get-cookies-by-z.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowedOrigins array
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check if origin matches Vercel preview URL pattern
    const vercelPreviewPattern = /^https:\/\/get-cookies-by-.*\.vercel\.app$/;
    if (vercelPreviewPattern.test(origin)) {
      return callback(null, true);
    }
    
    // Reject other origins
    console.error('❌ CORS BLOCKED - Origin:', origin);
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
// MongoDB Connection Middleware (Serverless Optimized)
// =======================
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    res.status(503).json({ 
      message: 'Database connection unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
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
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    mongodb: {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState
    }
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
      origin: err.origin || req.headers.origin
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =======================
// Local Development Server
// =======================
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  
  const server = app.listen(PORT, async () => {
    console.log(
      `🚀 Server running on port ${PORT} in ${
        process.env.NODE_ENV || 'development'
      } mode`
    );

    // Connect to MongoDB on startup (local only)
    await connectDB();

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
      const { disconnectDB } = require('./config/database');
      disconnectDB().then(() => {
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