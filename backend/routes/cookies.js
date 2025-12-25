// backend/routes/cookies.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getCookies,
  getCookiesByStore,
  createCookie,
  importCookies,
  updateCookie,
  deleteCookie,
  deleteCookiesByStore,
  healthCheck  // ✅ NAMA INI MATCH dengan export di controller
} = require('../controllers/cookieController');

// ✅ Health check route - MUST be BEFORE /:id routes!
router.post('/health-check/:storeId', protect, healthCheck);

// Import route
router.post('/import', protect, importCookies);

// Get all cookies & create new cookie
router.route('/')
  .get(protect, getCookies)
  .post(protect, createCookie);

// Get cookies by store & delete all cookies by store
router.route('/store/:storeId')
  .get(protect, getCookiesByStore)
  .delete(protect, deleteCookiesByStore);

// Single cookie operations (update & delete)
router.route('/:id')
  .put(protect, updateCookie)
  .delete(protect, deleteCookie);

module.exports = router;