const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSettings,
  updateSettings,
  syncNow
} = require('../controllers/settingsController');

// All routes are protected
router.use(protect);

// GET /api/settings - Get user settings
router.get('/', getSettings);

// PUT /api/settings - Update user settings
router.put('/', updateSettings);

// POST /api/settings/sync-now - Manual trigger sync
router.post('/sync-now', syncNow);

module.exports = router;