// backend/routes/activities.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getActivities,
  getRecentActivities,
  createActivity,
  cleanupOldActivities
} = require('../controllers/activityController');

// All routes are protected
router.use(protect);

// GET /api/activities/recent - Get recent activities (last 5)
router.get('/recent', getRecentActivities);

// DELETE /api/activities/cleanup - Clean up old activities
router.delete('/cleanup', cleanupOldActivities);

// GET /api/activities - Get all activities with pagination
router.get('/', getActivities);

// POST /api/activities - Create new activity (manual log)
router.post('/', createActivity);

module.exports = router;