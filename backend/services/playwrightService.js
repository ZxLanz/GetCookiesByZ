const { chromium } = require('playwright-core');
const logger = require('../utils/logger');

class PlaywrightService {
  constructor() {
    this.browser = null;
    this.isVercel = process.env.VERCEL === '1';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Get browser launch configuration based on environment
   */
  getBrowserConfig() {
    const baseConfig = {
      headless: true,
      ignoreHTTPSErrors: true,
      timeout: 30000
    };

    if (this.isVercel || this.isProduction) {
      logger.log('🔧 Configuring for PRODUCTION (Vercel/Serverless)');
      
      return {
        ...baseConfig,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--js-flags=--max-old-space-size=460'
        ]
      };
    }

    // Local development
    logger.log('🔧 Configuring for LOCAL development');
    return {
      ...baseConfig,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    };
  }

  /**
   * Launch browser with stealth configuration
   */
  async launchBrowser() {
    try {
      logger.log('🚀 Initializing Playwright browser...');
      logger.log(`🔧 Environment: ${this.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
      
      const config = this.getBrowserConfig();
      this.browser = await chromium.launch(config);
      
      logger.log('✅ Browser launched successfully');
      return this.browser;
    } catch (error) {
      logger.error('❌ Failed to launch browser:', error);
      throw new Error(`Browser launch failed: ${error.message}`);
    }
  }

  /**
   * Create a new page with stealth settings
   */
  async createStealthPage() {
    if (!this.browser) {
      await this.launchBrowser();
    }

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'id-ID',
      timezoneId: 'Asia/Jakarta',
      permissions: ['geolocation'],
      geolocation: { latitude: -6.2088, longitude: 106.8456 }, // Jakarta
      extraHTTPHeaders: {
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    const page = await context.newPage();

    // Inject stealth scripts to hide automation
    await page.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Mock chrome object
      window.chrome = {
        runtime: {},
      };

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['id-ID', 'id', 'en-US', 'en'],
      });

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    logger.log('✅ Stealth page created');
    return page;
  }

  /**
   * Login to Kasir Pintar and get cookies
   */
  async loginAndGetCookies(email, password, storeName, maxRetries = 2) {
    let page;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        logger.log(`\n🔄 Attempt ${attempt}/${maxRetries}`);

        page = await this.createStealthPage();
        
        // Block unnecessary resources to save memory and bandwidth
        await page.route('**/*', (route) => {
          const resourceType = route.request().resourceType();
          if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            route.abort();
          } else {
            route.continue();
          }
        });

        logger.log('🌐 Navigating to Kasir Pintar login page...');
        await page.goto('https://kasirpintar.co.id/auth/login', {
          waitUntil: 'domcontentloaded',
          timeout: 25000
        });
        logger.log('✅ Page loaded successfully');

        // Wait for login form
        logger.log('⏳ Waiting for login form...');
        await page.waitForSelector('input[type="email"]', { timeout: 15000 });
        logger.log('✅ Login form found');

        // Fill email
        logger.log('✏️ Filling email...');
        await page.fill('input[type="email"]', email);
        await page.waitForTimeout(300);

        // Fill password
        logger.log('🔐 Filling password...');
        await page.fill('input[type="password"]', password);
        await page.waitForTimeout(300);

        // Wait for Cloudflare Turnstile challenge
        logger.log('⏳ Waiting for Turnstile challenge...');
        const turnstileFrame = page.frameLocator('iframe[src*="challenges.cloudflare.com"]');
        
        try {
          await turnstileFrame.locator('body').waitFor({ timeout: 5000 });
          logger.log('🔄 Turnstile detected, waiting for solve...');
          
          // Wait for turnstile to complete (max 35 seconds)
          let turnstileSolved = false;
          for (let i = 0; i < 35; i++) {
            await page.waitForTimeout(1000);
            
            // Check if turnstile is solved by looking for success indicator
            const isSolved = await page.evaluate(() => {
              const iframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
              return !iframe || iframe.style.display === 'none' || iframe.offsetParent === null;
            });
            
            if (isSolved) {
              turnstileSolved = true;
              logger.log(`✅ Turnstile solved after ${i + 1} seconds`);
              break;
            }
          }
          
          if (!turnstileSolved) {
            throw new Error('Turnstile timeout after 35 seconds');
          }
        } catch (error) {
          if (error.message.includes('timeout')) {
            logger.log('ℹ️ No Turnstile detected, proceeding...');
          }
        }

        // Click login button
        logger.log('🖱️ Clicking login button...');
        await page.click('button[type="submit"]');

        // Wait for navigation after login
        logger.log('⏳ Waiting for login to complete...');
        await Promise.race([
          page.waitForURL('**/dashboard**', { timeout: 20000 }),
          page.waitForURL('**/stores**', { timeout: 20000 }),
          page.waitForTimeout(20000)
        ]);

        // Check if login was successful
        const currentUrl = page.url();
        if (currentUrl.includes('login')) {
          throw new Error('Login failed - still on login page');
        }

        logger.log('✅ Login successful!');

        // Get all cookies
        logger.log('🍪 Extracting cookies...');
        const context = page.context();
        const allCookies = await context.cookies();

        // Filter relevant cookies
        const relevantCookies = allCookies.filter(cookie => 
          cookie.domain.includes('kasirpintar') ||
          cookie.name.toLowerCase().includes('token') ||
          cookie.name.toLowerCase().includes('session') ||
          cookie.name.toLowerCase().includes('auth')
        );

        logger.log(`✅ Got ${relevantCookies.length} relevant cookies (${allCookies.length} total)`);

        // Format cookies
        const formattedCookies = relevantCookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite
        }));

        // Close page
        await page.close();

        return {
          success: true,
          cookies: formattedCookies,
          storeName: storeName,
          timestamp: new Date()
        };

      } catch (error) {
        logger.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (page) {
          await page.close().catch(() => {});
        }

        if (attempt >= maxRetries) {
          throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
        }

        logger.log('🔄 Retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Validate cookies by making a test request
   */
  async validateCookies(cookies) {
    let page;

    try {
      logger.log('🔍 Validating cookies...');
      
      page = await this.createStealthPage();
      
      // Set cookies
      const context = page.context();
      await context.addCookies(cookies);

      // Try to access dashboard
      await page.goto('https://kasirpintar.co.id/dashboard', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      // Check if we're still logged in
      const currentUrl = page.url();
      const isValid = !currentUrl.includes('login');

      await page.close();

      if (isValid) {
        logger.log('✅ Cookies are valid');
      } else {
        logger.log('❌ Cookies are invalid or expired');
      }

      return isValid;

    } catch (error) {
      logger.error('❌ Cookie validation failed:', error.message);
      if (page) {
        await page.close().catch(() => {});
      }
      return false;
    }
  }

  /**
   * Close browser and cleanup
   */
  async cleanup() {
    try {
      if (this.browser) {
        logger.log('🧹 Closing browser...');
        await this.browser.close();
        this.browser = null;
        logger.log('✅ Browser closed');
      }
    } catch (error) {
      logger.error('❌ Error during cleanup:', error.message);
    }
  }
}

module.exports = new PlaywrightService();