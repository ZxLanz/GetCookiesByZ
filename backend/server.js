// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// =======================
// Middleware
// =======================
app.use(cors());
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
// Start Server
// =======================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} in ${
      process.env.NODE_ENV || 'development'
    } mode`
  );

  // =======================
  // Auto-Refresh Scheduler
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
// Graceful Shutdown
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

module.exports = app;
