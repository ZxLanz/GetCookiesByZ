// backend/config/database.js
// MongoDB connection optimized for serverless environments

const mongoose = require('mongoose');

// Cache the MongoDB connection
let cachedConnection = null;

const connectDB = async () => {
  // If already connected, return cached connection
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('♻️ Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    // Mongoose options optimized for serverless
    const options = {
      // Connection pool settings for serverless
      maxPoolSize: 10,
      minPoolSize: 2,
      
      // Timeout settings
      serverSelectionTimeoutMS: 5000, // 5 seconds
      socketTimeoutMS: 45000, // 45 seconds
      
      // Keep alive settings
      keepAlive: true,
      keepAliveInitialDelay: 300000, // 5 minutes
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
    };

    console.log('🔌 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    cachedConnection = conn;
    
    console.log('✅ MongoDB Connected:', conn.connection.host);
    console.log('📊 Connection State:', mongoose.connection.readyState);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err);
      cachedConnection = null;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      cachedConnection = null;
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('♻️ MongoDB reconnected');
    });
    
    return cachedConnection;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    cachedConnection = null;
    throw error;
  }
};

// Graceful disconnect (for local development)
const disconnectDB = async () => {
  if (cachedConnection) {
    await mongoose.connection.close();
    cachedConnection = null;
    console.log('✅ MongoDB connection closed');
  }
};

module.exports = { connectDB, disconnectDB };