// backend/services/puppeteerService.js
// Vercel-optimized version with @sparticuz/chromium
// Optimized for 1024MB memory limit

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const logger = console;

// Helper: Wait function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Check if running on Vercel
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV || process.env.NODE_ENV === 'production';

class PuppeteerService {
  static async getBrowserConfig() {
    if (isVercel) {
      logger.log('🔧 Configuring for VERCEL environment (1024MB)');
      
      // Force chromium args for Vercel with memory optimization
      chromium.setGraphicsMode = false;
      chromium.setHeadlessMode = true;
      
      return {
        executablePath: await chromium.executablePath(),
        args: [
          ...chromium.args,
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
          '--single-process', // CRITICAL for low memory
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security', // Reduce memory overhead
          '--disable-features=IsolateOrigins,site-per-process', // Reduce process isolation overhead
          '--js-flags=--max-old-space-size=460' // Limit Node.js heap to ~460MB (leave room for Chromium)
        ],
        defaultViewport: {
          width: 1280, // Reduced from 1920
          height: 720  // Reduced from 1080
        },
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
        timeout: 30000 // Reduced from 60s
      };
    } else {
      logger.log('🔧 Configuring for LOCAL environment');
      
      return {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        },
        headless: 'new',
        ignoreHTTPSErrors: true,
        timeout: 60000
      };
    }
  }

  static async loginAndGetCookies(email, password, domain) {
    let browser = null;
    let page = null;

    try {
      logger.log('🚀 Initializing browser...');
      logger.log(`🔧 Environment: ${isVercel ? 'PRODUCTION (Vercel)' : 'LOCAL'}`);

      const launchOptions = await this.getBrowserConfig();
      
      logger.log('🔧 Browser config:', JSON.stringify({
        executablePath: launchOptions.executablePath ? 'SET' : 'NOT SET',
        argsCount: launchOptions.args?.length || 0,
        headless: launchOptions.headless
      }));

      logger.log('🔧 Launching browser...');
      browser = await puppeteer.launch(launchOptions);
      logger.log('✅ Browser launched successfully');

      page = await browser.newPage();

      // Disable unnecessary features to save memory
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        // Block images, fonts, stylesheets to save memory
        if (['image', 'font', 'stylesheet'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
      );

      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      });

      logger.log(`🌐 Navigating to Kasir Pintar login page...`);

      // Navigate with retries (reduced timeout for memory efficiency)
      let navigationSuccess = false;
      const maxRetries = 2; // Reduced from 3
      let lastError = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.log(`🔄 Attempt ${attempt}/${maxRetries}...`);
          
          await page.goto('https://kasirpintar.co.id/login', {
            waitUntil: 'domcontentloaded', // Changed from 'networkidle0' to save time
            timeout: 30000 // Reduced from 45s
          });
          
          navigationSuccess = true;
          logger.log('✅ Page loaded successfully');
          break;
        } catch (navError) {
          lastError = navError;
          logger.warn(`⚠️ Attempt ${attempt} failed: ${navError.message}`);
          
          if (attempt < maxRetries) {
            await sleep(2000); // Reduced from 3s
          }
        }
      }

      if (!navigationSuccess) {
        throw new Error(`Failed to load login page: ${lastError.message}`);
      }

      // Wait for page to stabilize
      await sleep(1500); // Reduced from 2s

      // Wait for email input
      logger.log('⏳ Waiting for login form...');
      try {
        await page.waitForSelector('input[name="email"]', {
          timeout: 20000, // Reduced from 30s
          visible: true
        });
        logger.log('✅ Login form found');
      } catch (error) {
        throw new Error('Login form not found - page might be blocked');
      }

      // Fill email
      logger.log('✏️ Filling email...');
      await page.click('input[name="email"]');
      await sleep(200); // Reduced from 300ms
      await page.type('input[name="email"]', email, { 
        delay: Math.floor(Math.random() * 30) + 30 // Reduced delay
      });
      await sleep(400); // Reduced from 500ms

      // Fill password
      logger.log('🔐 Filling password...');
      await page.click('input[name="password"]');
      await sleep(200); // Reduced from 300ms
      await page.type('input[name="password"]', password, { 
        delay: Math.floor(Math.random() * 30) + 30 // Reduced delay
      });
      await sleep(600); // Reduced from 800ms

      // Verify inputs
      const emailValue = await page.$eval('input[name="email"]', el => el.value);
      const passwordValue = await page.$eval('input[name="password"]', el => el.value);
      
      logger.log(`📧 Email: ${emailValue}`);
      logger.log(`🔑 Password: ${passwordValue ? '***' : 'EMPTY'}`);

      if (!emailValue || !passwordValue) {
        throw new Error('Failed to fill credentials');
      }

      // Wait for Cloudflare Turnstile
      logger.log('⏳ Waiting for Turnstile challenge...');
      
      let turnstileSolved = false;
      const maxWaitTime = 35; // Reduced from 45s to fit within 10s function limit

      for (let i = 0; i < maxWaitTime; i++) {
        await sleep(1000);
        
        // Check if login button is enabled (turnstile solved)
        const isEnabled = await page.$eval(
          'button[type="submit"]',
          btn => !btn.disabled
        ).catch(() => false);
        
        if (isEnabled) {
          logger.log(`✅ Turnstile solved after ${i + 1} seconds`);
          turnstileSolved = true;
          break;
        }
        
        if (i % 5 === 0 && i > 0) {
          logger.log(`⏳ Still waiting... ${i}s elapsed`);
        }
      }
      
      if (!turnstileSolved) {
        throw new Error('Turnstile challenge timeout - automation detected or network issue');
      }
      
      // Extra wait for safety
      await sleep(1500); // Reduced from 2s

      // Click login button
      logger.log('🖱️ Clicking login button...');
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      logger.log('⏳ Waiting for login to complete...');
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }), // Changed from networkidle0
        sleep(20000) // Reduced from 30s
      ]);

      await sleep(2000); // Reduced from 3s

      const currentUrl = page.url();
      logger.log(`🔗 Current URL: ${currentUrl}`);

      // Check if login successful
      if (currentUrl.includes('login')) {
        const errorMsg = await page.$eval(
          '.error, .alert-danger, [role="alert"], .text-red-500',
          el => el.textContent
        ).catch(() => null);

        throw new Error(
          errorMsg 
            ? `Login failed: ${errorMsg.trim()}` 
            : 'Login failed - incorrect credentials or blocked by Cloudflare'
        );
      }

      logger.log('✅ Login successful!');
      await sleep(1500); // Reduced from 2s

      // Extract cookies
      logger.log('🍪 Extracting cookies...');
      const cookies = await page.cookies();

      // Filter relevant cookies
      const relevantCookies = cookies.filter(cookie => {
        const irrelevantPrefixes = ['_ga', '_gid', '_fbp', '_gat', '_gcl', '__'];
        return !irrelevantPrefixes.some(prefix => cookie.name.startsWith(prefix));
      });

      logger.log(`✅ Got ${relevantCookies.length} relevant cookies (${cookies.length} total)`);

      // Format cookies
      const formattedCookies = relevantCookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain || `.${domain}`,
        path: cookie.path || '/',
        expires: cookie.expires 
          ? new Date(cookie.expires * 1000) 
          : null,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
        sameSite: cookie.sameSite || 'Lax'
      }));

      return {
        success: true,
        cookies: formattedCookies
      };

    } catch (error) {
      logger.error('❌ Error in loginAndGetCookies:');
      logger.error('Error name:', error.name);
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };

    } finally {
      if (page) {
        await page.close().catch(err => {
          logger.warn('⚠️ Error closing page:', err.message);
        });
      }

      if (browser) {
        await browser.close().catch(err => {
          logger.warn('⚠️ Error closing browser:', err.message);
        });
      }
      
      logger.log('✅ Cleanup completed');
    }
  }

  static async validateCookies(cookies) {
    let browser = null;
    let page = null;

    try {
      logger.log('🔍 Validating cookies...');

      const launchOptions = await this.getBrowserConfig();
      browser = await puppeteer.launch(launchOptions);
      page = await browser.newPage();

      // Disable unnecessary features
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'font', 'stylesheet'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Convert cookies to Puppeteer format
      const puppeteerCookies = cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain || '.kasirpintar.co.id',
        path: c.path || '/',
        expires: c.expirationDate 
          ? Math.floor(new Date(c.expirationDate).getTime() / 1000)
          : undefined,
        httpOnly: c.httpOnly || false,
        secure: c.secure || false,
        sameSite: c.sameSite || 'Lax'
      }));

      await page.setCookie(...puppeteerCookies);
      logger.log(`🍪 Set ${puppeteerCookies.length} cookies`);

      const response = await page.goto('https://kasirpintar.co.id/dashboard', {
        waitUntil: 'domcontentloaded', // Changed from networkidle0
        timeout: 20000 // Reduced from 30s
      });

      await sleep(1500); // Reduced from 2s

      const currentUrl = page.url();

      if (currentUrl.includes('login')) {
        logger.warn('⚠️ Cookies invalid - redirected to login');
        return false;
      }

      if (response && response.status() === 200) {
        logger.log('✅ Cookies are valid');
        return true;
      }

      logger.warn(`⚠️ Unexpected status: ${response?.status()}`);
      return false;

    } catch (error) {
      logger.error('❌ Validation error:', error.message);
      return false;

    } finally {
      if (page) await page.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }
}

module.exports = {
  loginAndGetCookies: (email, password, domain) => 
    PuppeteerService.loginAndGetCookies(email, password, domain),
  validateCookies: (cookies) => 
    PuppeteerService.validateCookies(cookies)
};