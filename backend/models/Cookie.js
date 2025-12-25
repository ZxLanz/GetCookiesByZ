// backend/models/Cookie.js

const mongoose = require('mongoose');

const cookieSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    default: '.kasirpintar.co.id'
  },
  path: {
    type: String,
    default: '/'
  },
  expirationDate: {
    type: Date,
    default: null
  },
  httpOnly: {
    type: Boolean,
    default: false
  },
  secure: {
    type: Boolean,
    default: false
  },
  sameSite: {
    type: String,
    enum: ['Lax', 'Strict', 'None'],
    default: 'Lax'
  },
  
  // ✅ NEW: Health check status fields
  isValid: {
    type: Boolean,
    default: null // null = not checked yet, true = valid, false = expired
  },
  healthStatus: {
    type: String,
    enum: ['unknown', 'valid', 'expired', 'invalid'],
    default: 'unknown'
  },
  checkedAt: {
    type: Date,
    default: null
  },
  statusMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// ✅ Virtual field untuk status display
cookieSchema.virtual('statusDisplay').get(function() {
  if (this.healthStatus === 'valid') return 'Valid';
  if (this.healthStatus === 'expired') return 'Expired';
  if (this.healthStatus === 'invalid') return 'Invalid';
  return 'Unknown';
});

// ✅ Method untuk update health status
cookieSchema.methods.updateHealthStatus = function(isValid, message = null) {
  this.isValid = isValid;
  this.healthStatus = isValid ? 'valid' : 'expired';
  this.checkedAt = new Date();
  this.statusMessage = message;
  return this.save();
};

module.exports = mongoose.model('Cookie', cookieSchema);