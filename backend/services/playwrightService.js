// backend/services/playwrightService.js
const { chromium } = require('playwright-chromium');

// Simple logger utility
const logger = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
  info: (message) => console.info(message),
  warn: (message) => console.warn(message)
};

/**
 * Generate cookies untuk Kasir Pintar menggunakan Playwright
 */
async function generateCookies(email, password, domain = 'kasirpintar.co.id') {
  let browser = null;
  let context = null;

  try {
    logger.log('🚀 Initializing Playwright browser...');
    
    // Detect environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    logger.log(`🔧 Environment: ${isProduction ? 'PRODUCTION (Vercel/Serverless)' : 'DEVELOPMENT (Local)'}`);

    // Launch browser with stealth configuration
    browser = await chromium.launch({
      headless: true,
      timeout: 50000, // 50 seconds for browser launch
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-gpu'
      ]
    });

    logger.log('✅ Browser launched successfully');

    // Create stealth context
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'id-ID',
      timezoneId: 'Asia/Jakarta',
      permissions: ['geolocation'],
      geolocation: { latitude: -6.2088, longitude: 106.8456 }, // Jakarta
      colorScheme: 'light',
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      javaScriptEnabled: true
    });

    const page = await context.newPage();
    
    // Set default timeout untuk semua page operations
    page.setDefaultTimeout(55000); // 55 seconds
    
    logger.log('✅ Stealth page created');

    // Add stealth scripts
    await page.addInitScript(() => {
      // Override navigator properties
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US', 'en'] });
      
      // Override chrome detection
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // Remove automation traces
      delete navigator.__proto__.webdriver;
    });

    // Navigate to login page
    const loginUrl = `https://${domain}/login`;
    logger.log(`🌐 Navigating to Kasir Pintar login page: ${loginUrl}`);
    
    // Use domcontentloaded instead of networkidle (faster)
    await page.goto(loginUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 50000 // 50 seconds
    });

    logger.log('📄 Login page loaded');

    // Wait for Turnstile iframe to appear
    logger.log('⏳ Waiting for Turnstile challenge...');
    
    try {
      // Wait for Turnstile iframe dengan timeout lebih panjang
      await page.waitForSelector('iframe[src*="challenges.cloudflare.com"]', { 
        timeout: 40000 // 40 seconds
      });
      logger.log('✅ Turnstile iframe detected');

      // Wait for Turnstile to be solved - THIS IS THE SLOWEST PART
      // Bisa butuh 15-35 detik tergantung kompleksitas challenge
      await page.waitForFunction(() => {
        const iframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
        if (!iframe) return false;
        
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const checkbox = iframeDoc.querySelector('input[type="checkbox"]');
          return checkbox && checkbox.checked;
        } catch (e) {
          // Cross-origin iframe, can't access content
          // Check if response token exists in parent page
          const token = document.querySelector('input[name="cf-turnstile-response"]');
          return token && token.value.length > 0;
        }
      }, { timeout: 40000 }); // 40 seconds untuk solve Turnstile

      logger.log('✅ Turnstile solved successfully');
      
      // Additional wait for form to be ready
      await page.waitForTimeout(2000);

    } catch (error) {
      logger.warn('⚠️ Turnstile detection timeout (might not be present or already solved)');
    }

    // Fill login form dengan timeout individual yang lebih pendek
    logger.log('📝 Filling login form...');
    
    await page.fill('input[name="email"], input[type="email"], #email', email, {
      timeout: 5000 // 5 seconds per field
    });
    await page.fill('input[name="password"], input[type="password"], #password', password, {
      timeout: 5000
    });
    
    logger.log('✅ Login form filled');

    // Submit form
    logger.log('📤 Submitting login form...');
    
    await Promise.all([
      page.click('button[type="submit"], input[type="submit"], .btn-login'),
      page.waitForNavigation({ 
        waitUntil: 'domcontentloaded',
        timeout: 40000 // 40 seconds untuk login complete
      })
    ]);

    // Check if login successful
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login')) {
      // Still on login page - check for error message
      const errorElement = await page.$('.alert-danger, .error-message, [class*="error"]');
      const errorText = errorElement ? await errorElement.textContent() : 'Unknown error';
      
      throw new Error(`Login failed: ${errorText}`);
    }

    logger.log('✅ Login successful!');
    logger.log(`📍 Current URL: ${currentUrl}`);

    // Extract cookies
    logger.log('🍪 Extracting cookies...');
    const cookies = await context.cookies();
    
    logger.log(`✅ Extracted ${cookies.length} cookies`);

    // Format cookies for MongoDB
    const formattedCookies = cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite
    }));

    // Close browser
    await browser.close();
    logger.log('🔒 Browser closed');

    return {
      success: true,
      cookies: formattedCookies,
      message: `Successfully generated ${formattedCookies.length} cookies`
    };

  } catch (error) {
    logger.error('❌ Error generating cookies:', error.message);
    
    // Clean up
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        logger.error('Error closing browser:', e.message);
      }
    }

    return {
      success: false,
      error: error.message,
      cookies: []
    };
  }
}

/**
 * Validate if cookies are still valid
 */
async function validateCookies(cookies, domain = 'kasirpintar.co.id') {
  let browser = null;

  try {
    logger.log('🔍 Validating cookies...');

    browser = await chromium.launch({ 
      headless: true,
      timeout: 30000
    });
    const context = await browser.newContext();
    
    // Add cookies to context
    await context.addCookies(cookies);
    
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    
    // Navigate to dashboard
    await page.goto(`https://${domain}/dashboard`, { 
      waitUntil: 'domcontentloaded',
      timeout: 25000 
    });

    const currentUrl = page.url();
    
    // If redirected to login, cookies are invalid
    const isValid = !currentUrl.includes('/login');

    await browser.close();

    logger.log(`✅ Cookies validation: ${isValid ? 'VALID' : 'INVALID'}`);

    return {
      success: true,
      valid: isValid,
      message: isValid ? 'Cookies are still valid' : 'Cookies have expired'
    };

  } catch (error) {
    logger.error('❌ Error validating cookies:', error.message);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        logger.error('Error closing browser:', e.message);
      }
    }

    return {
      success: false,
      valid: false,
      error: error.message
    };
  }
}

module.exports = {
  generateCookies,
  validateCookies
};