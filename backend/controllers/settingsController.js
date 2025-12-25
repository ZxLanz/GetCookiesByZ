const User = require('../models/User');

// @desc    Get user settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('settings');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.settings || {
        autoSyncEnabled: false,
        autoSyncInterval: 60,
        lastAutoSync: null
      }
    });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};

// @desc    Update user settings
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res) => {
  try {
    const { autoSyncEnabled, autoSyncInterval } = req.body;

    // Validation
    if (autoSyncInterval !== undefined) {
      if (autoSyncInterval < 5 || autoSyncInterval > 1440) {
        return res.status(400).json({
          success: false,
          message: 'Sync interval harus antara 5-1440 menit'
        });
      }
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update settings
    if (autoSyncEnabled !== undefined) {
      user.settings.autoSyncEnabled = autoSyncEnabled;
    }
    if (autoSyncInterval !== undefined) {
      user.settings.autoSyncInterval = autoSyncInterval;
    }

    // If auto-sync is being enabled for the first time, set lastAutoSync to now
    if (autoSyncEnabled && !user.settings.lastAutoSync) {
      user.settings.lastAutoSync = new Date();
    }

    await user.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: user.settings
    });
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};

// @desc    Trigger manual sync for user
// @route   POST /api/settings/sync-now
// @access  Private
const syncNow = async (req, res) => {
  try {
    const userId = req.user._id;
    const Store = require('../models/Store');
    const healthCheckService = require('../services/healthCheckService');

    // Get all user stores
    const stores = await Store.find({ userId });

    if (stores.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada toko untuk disinkronkan'
      });
    }

    console.log(`🔄 Manual sync triggered for user ${req.user.email}`);

    // Run health check for all stores
    const results = [];
    for (const store of stores) {
      try {
        const result = await healthCheckService.checkCookiesHealth(store._id, userId);
        results.push({
          storeId: store._id,
          storeName: store.name,
          success: result.success,
          validCookies: result.data?.validCookies || 0,
          expiredCookies: result.data?.expiredCookies || 0
        });
      } catch (error) {
        results.push({
          storeId: store._id,
          storeName: store.name,
          success: false,
          error: error.message
        });
      }
    }

    // Update lastAutoSync
    const user = await User.findById(userId);
    user.settings.lastAutoSync = new Date();
    await user.save();

    res.json({
      success: true,
      message: `Sync selesai untuk ${stores.length} toko`,
      data: {
        syncedStores: stores.length,
        results,
        lastSync: user.settings.lastAutoSync
      }
    });
  } catch (error) {
    console.error('Sync Now Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync',
      error: error.message
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  syncNow
};