// backend/controllers/storeController.js

const Store = require('../models/Store');
const Cookie = require('../models/Cookie');
const puppeteerService = require('../services/puppeteerService');
const { logActivity } = require('./activityController'); // ✅ ADD ACTIVITY LOG

// ==============================
// Get all stores
// ==============================
exports.getAllStores = async (req, res) => {
  try {
    const stores = await Store.find({ user: req.user._id })
      .select('-encryptedEmail -encryptedPassword')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      stores
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stores',
      error: error.message
    });
  }
};

// ==============================
// Get single store
// ==============================
exports.getStore = async (req, res) => {
  try {
    const store = await Store.findOne({
      _id: req.params.id,
      user: req.user._id
    }).select('-encryptedEmail -encryptedPassword');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    res.json({
      success: true,
      store
    });
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch store',
      error: error.message
    });
  }
};

// ==============================
// Create store
// ==============================
exports.createStore = async (req, res) => {
  try {
    const { name, domain, status } = req.body;

    const store = await Store.create({
      name,
      domain,
      user: req.user._id,
      status: status || 'inactive',
      cookies: []
    });

    console.log(`✅ Store created: ${name}`);

    // ✅ ACTIVITY LOG
    await logActivity(
      req.user._id,
      'New store added',
      'success',
      store.name,
      store._id
    );

    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      store
    });
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create store',
      error: error.message
    });
  }
};

// ==============================
// Update store
// ==============================
exports.updateStore = async (req, res) => {
  try {
    const { name, domain, status } = req.body;

    const store = await Store.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { name, domain, status },
      { new: true }
    ).select('-encryptedEmail -encryptedPassword');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    console.log(`✅ Store updated: ${name}`);

    // ✅ ACTIVITY LOG
    await logActivity(
      req.user._id,
      'Store updated',
      'info',
      store.name,
      store._id
    );

    res.json({
      success: true,
      message: 'Store updated successfully',
      store
    });
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update store',
      error: error.message
    });
  }
};

// ==============================
// Delete store
// ==============================
exports.deleteStore = async (req, res) => {
  try {
    const store = await Store.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    await Cookie.deleteMany({ storeId: req.params.id });
    console.log(`🗑️ Store and all cookies deleted: ${store.name}`);

    // ✅ ACTIVITY LOG
    await logActivity(
      req.user._id,
      'Store deleted',
      'warning',
      store.name,
      store._id
    );

    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete store',
      error: error.message
    });
  }
};

// ==============================
// Check credentials
// ==============================
exports.hasCredentials = async (req, res) => {
  try {
    const store = await Store.findOne({
      _id: req.params.id,
      user: req.user._id
    }).select('encryptedEmail encryptedPassword name');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const hasCredentials = !!(
      store.encryptedEmail && store.encryptedPassword
    );

    let email = null;
    if (hasCredentials) {
      try {
        email = store.decryptPassword(store.encryptedEmail);
      } catch (err) {
        console.error('❌ Failed to decrypt email:', err.message);
      }
    }

    res.json({
      success: true,
      hasCredentials,
      email: hasCredentials ? email : null
    });
  } catch (error) {
    console.error('Error checking credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check credentials',
      error: error.message
    });
  }
};

// ==============================
// Generate cookies
// ==============================
exports.generateCookies = async (req, res) => {
  try {
    const { email, password } = req.body;

    const store = await Store.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const result = await puppeteerService.loginAndGetCookies(
      email || store.decryptPassword(store.encryptedEmail),
      password || store.decryptPassword(store.encryptedPassword),
      store.domain
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    await Cookie.deleteMany({ storeId: store._id, userId: req.user._id });

    await Cookie.insertMany(
      result.cookies.map((cookie) => ({
        storeId: store._id,
        userId: req.user._id,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain || store.domain,
        path: cookie.path || '/',
        expirationDate: cookie.expires
          ? new Date(cookie.expires * 1000)
          : null,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
        sameSite: cookie.sameSite || 'Lax'
      }))
    );

    store.lastCookieUpdate = new Date();
    store.status = 'active';
    await store.save();

    // ✅ ACTIVITY LOG
    await logActivity(
      req.user._id,
      'Cookies generated',
      'success',
      store.name,
      store._id
    );

    res.json({
      success: true,
      message: 'Cookies generated successfully'
    });
  } catch (error) {
    console.error('Error generating cookies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate cookies',
      error: error.message
    });
  }
};

// ==============================
// Sync cookies
// ==============================
exports.syncCookies = async (req, res) => {
  try {
    const store = await Store.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const email = store.decryptPassword(store.encryptedEmail);
    const password = store.decryptPassword(store.encryptedPassword);

    const result = await puppeteerService.loginAndGetCookies(
      email,
      password,
      store.domain
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    await Cookie.deleteMany({ storeId: store._id, userId: req.user._id });

    await Cookie.insertMany(
      result.cookies.map((cookie) => ({
        storeId: store._id,
        userId: req.user._id,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain || store.domain,
        path: cookie.path || '/',
        expirationDate: cookie.expires
          ? new Date(cookie.expires * 1000)
          : null,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
        sameSite: cookie.sameSite || 'Lax'
      }))
    );

    store.lastCookieUpdate = new Date();
    store.status = 'active';
    await store.save();

    // ✅ ACTIVITY LOG
    await logActivity(
      req.user._id,
      'Cookies synced',
      'success',
      store.name,
      store._id
    );

    res.json({
      success: true,
      message: 'Cookies synced successfully'
    });
  } catch (error) {
    console.error('Error syncing cookies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync cookies',
      error: error.message
    });
  }
};

// ==============================
console.log('📦 Store Controller loaded successfully');
