// backend/controllers/activityController.js

const Activity = require('../models/Activity');

// @desc    Get all activities for logged-in user
// @route   GET /api/activities
// @access  Private
const getActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Default 10 items
    const skip = parseInt(req.query.skip) || 0;

    const activities = await Activity.find({ userId: req.user._id })
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit)
      .skip(skip)
      .lean();

    // Calculate time ago
    const activitiesWithTimeAgo = activities.map(activity => ({
      ...activity,
      timeAgo: getTimeAgo(activity.createdAt)
    }));

    res.json(activitiesWithTimeAgo);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Error fetching activities' });
  }
};

// @desc    Get recent activities (last 5)
// @route   GET /api/activities/recent
// @access  Private
const getRecentActivities = async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const activitiesWithTimeAgo = activities.map(activity => ({
      ...activity,
      timeAgo: getTimeAgo(activity.createdAt)
    }));

    res.json(activitiesWithTimeAgo);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ message: 'Error fetching recent activities' });
  }
};

// @desc    Create new activity log
// @route   POST /api/activities
// @access  Private
const createActivity = async (req, res) => {
  try {
    const { action, type, store, storeId, details, metadata } = req.body;

    const activity = await Activity.create({
      userId: req.user._id,
      action,
      type: type || 'info',
      store,
      storeId,
      details,
      metadata
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ message: 'Error creating activity' });
  }
};

// @desc    Delete old activities (older than 30 days)
// @route   DELETE /api/activities/cleanup
// @access  Private
const cleanupOldActivities = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Activity.deleteMany({
      userId: req.user._id,
      createdAt: { $lt: thirtyDaysAgo }
    });

    res.json({ 
      message: 'Old activities cleaned up',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up activities:', error);
    res.status(500).json({ message: 'Error cleaning up activities' });
  }
};

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }

  return 'just now';
};

// Helper function to log activity (can be imported and used in other controllers)
const logActivity = async (userId, action, type, store = null, storeId = null, details = null, metadata = {}) => {
  try {
    await Activity.create({
      userId,
      action,
      type,
      store,
      storeId,
      details,
      metadata
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error - activity logging should not break main functionality
  }
};

module.exports = {
  getActivities,
  getRecentActivities,
  createActivity,
  cleanupOldActivities,
  logActivity // Export for use in other controllers
};