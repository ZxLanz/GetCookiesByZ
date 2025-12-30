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

// ✅ OPTIONS handler for CORS preflight (BEFORE protect middleware)
router.options('/generate', (req, res) => {
  res.status(200).end();
});

router.options('/auto-generate', (req, res) => {
  res.status(200).end();
});

router.options('/validate/:storeName', (req, res) => {
  res.status(200).end();
});

router.options('/:storeName', (req, res) => {
  res.status(200).end();
});

router.options('/store/:storeName', (req, res) => {
  res.status(200).end();
});

// ✅ All routes are protected
router.use(protect);

// ✅ Main routes
router.post('/generate', generateCookies);
router.post('/auto-generate', autoGenerateCookies);
router.get('/', getAllCookies);
router.get('/store/:storeName', getCookiesByStore);
router.post('/validate/:storeName', validateCookies);
router.delete('/:storeName', deleteCookies);

module.exports = router;