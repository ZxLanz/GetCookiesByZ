// backend/models/Activity.js

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    // Examples: 'Cookie refreshed', 'Store created', 'Cookie expired', etc.
  },
  type: {
    type: String,
    enum: ['success', 'info', 'warning', 'error'],
    default: 'info'
  },
  store: {
    type: String, // Store name for display
    default: null
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null
  },
  details: {
    type: String, // Additional details
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Flexible field for additional data
    default: {}
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Index for faster queries
activitySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);