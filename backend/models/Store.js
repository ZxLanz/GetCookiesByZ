// backend/models/Store.js

const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';

// ✅ ONLY log encryption key ONCE when module loads
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ ERROR - Invalid ENCRYPTION_KEY');
  console.error('🔑 Key length:', ENCRYPTION_KEY?.length || 0);
  console.error('🔑 Expected: 64 hex characters (32 bytes)');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  throw new Error('Invalid ENCRYPTION_KEY in environment variables');
}

const cookieSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: String, required: true },
  domain: String,
  path: String,
  expires: Date,
  httpOnly: Boolean,
  secure: Boolean,
  sameSite: String,
  isValid: { type: Boolean, default: true },
  lastChecked: { type: Date, default: Date.now }
});

const storeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  domain: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'error'], 
    default: 'inactive' 
  },
  cookies: [cookieSchema],
  encryptedEmail: String,
  encryptedPassword: String,
  lastCookieUpdate: Date,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Encryption methods
storeSchema.methods.encryptPassword = function(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY, 'hex'), 
    iv
  );
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

storeSchema.methods.decryptPassword = function(encryptedText) {
  if (!encryptedText) return null;
  
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY, 'hex'), 
    iv
  );
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// ❌ REMOVE ALL POST-SAVE HOOKS THAT LOG STORES
// This was causing duplicate logs!

module.exports = mongoose.model('Store', storeSchema);