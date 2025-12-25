// backend/controllers/cookieController.js

const Cookie = require('../models/Cookie');
const Store = require('../models/Store');
const healthCheckService = require('../services/healthCheckService');
const { logActivity } = require('./activityController'); // ✅ ADD ACTIVITY LOG

// ==============================
// Get all cookies
// ==============================
const getCookies = async (req, res) => {
  try {
    const cookies = await Cookie.find().populate('storeId', 'name domain');
    res.json({
      success: true,
      count: cookies.length,
      data: cookies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cookies',
      error: error.message
    });
  }
};

// ==============================
// Get cookies by store
// ==============================
const getCookiesByStore = async (req, res) => {
  try {
    const cookies = await Cookie.find({ storeId: req.params.storeId });
    res.json({
      success: true,
      count: cookies.length,
      data: cookies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cookies for store',
      error: error.message
    });
  }
};

// ==============================
// Create single cookie
// ==============================
const createCookie = async (req, res) => {
  try {
    const {
      storeId,
      name,
      value,
      domain,
      path,
      expirationDate,
      httpOnly,
      secure,
      sameSite
    } = req.body;

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const cookie = await Cookie.create({
      storeId,
      userId: req.user._id,
      name,
      value,
      domain: domain || '.kasirpintar.co.id',
      path: path || '/',
      expirationDate,
      httpOnly: httpOnly || false,
      secure: secure || false,
      sameSite: sameSite || 'Lax'
    });

    store.lastSync = new Date();
    await store.save();

    // ✅ ACTIVITY LOG
    await logActivity(
      req.user._id,
      'Cookie created',
      'success',
      store.name,
      store._id
    );

    res.status(201).json({
      success: true,
      message: 'Cookie created successfully',
      data: cookie
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating cookie',
      error: error.message
    });
  }
};

// ==============================
// Import cookies (bulk)
// ==============================
const importCookies = async (req, res) => {
  try {
    const { storeId, cookies } = req.body;
    const userId = req.user._id;

    const store = await Store.findOne({ _id: storeId, user: userId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have access'
      });
    }

    if (!Array.isArray(cookies) || cookies.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cookies must be a non-empty array'
      });
    }

    await Cookie.deleteMany({ storeId, userId });

    const cookiesToInsert = cookies.map(cookie => ({
      storeId,
      userId,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || '.kasirpintar.co.id',
      path: cookie.path || '/',
      expirationDate: cookie.expirationDate
        ? new Date(cookie.expirationDate * 1000)
        : null,
      httpOnly: cookie.httpOnly || false,
      secure: cookie.secure || false,
      sameSite: cookie.sameSite || 'Lax'
    }));

    const insertedCookies = await Cookie.insertMany(cookiesToInsert);

    store.lastSync = new Date();
    await store.save();

    // ✅ ACTIVITY LOG
    await logActivity(
      req.user._id,
      'Cookies imported',
      'success',
      store.name,
      store._id
    );

    res.status(201).json({
      success: true,
      message: `${insertedCookies.length} cookies imported successfully`,
      count: insertedCookies.length,
      data: insertedCookies
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error importing cookies',
      error: error.message
    });
  }
};

// ==============================
// Update cookie
// ==============================
const updateCookie = async (req, res) => {
  try {
    const cookie = await Cookie.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!cookie) {
      return res.status(404).json({
        success: false,
        message: 'Cookie not found'
      });
    }

    const store = await Store.findById(cookie.storeId);
    if (store) {
      store.lastSync = new Date();
      await store.save();

      // ✅ ACTIVITY LOG
      await logActivity(
        req.user._id,
        'Cookie updated',
        'info',
        store.name,
        store._id
      );
    }

    res.json({
      success: true,
      message: 'Cookie updated successfully',
      data: cookie
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating cookie',
      error: error.message
    });
  }
};

// ==============================
// Delete single cookie
// ==============================
const deleteCookie = async (req, res) => {
  try {
    const cookie = await Cookie.findByIdAndDelete(req.params.id);

    if (!cookie) {
      return res.status(404).json({
        success: false,
        message: 'Cookie not found'
      });
    }

    const store = await Store.findById(cookie.storeId);
    if (store) {
      // ✅ ACTIVITY LOG
      await logActivity(
        req.user._id,
        'Cookie deleted',
        'warning',
        store.name,
        store._id
      );
    }

    res.json({
      success: true,
      message: 'Cookie deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting cookie',
      error: error.message
    });
  }
};

// ==============================
// Delete all cookies by store
// ==============================
const deleteCookiesByStore = async (req, res) => {
  try {
    const result = await Cookie.deleteMany({ storeId: req.params.storeId });

    // Fetch store for logging (optional safety)
    const store = await Store.findById(req.params.storeId);
    if (store) {
      await logActivity(
        req.user._id,
        'All cookies deleted',
        'warning',
        store.name,
        store._id
      );
    }

    res.json({
      success: true,
      message: `${result.deletedCount} cookies deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting cookies',
      error: error.message
    });
  }
};

// ==============================
// Health check cookies
// ==============================
const healthCheckCookies = async (req, res) => {
  try {
    const { storeId } = req.params;
    const userId = req.user._id;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required'
      });
    }

    const store = await Store.findOne({ _id: storeId, user: userId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have access'
      });
    }

    const result = await healthCheckService.checkCookiesHealth(storeId, userId);

    // ✅ ACTIVITY LOG (SUCCESS / WARNING)
    await logActivity(
      req.user._id,
      result.success ? 'Cookies health check success' : 'Cookies health check failed',
      result.success ? 'success' : 'warning',
      store.name,
      store._id
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Health check controller error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to perform health check',
      error: error.message
    });
  }
};

// ==============================
module.exports = {
  getCookies,
  getCookiesByStore,
  createCookie,
  importCookies,
  updateCookie,
  deleteCookie,
  deleteCookiesByStore,
  healthCheck: healthCheckCookies
};
