// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// =======================
// Middleware
// =======================
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://get-cookies-by-z.vercel.app' // ✅ Frontend Vercel URL
  ],
  credentials: true
}));
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
const activityRoutes = require('./routes/activities'); // ✅ ACTIVITY LOGS

// =======================
// Register Routes
// =======================
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/cookies', cookieRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/activities', activityRoutes); // ✅ ACTIVITY API

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