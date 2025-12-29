const playwrightService = require('../services/playwrightService');
const Cookie = require('../models/Cookie');
const logger = require('../utils/logger');

const cookieController = {
  /**
   * Generate cookies by logging in and extracting them
   */
  async generateCookies(req, res) {
    try {
      const { email, password, storeName } = req.body;

      // Validation
      if (!email || !password || !storeName) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and store name are required'
        });
      }

      logger.log('\n🎯 Starting cookie generation process...');
      logger.log(`📧 Email: ${email}`);
      logger.log(`🏪 Store: ${storeName}`);

      // Login and get cookies using Playwright
      const result = await playwrightService.loginAndGetCookies(
        email,
        password,
        storeName
      );

      if (!result.success) {
        throw new Error('Failed to generate cookies');
      }

      // Save to database
      logger.log('💾 Saving cookies to database...');
      
      // Check if cookies for this store already exist
      const existingCookie = await Cookie.findOne({ storeName });
      
      if (existingCookie) {
        // Update existing
        existingCookie.cookies = result.cookies;
        existingCookie.lastGenerated = new Date();
        existingCookie.isActive = true;
        await existingCookie.save();
        logger.log('✅ Updated existing cookies');
      } else {
        // Create new
        const newCookie = new Cookie({
          storeName,
          cookies: result.cookies,
          email,
          lastGenerated: new Date(),
          isActive: true
        });
        await newCookie.save();
        logger.log('✅ Created new cookie entry');
      }

      // Cleanup browser
      await playwrightService.cleanup();

      logger.log('✅ Cookie generation completed successfully!\n');

      res.json({
        success: true,
        message: 'Cookies generated successfully',
        data: {
          storeName: result.storeName,
          cookieCount: result.cookies.length,
          timestamp: result.timestamp
        }
      });

    } catch (error) {
      logger.error('❌ Error generating cookies:', error);
      
      // Cleanup on error
      await playwrightService.cleanup().catch(() => {});

      res.status(500).json({
        success: false,
        message: 'Failed to generate cookies',
        error: error.message
      });
    }
  },

  /**
   * Get all stored cookies
   */
  async getAllCookies(req, res) {
    try {
      const cookies = await Cookie.find()
        .select('-cookies') // Don't expose actual cookie values
        .sort({ lastGenerated: -1 });

      res.json({
        success: true,
        data: cookies
      });
    } catch (error) {
      logger.error('Error fetching cookies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cookies',
        error: error.message
      });
    }
  },

  /**
   * Get cookies for a specific store
   */
  async getCookiesByStore(req, res) {
    try {
      const { storeName } = req.params;

      const cookie = await Cookie.findOne({ storeName });

      if (!cookie) {
        return res.status(404).json({
          success: false,
          message: 'Cookies not found for this store'
        });
      }

      res.json({
        success: true,
        data: cookie
      });
    } catch (error) {
      logger.error('Error fetching cookies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cookies',
        error: error.message
      });
    }
  },

  /**
   * Validate stored cookies
   */
  async validateCookies(req, res) {
    try {
      const { storeName } = req.params;

      const cookie = await Cookie.findOne({ storeName });

      if (!cookie) {
        return res.status(404).json({
          success: false,
          message: 'Cookies not found for this store'
        });
      }

      logger.log(`\n🔍 Validating cookies for: ${storeName}`);

      // Validate using Playwright
      const isValid = await playwrightService.validateCookies(cookie.cookies);

      // Update status in database
      cookie.isActive = isValid;
      await cookie.save();

      // Cleanup
      await playwrightService.cleanup();

      logger.log(`✅ Validation complete: ${isValid ? 'VALID' : 'INVALID'}\n`);

      res.json({
        success: true,
        data: {
          storeName,
          isValid,
          lastGenerated: cookie.lastGenerated
        }
      });

    } catch (error) {
      logger.error('❌ Error validating cookies:', error);
      
      await playwrightService.cleanup().catch(() => {});

      res.status(500).json({
        success: false,
        message: 'Failed to validate cookies',
        error: error.message
      });
    }
  },

  /**
   * Delete cookies for a specific store
   */
  async deleteCookies(req, res) {
    try {
      const { storeName } = req.params;

      const result = await Cookie.findOneAndDelete({ storeName });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Cookies not found for this store'
        });
      }

      logger.log(`✅ Deleted cookies for: ${storeName}`);

      res.json({
        success: true,
        message: 'Cookies deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting cookies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete cookies',
        error: error.message
      });
    }
  },

  /**
   * Auto-generate cookies for all stores (cron job)
   */
  async autoGenerateCookies(req, res) {
    try {
      logger.log('\n🤖 Starting auto-generate process...');

      const stores = await Cookie.find();
      const results = [];

      for (const store of stores) {
        try {
          logger.log(`\n🔄 Processing: ${store.storeName}`);

          const result = await playwrightService.loginAndGetCookies(
            store.email,
            'stored_password', // You need to store password securely
            store.storeName
          );

          if (result.success) {
            store.cookies = result.cookies;
            store.lastGenerated = new Date();
            store.isActive = true;
            await store.save();

            results.push({
              storeName: store.storeName,
              success: true
            });

            logger.log(`✅ Success: ${store.storeName}`);
          }

        } catch (error) {
          logger.error(`❌ Failed: ${store.storeName}`, error.message);
          results.push({
            storeName: store.storeName,
            success: false,
            error: error.message
          });
        }
      }

      // Cleanup
      await playwrightService.cleanup();

      logger.log('\n✅ Auto-generate completed\n');

      res.json({
        success: true,
        message: 'Auto-generate completed',
        results
      });

    } catch (error) {
      logger.error('Error in auto-generate:', error);
      
      await playwrightService.cleanup().catch(() => {});

      res.status(500).json({
        success: false,
        message: 'Auto-generate failed',
        error: error.message
      });
    }
  }
};

module.exports = cookieController;