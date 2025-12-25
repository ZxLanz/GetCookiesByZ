// utils/logger.js - Simple console logger (development-friendly)

/**
 * Simple logger that mimics Winston API but uses console
 * Perfect for development without extra dependencies
 */

const colors = {
  debug: '\x1b[36m',  // Cyan
  info: '\x1b[32m',   // Green
  warn: '\x1b[33m',   // Yellow
  error: '\x1b[31m',  // Red
  reset: '\x1b[0m'
};

const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
const levels = { debug: 0, info: 1, warn: 2, error: 3 };

const logger = {
  debug: (msg, meta) => {
    if (levels[LOG_LEVEL] <= 0) {
      console.log(`${colors.debug}[DEBUG]${colors.reset}`, msg, meta || '');
    }
  },
  
  info: (msg, meta) => {
    if (levels[LOG_LEVEL] <= 1) {
      console.log(`${colors.info}[INFO]${colors.reset}`, msg, meta || '');
    }
  },
  
  warn: (msg, meta) => {
    if (levels[LOG_LEVEL] <= 2) {
      console.warn(`${colors.warn}[WARN]${colors.reset}`, msg, meta || '');
    }
  },
  
  error: (msg, err) => {
    console.error(`${colors.error}[ERROR]${colors.reset}`, msg);
    if (err && err.stack) {
      console.error(colors.error + err.stack + colors.reset);
    } else if (err) {
      console.error(colors.error + JSON.stringify(err, null, 2) + colors.reset);
    }
  },

  // Aliases untuk compatibility
  sync: function(msg) {
    this.info(`[SYNC] ${msg}`);
  },

  health: function(msg) {
    this.info(`[HEALTH] ${msg}`);
  }
};

module.exports = logger;