// backend/services/puppeteerService.js
// ✅ SERVERLESS-READY: Puppeteer + Stealth + @sparticuz/chromium

const logger = console;

// Helper: Wait function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ✅ Dynamic import based on environment
const getBrowserInstance = async () => {
  const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // VERCEL: Use puppeteer-core + @sparticuz/chromium
    const puppeteer = require('puppeteer-core');
    const chromium = require('@sparticuz/chromium');
    
    // ⚠️ CRITICAL: Set chromium flags for Vercel
    await chromium.font(
      'https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf'
    );
    
    return {
      puppeteer,
      executablePath: await chromium.executablePath(),
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--single-process', // ✅ Critical for Vercel
        '--no-zygote' // ✅ Critical for Vercel
      ],
      headless: chromium.headless, // Use chromium's headless setting
      ignoreHTTPSErrors: true,
      defaultViewport: chromium.defaultViewport
    };
  } else {
    // LOCAL: Use regular puppeteer with stealth
    const puppeteer = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteer.use(StealthPlugin());
    
    return {
      puppeteer,
      executablePath: undefined, // Use bundled Chromium
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080'
      ],
      headless: false // Show browser locally for debugging
    };
  }
};

class PuppeteerService {
  static async loginAndGetCookies(email, password, domain) {
    let browser = null;
    let page = null;

    try {
      logger.log('🚀 Initializing browser...');
      
      // Get browser configuration
      const { puppeteer, executablePath, args, headless, defaultViewport } = await getBrowserInstance();
      
      const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
      logger.log(`🔧 Environment: ${isProduction ? 'PRODUCTION (Vercel)' : 'LOCAL'}`);
      logger.log(`🔧 Headless: ${headless}`);
      logger.log(`🔧 Executable: ${executablePath || 'Bundled Chromium'}`);

      // Launch browser
      browser = await puppeteer.launch({
        executablePath,
        args,
        headless,
        defaultViewport: defaultViewport || {
          width: 1920,
          height: 1080
        },
        ignoreHTTPSErrors: true,
        ...(isProduction && {
          // Extra settings for Vercel serverless
          timeout: 0,
          protocolTimeout: 240000
        })
      });

      logger.log('✅ Browser launched successfully');

      page = await browser.newPage();

      // Set user agent to look more human
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });

      logger.log(`🍪 Target domain: ${domain}`);
      logger.log('🌐 Navigating to Kasir Pintar login page...');

      // Navigate with retries
      let navigationSuccess = false;
      let retries = 3;
      let lastError = null;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          logger.log(`🔄 Attempt ${attempt}/${retries} to load login page...`);
          
          await page.goto('https://kasirpintar.co.id/login', {
            waitUntil: 'networkidle0',
            timeout: 60000
          });
          
          navigationSuccess = true;
          logger.log('✅ Page loaded successfully');
          break;
        } catch (navError) {
          lastError = navError;
          logger.warn(`⚠️ Attempt ${attempt} failed: ${navError.message}`);
          
          if (attempt < retries) {
            logger.log('🔄 Retrying in 3 seconds...');
            await sleep(3000);
          }
        }
      }

      if (!navigationSuccess) {
        return {
          success: false,
          error: `Failed to load login page after ${retries} attempts: ${lastError.message}`
        };
      }

      logger.log(`🔗 Current URL: ${page.url()}`);

      // Wait for page to stabilize
      await sleep(3000);

      // Wait for email input
      try {
        logger.log('⏳ Waiting for login form elements...');
        await page.waitForSelector('input[name="email"]', {
          timeout: 30000,
          visible: true
        });
        logger.log('✅ Email input found');
      } catch (error) {
        logger.error('❌ Email input not found');
        return {
          success: false,
          error: 'Login form not found - page might be blocked or down'
        };
      }

      // Human-like behavior: Move mouse randomly
      await page.mouse.move(Math.random() * 500, Math.random() * 500);
      await sleep(500);

      // Fill email with human-like typing
      logger.log('✏️ Filling email...');
      await page.click('input[name="email"]');
      await sleep(300);
      await page.type('input[name="email"]', email, { 
        delay: Math.floor(Math.random() * 50) + 50
      });
      await sleep(500);

      // Fill password
      logger.log('🔐 Filling password...');
      await page.click('input[name="password"]');
      await sleep(300);
      await page.type('input[name="password"]', password, { 
        delay: Math.floor(Math.random() * 50) + 50
      });
      await sleep(800);

      // Verify inputs filled
      const emailValue = await page.$eval('input[name="email"]', el => el.value);
      const passwordValue = await page.$eval('input[name="password"]', el => el.value);
      
      logger.log(`📧 Email filled: ${emailValue}`);
      logger.log(`🔑 Password filled: ${passwordValue ? '***' : 'EMPTY'}`);

      if (!emailValue || !passwordValue) {
        return {
          success: false,
          error: 'Failed to fill credentials'
        };
      }

      // ⭐ CRITICAL: Wait for Cloudflare Turnstile
      logger.log('⏳ Waiting for Cloudflare Turnstile widget...');
      
      // Wait for turnstile widget to appear
      try {
        await page.waitForSelector('#myWidget', { timeout: 10000 });
        logger.log('✅ Turnstile widget found');
      } catch (e) {
        logger.warn('⚠️ Turnstile widget not found, continuing anyway...');
      }
      
      // Wait for turnstile to solve (up to 30 seconds)
      logger.log('⏳ Waiting for Turnstile to solve...');
      let turnstileSolved = false;
      let maxWait = 30; // 30 seconds max
      
      for (let i = 0; i < maxWait; i++) {
        await sleep(1000);
        
        // Check if button is enabled (means turnstile solved)
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
        logger.warn('⚠️ Turnstile did not solve in 30 seconds');
        return {
          success: false,
          error: 'Cloudflare Turnstile challenge failed - automation detected or timeout'
        };
      }
      
      // Extra wait for safety
      await sleep(2000);

      // Click login button
      logger.log('🖱️ Clicking login button...');
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      logger.log('⏳ Waiting for login to complete...');
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        sleep(30000)
      ]);

      // Additional wait for any redirects
      await sleep(3000);

      const currentUrl = page.url();
      logger.log(`🔗 Current URL after login: ${currentUrl}`);

      // Check if still on login page
      if (currentUrl.includes('login')) {
        // Try to get error message
        const errorMsg = await page.$eval(
          '.error, .alert-danger, [role="alert"], .text-red-500',
          el => el.textContent
        ).catch(() => null);

        return {
          success: false,
          error: errorMsg 
            ? `Login failed: ${errorMsg.trim()}` 
            : 'Login failed - still on login page. Check credentials or Cloudflare blocked.'
        };
      }

      logger.log('✅ Login successful!');

      // Wait for dashboard to load
      await sleep(3000);

      // Extract cookies
      logger.log('🍪 Extracting cookies...');
      const cookies = await page.cookies();

      // Filter relevant cookies (exclude tracking cookies)
      const relevantCookies = cookies.filter(cookie => {
        const irrelevantPrefixes = ['_ga', '_gid', '_fbp', '_gat', '_gcl', '__'];
        return !irrelevantPrefixes.some(prefix => cookie.name.startsWith(prefix)) &&
               cookie.name.length > 0;
      });

      logger.log(`✅ Got ${relevantCookies.length} relevant cookies from ${cookies.length} total`);

      // Format cookies for database
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

      logger.log(`📊 Formatted ${formattedCookies.length} cookies`);

      return {
        success: true,
        cookies: formattedCookies
      };

    } catch (error) {
      logger.error('❌ Error in loginAndGetCookies:');
      logger.error(error.message);
      logger.error(error.stack);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };

    } finally {
      if (page) {
        try {
          await page.close();
          logger.log('✅ Page closed');
        } catch (err) {
          logger.warn('⚠️ Error closing page:', err.message);
        }
      }

      if (browser) {
        try {
          await browser.close();
          logger.log('✅ Browser closed');
        } catch (err) {
          logger.warn('⚠️ Error closing browser:', err.message);
        }
      }
    }
  }

  static async validateCookies(cookies) {
    let browser = null;
    let page = null;

    try {
      logger.log('🔍 Validating cookies...');

      const { puppeteer, executablePath, args } = await getBrowserInstance();

      browser = await puppeteer.launch({
        executablePath,
        args,
        headless: true,
        defaultViewport: { width: 1920, height: 1080 }
      });

      page = await browser.newPage();

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
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await sleep(2000);

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