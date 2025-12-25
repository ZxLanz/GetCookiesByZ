const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // ✅ FIXED: correct path & destructure
const {
  getAllStores,
  getStore,
  createStore,
  updateStore,
  deleteStore,
  hasCredentials,
  generateCookies,
  syncCookies
} = require('../controllers/storeController');

// ✅ Apply auth to all routes
router.use(protect);

// Check credentials before showing modal (specific route first)
router.get('/:id/has-credentials', hasCredentials);

// Generate cookies (auto-detect credentials or show modal)
router.post('/:id/generate', generateCookies);

// Sync cookies to database
router.post('/:id/sync', syncCookies);

// CRUD routes
router.get('/', getAllStores);
router.post('/', createStore);
router.get('/:id', getStore);
router.put('/:id', updateStore);
router.delete('/:id', deleteStore);

module.exports = router;