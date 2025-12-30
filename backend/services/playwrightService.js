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
 * OPTIMIZED for Vercel 60s timeout limit
 */
async function generateCookies(email, password, domain = 'kasirpintar.co.id') {
  let browser = null;
  let context = null;
  const startTime = Date.now();
  const metrics = {};

  try {
    logger.log('🚀 [OPTIMIZED] Initializing Playwright browser...');
    
    // Detect environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    logger.log(`🔧 Environment: ${isProduction ? 'PRODUCTION (Vercel)' : 'DEVELOPMENT'}`);

    // OPTIMIZATION 1: Minimal browser args, faster launch
    const launchStart = Date.now();
    browser = await chromium.launch({
      headless: true,
      timeout: 30000, // Reduced from 50s to 30s
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    metrics.browserLaunch = Date.now() - launchStart;
    logger.log(`✅ Browser launched in ${metrics.browserLaunch}ms`);

    // Create context with minimal config
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'id-ID'
    });

    const page = await context.newPage();
    page.setDefaultTimeout(50000); // Global timeout 50s
    
    // Minimal stealth script
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
    });

    // OPTIMIZATION 2: Fast navigation
    const loginUrl = `https://${domain}/login`;
    logger.log(`🌐 Navigating to: ${loginUrl}`);
    
    const navStart = Date.now();
    await page.goto(loginUrl, { 
      waitUntil: 'domcontentloaded', // Fastest option
      timeout: 30000 // Reduced from 50s
    });
    metrics.navigation = Date.now() - navStart;
    logger.log(`📄 Page loaded in ${metrics.navigation}ms`);

    // OPTIMIZATION 3: Aggressive Turnstile handling
    logger.log('⏳ Detecting Turnstile...');
    const turnstileStart = Date.now();
    
    try {
      // Quick check for iframe (max 8s)
      const iframeDetected = await page.waitForSelector('iframe[src*="challenges.cloudflare.com"]', { 
        timeout: 8000,
        state: 'attached'
      }).then(() => true).catch(() => false);

      if (iframeDetected) {
        logger.log('✅ Turnstile iframe found');
        
        // Get iframe and click checkbox immediately
        const turnstileFrame = page.frameLocator('iframe[src*="challenges.cloudflare.com"]');
        
        try {
          await turnstileFrame.locator('input[type="checkbox"]').click({ 
            timeout: 5000,
            force: true 
          });
          logger.log('✅ Turnstile checkbox clicked');
        } catch (e) {
          logger.warn('⚠️ Could not click checkbox (might auto-solve)');
        }

        // AGGRESSIVE: Wait for token with shorter timeout (max 30s for Turnstile)
        const maxWait = 30; // 30 seconds max
        let solved = false;

        for (let i = 0; i < maxWait; i++) {
          const token = await page.evaluate(() => {
            const input = document.querySelector('input[name="cf-turnstile-response"]');
            return input?.value || null;
          });

          if (token && token.length > 0) {
            logger.log(`✅ Turnstile solved in ${i + 1}s`);
            solved = true;
            break;
          }

          // Check every 1 second
          await page.waitForTimeout(1000);

          // Log progress every 5 seconds
          if ((i + 1) % 5 === 0) {
            logger.log(`⏱️ Still solving... ${i + 1}s`);
          }
        }

        if (!solved) {
          throw new Error('Turnstile timeout after 30 seconds');
        }

        // Small buffer after solve
        await page.waitForTimeout(1000);
        
      } else {
        logger.log('ℹ️ No Turnstile detected (might be already solved)');
      }

      metrics.turnstile = Date.now() - turnstileStart;
      logger.log(`✅ Turnstile handling completed in ${metrics.turnstile}ms`);

    } catch (error) {
      metrics.turnstile = Date.now() - turnstileStart;
      logger.error(`❌ Turnstile error after ${metrics.turnstile}ms: ${error.message}`);
      throw error;
    }

    // OPTIMIZATION 4: Fast form fill
    logger.log('📝 Filling login form...');
    const formStart = Date.now();
    
    // Use fill with minimal timeout
    await page.fill('input[name="email"], input[type="email"], #email', email, {
      timeout: 5000
    });
    await page.fill('input[name="password"], input[type="password"], #password', password, {
      timeout: 5000
    });
    
    metrics.formFill = Date.now() - formStart;
    logger.log(`✅ Form filled in ${metrics.formFill}ms`);

    // OPTIMIZATION 5: Fast submit
    logger.log('📤 Submitting...');
    const submitStart = Date.now();
    
    await Promise.all([
      page.click('button[type="submit"], input[type="submit"], .btn-login'),
      page.waitForNavigation({ 
        waitUntil: 'domcontentloaded',
        timeout: 20000 // Reduced from 40s
      })
    ]);

    metrics.submit = Date.now() - submitStart;
    logger.log(`✅ Submit completed in ${metrics.submit}ms`);

    // Check login success
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login')) {
      const errorElement = await page.$('.alert-danger, .error-message, [class*="error"]');
      const errorText = errorElement ? await errorElement.textContent() : 'Unknown error';
      throw new Error(`Login failed: ${errorText}`);
    }

    logger.log(`✅ Login successful! URL: ${currentUrl}`);

    // OPTIMIZATION 6: Fast cookie extraction
    logger.log('🍪 Extracting cookies...');
    const cookieStart = Date.now();
    const cookies = await context.cookies();
    metrics.cookieExtract = Date.now() - cookieStart;

    // Format cookies
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
    
    // Calculate total time
    const totalTime = Date.now() - startTime;
    metrics.total = totalTime;

    logger.log(`✅ Completed in ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    logger.log(`📊 Performance breakdown:
  - Browser launch: ${metrics.browserLaunch}ms
  - Navigation: ${metrics.navigation}ms
  - Turnstile: ${metrics.turnstile}ms
  - Form fill: ${metrics.formFill}ms
  - Submit: ${metrics.submit}ms
  - Cookie extract: ${metrics.cookieExtract}ms
  - TOTAL: ${metrics.total}ms`);

    return {
      success: true,
      cookies: formattedCookies,
      message: `Successfully generated ${formattedCookies.length} cookies`,
      performanceMetrics: {
        totalMs: metrics.total,
        totalSeconds: (metrics.total / 1000).toFixed(2),
        breakdown: metrics
      }
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error(`❌ Error after ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s): ${error.message}`);
    
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
      cookies: [],
      performanceMetrics: {
        totalMs: totalTime,
        totalSeconds: (totalTime / 1000).toFixed(2),
        failedAt: Object.keys(metrics).pop() || 'initialization',
        breakdown: metrics
      }
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
      timeout: 20000
    });
    const context = await browser.newContext();
    
    // Add cookies to context
    await context.addCookies(cookies);
    
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    
    // Navigate to dashboard
    await page.goto(`https://${domain}/dashboard`, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
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