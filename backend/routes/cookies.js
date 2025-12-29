// backend/routes/cookies.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  generateCookies,
  getAllCookies,
  getCookiesByStore,
  validateCookies,
  deleteCookies,
  autoGenerateCookies
} = require('../controllers/cookieController');

// All routes are protected
router.use(protect);

// POST /api/cookies/generate - Generate new cookies
router.post('/generate', generateCookies);

// POST /api/cookies/auto-generate - Auto-generate for all stores (cron)
router.post('/auto-generate', autoGenerateCookies);

// GET /api/cookies - Get all cookies
router.get('/', getAllCookies);

// GET /api/cookies/store/:storeName - Get cookies by store name
router.get('/store/:storeName', getCookiesByStore);

// POST /api/cookies/validate/:storeName - Validate cookies
router.post('/validate/:storeName', validateCookies);

// DELETE /api/cookies/:storeName - Delete cookies
router.delete('/:storeName', deleteCookies);

module.exports = router;