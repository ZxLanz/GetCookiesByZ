// backend/services/puppeteerService.js
// ✅ Fixed return format to match controller expectations

const { connect } = require('puppeteer-real-browser');

const logger = console;

// Helper: Wait function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class PuppeteerService {
  static async loginAndGetCookies(email, password, domain) {
    let browser = null;
    let page = null;

    try {
      logger.log('🚀 Starting Real Browser (puppeteer-real-browser)...');

      const { browser: realBrowser, page: realPage } = await connect({
        headless: process.env.HEADLESS_MODE === 'false' ? false : true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=800,600',
          '--window-position=-2400,-2400',
          '--window-size=1920,1080',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-resources'
        ],
        turnstile: true,
        disableXvfb: true,
        customConfig: {
          viewport: {
            width: 1920,
            height: 1080
          }
        },
        executablePath: process.env.CHROME_PATH || undefined
      });

      browser = realBrowser;
      page = realPage;

      logger.log('✅ Real Browser launched successfully');
      logger.log(`🔍 Browser Mode: ${process.env.HEADLESS_MODE === 'false' ? 'Non-Headless (Visible)' : 'Headless'}`);
      logger.log(`🏪 Target domain: ${domain}`);

      logger.log('🌐 Navigating to Kasir Pintar login page...');
      
      // Try to navigate with retries
      let navigationSuccess = false;
      let retries = 3;
      let lastError = null;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          logger.log(`🔄 Attempt ${attempt}/${retries} to load login page...`);
          
          await page.goto('https://kasirpintar.co.id/login', {
            waitUntil: 'domcontentloaded',
            timeout: 90000
          });
          
          navigationSuccess = true;
          logger.log('✅ Page loaded successfully');
          break;
        } catch (navError) {
          lastError = navError;
          logger.warn(`⚠️ Attempt ${attempt} failed: ${navError.message}`);
          
          if (attempt < retries) {
            logger.log(`🔄 Retrying in 3 seconds...`);
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

      logger.log(`🔍 Current URL: ${page.url()}`);

      // Wait for page to fully load
      logger.log('⏳ Waiting for login form to fully load...');
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
        
        // Take screenshot for debugging
        try {
          const screenshotPath = `./error-screenshot-${Date.now()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: true });
          logger.log(`📸 Screenshot saved: ${screenshotPath}`);
        } catch (screenshotError) {
          logger.warn('⚠️ Could not take screenshot');
        }
        
        return {
          success: false,
          error: 'Login form not found - page might be blocked, down, or structure changed'
        };
      }

      // Fill email
      logger.log('✏️ Filling email (human-like)...');
      await page.click('input[name="email"]');
      await sleep(300);
      
      await page.type('input[name="email"]', email, { 
        delay: Math.floor(Math.random() * 50) + 80
      });
      await sleep(500);

      // Fill password
      logger.log('🔐 Filling password (human-like)...');
      await page.click('input[name="password"]');
      await sleep(300);
      
      await page.type('input[name="password"]', password, { 
        delay: Math.floor(Math.random() * 50) + 80
      });
      await sleep(800);

      // Verify inputs
      const emailFilled = await page.evaluate(() => {
        return document.querySelector('input[name="email"]')?.value || '';
      });
      const passwordFilled = await page.evaluate(() => {
        return document.querySelector('input[name="password"]')?.value || '';
      });
      
      logger.log(`📧 Email filled: ${emailFilled}`);
      logger.log(`🔒 Password filled: ${passwordFilled ? '***' : 'EMPTY'}`);
      
      // Fallback if typing failed
      if (emailFilled !== email || !passwordFilled) {
        logger.warn('⚠️ Typing failed, using fallback method...');
        
        await page.evaluate((emailVal, passVal) => {
          const emailInput = document.querySelector('input[name="email"]');
          const passwordInput = document.querySelector('input[name="password"]');
          
          if (emailInput) {
            emailInput.value = emailVal;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          if (passwordInput) {
            passwordInput.value = passVal;
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, email, password);
        
        await sleep(1000);
        
        const emailCheck = await page.evaluate(() => document.querySelector('input[name="email"]')?.value || '');
        const passwordCheck = await page.evaluate(() => document.querySelector('input[name="password"]')?.value || '');
        
        if (!emailCheck || !passwordCheck) {
          return {
            success: false,
            error: 'Failed to fill email or password'
          };
        }
      }
      
      // Wait for Cloudflare Turnstile
      logger.log('⏳ Waiting for Cloudflare Turnstile...');
      await sleep(5000);
      
      // Check if login button is enabled
      try {
        await page.waitForSelector('button[type="submit"]:not([disabled])', {
          timeout: 10000
        });
        logger.log('✅ Login button is enabled');
      } catch (error) {
        logger.warn('⚠️ Login button still disabled, will try anyway');
      }
      
      await sleep(2000);

      // Click login button
      logger.log('🖱️ Clicking login button...');
      const loginButton = await page.$('button[type="submit"]');
      if (loginButton) {
        const hasOnClick = await page.evaluate((btn) => {
          return btn.hasAttribute('onclick');
        }, loginButton);
        
        if (hasOnClick) {
          logger.log('🔧 Button has onclick handler, executing it...');
          await page.evaluate((btn) => {
            btn.click();
          }, loginButton);
        } else {
          await loginButton.click();
        }
      } else {
        logger.log('⚠️ Login button not found, pressing Enter instead');
        await page.keyboard.press('Enter');
      }

      // Wait for login to complete
      logger.log('⏳ Waiting for login to complete...');
      await sleep(8000);

      // Check if login was successful
      const currentUrl = page.url();
      logger.log(`🔍 Current URL after login: ${currentUrl}`);

      if (currentUrl.includes('login')) {
        // Check for error messages
        try {
          const errorElement = await page.$('.error, .alert-danger, [role="alert"], .text-red-500, .text-danger');
          if (errorElement) {
            const errorText = await page.evaluate(el => el.textContent, errorElement);
            return {
              success: false,
              error: `Login failed: ${errorText.trim()}`
            };
          }
        } catch (e) {
          // Ignore
        }
        
        return {
          success: false,
          error: 'Login failed - still on login page. Please check credentials.'
        };
      }

      logger.log('✅ Login successful - navigated away from login page');

      // Wait for dashboard to load
      await sleep(3000);

      // Extract cookies
      logger.log('🍪 Extracting cookies...');
      const cookies = await page.cookies();

      // Filter relevant cookies
      const relevantCookies = cookies.filter(cookie => {
        return !cookie.name.startsWith('_ga') && 
               !cookie.name.startsWith('_gid') &&
               !cookie.name.startsWith('_fbp') &&
               !cookie.name.startsWith('_gat') &&
               !cookie.name.startsWith('_gcl') &&
               cookie.name.length > 0;
      });

      logger.log(`✅ Got ${relevantCookies.length} relevant cookies from ${cookies.length} total cookies`);

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

      logger.log(`📊 Formatted ${formattedCookies.length} cookies for database`);

      // ✅ FIXED: Return proper format expected by controller
      return {
        success: true,
        cookies: formattedCookies
      };

    } catch (error) {
      logger.error('❌ Puppeteer Real Browser Error:');
      logger.error(error.message);
      if (error.stack) {
        logger.error(error.stack);
      }
      
      // ✅ FIXED: Return error format
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

      const { browser: realBrowser, page: realPage } = await connect({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        turnstile: true,
        disableXvfb: true
      });

      browser = realBrowser;
      page = realPage;

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
      logger.log(`🍪 Set ${puppeteerCookies.length} cookies to page`);

      const response = await page.goto('https://kasirpintar.co.id/dashboard', {
        waitUntil: 'domcontentloaded',
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

      logger.warn(`⚠️ Unexpected response status: ${response?.status()}`);
      return false;

    } catch (error) {
      logger.error('❌ Cookie validation error:', error.message);
      return false;

    } finally {
      if (page) {
        try {
          await page.close();
        } catch (err) {
          logger.warn('⚠️ Error closing page:', err.message);
        }
      }
      
      if (browser) {
        try {
          await browser.close();
        } catch (err) {
          logger.warn('⚠️ Error closing browser:', err.message);
        }
      }
    }
  }
}

module.exports = {
  loginAndGetCookies: (email, password, domain) => 
    PuppeteerService.loginAndGetCookies(email, password, domain),
  validateCookies: (cookies) => 
    PuppeteerService.validateCookies(cookies)
};