// backend/services/autoRefreshScheduler.js

const cron = require('node-cron');
const Store = require('../models/Store');
const Cookie = require('../models/Cookie');
const puppeteerService = require('./playwrightService');
const healthCheckService = require('./healthCheckService');
const { logActivity } = require('../controllers/activityController'); // ✅ ADD THIS

let nextRefreshDate = null;
let isRefreshing = false;

/**
 * Calculate time until next refresh
 */
const getNextRefreshTime = () => {
  if (!nextRefreshDate) {
    return 'Not scheduled yet';
  }

  const now = new Date();
  const diff = nextRefreshDate - now;

  if (diff <= 0) {
    return 'Refreshing now...';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Set next refresh time (90 minutes from now)
 */
const setNextRefreshTime = () => {
  nextRefreshDate = new Date(Date.now() + 90 * 60 * 1000);
  const timeStr = nextRefreshDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  console.log(`⏰ Next refresh scheduled at: ${timeStr}`);
};

/**
 * Auto-refresh cookies for all active stores
 */
const refreshAllStoreCookies = async () => {
  if (isRefreshing) {
    console.log('⚠️ Refresh already in progress, skipping...');
    return;
  }

  isRefreshing = true;
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 AUTO-REFRESH: Starting cookie refresh for all stores...');
  console.log(`⏰ Time: ${new Date().toLocaleString('id-ID')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Find all active stores with saved credentials
    const stores = await Store.find({
      status: 'active',
      encryptedEmail: { $exists: true, $ne: null },
      encryptedPassword: { $exists: true, $ne: null }
    });

    if (stores.length === 0) {
      console.log('⚠️ No active stores with saved credentials found.');
      return;
    }

    console.log(`📊 Found ${stores.length} active store(s) with credentials\n`);

    let successCount = 0;
    let failCount = 0;

    // Process each store
    for (const store of stores) {
      try {
        console.log(`\n🔄 [${store.name}] Starting refresh...`);

        // Decrypt credentials
        const email = store.decryptPassword(store.encryptedEmail);
        const password = store.decryptPassword(store.encryptedPassword);

        // Generate new cookies
        const result = await puppeteerService.loginAndGetCookies(
          email,
          password,
          store.domain
        );

        if (result.success) {
          // ✅ STEP 1: Delete old cookies from Cookie collection
          const deletedCount = await Cookie.deleteMany({ 
            storeId: store._id,
            userId: store.user 
          });
          console.log(`🗑️ [${store.name}] Deleted ${deletedCount.deletedCount} old cookies from Cookie collection`);

          // ✅ STEP 2: Save new cookies to Cookie collection
          const cookiesToInsert = result.cookies.map(cookie => ({
            storeId: store._id,
            userId: store.user,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || store.domain,
            path: cookie.path || '/',
            expirationDate: cookie.expires ? new Date(cookie.expires * 1000) : null,
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure || false,
            sameSite: cookie.sameSite || 'Lax'
          }));

          const insertedCookies = await Cookie.insertMany(cookiesToInsert);
          console.log(`✅ [${store.name}] Inserted ${insertedCookies.length} cookies to Cookie collection`);

          // ✅ STEP 3: Auto Health Check after refresh
          console.log(`🔍 [${store.name}] Running auto health check...`);
          try {
            const healthResult = await healthCheckService.checkCookiesHealth(store._id, store.user);
            
            if (healthResult.success) {
              const { validCookies, expiredCookies, totalCookies } = healthResult.data;
              console.log(`✅ [${store.name}] Health check: 🟢 ${validCookies} valid • 🔴 ${expiredCookies} expired (total: ${totalCookies})`);
            } else {
              console.log(`⚠️ [${store.name}] Health check failed: ${healthResult.message}`);
            }
          } catch (healthError) {
            console.error(`❌ [${store.name}] Health check error: ${healthError.message}`);
            // Don't fail the whole refresh if health check fails
          }

          // STEP 4: Also update Store model (for backward compatibility)
          store.cookies = result.cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite,
            isValid: true,
            lastChecked: new Date()
          }));

          store.lastCookieUpdate = new Date();
          store.status = 'active';
          await store.save();

          // ✅ STEP 5: LOG ACTIVITY - Cookies refreshed successfully
          try {
            await logActivity(
              store.user,
              'Cookies refreshed',
              'success',
              store.name,
              store._id
            );
            console.log(`📝 [${store.name}] Activity logged: Cookies refreshed`);
          } catch (logError) {
            console.error(`⚠️ [${store.name}] Failed to log activity: ${logError.message}`);
            // Don't fail the refresh if logging fails
          }

          successCount++;
          console.log(`✅ [${store.name}] Refresh successful! ${result.cookies.length} cookies updated`);
        } else {
          failCount++;
          console.error(`❌ [${store.name}] Refresh failed: ${result.error}`);
          
          // ✅ LOG ACTIVITY - Cookies refresh failed
          try {
            await logActivity(
              store.user,
              'Cookies refresh failed',
              'error',
              store.name,
              store._id
            );
          } catch (logError) {
            console.error(`⚠️ [${store.name}] Failed to log error activity: ${logError.message}`);
          }
        }
      } catch (error) {
        failCount++;
        console.error(`❌ [${store.name}] Error: ${error.message}`);
        
        // ✅ LOG ACTIVITY - Cookies refresh error
        try {
          await logActivity(
            store.user,
            'Cookies refresh error',
            'error',
            store.name,
            store._id
          );
        } catch (logError) {
          console.error(`⚠️ [${store.name}] Failed to log error activity: ${logError.message}`);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 AUTO-REFRESH SUMMARY:');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📦 Total: ${stores.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ AUTO-REFRESH ERROR:', error.message);
  } finally {
    isRefreshing = false;
    setNextRefreshTime(); // Schedule next refresh
  }
};

/**
 * Start auto-refresh scheduler
 */
const startAutoRefreshScheduler = () => {
  console.log('🔄 Auto-Refresh Scheduler starting...');

  // Set initial next refresh time
  setNextRefreshTime();

  // Run every 90 minutes
  cron.schedule('*/90 * * * *', async () => {
    await refreshAllStoreCookies();
  });

  console.log('✅ Auto-Refresh Scheduler is now running');
  console.log('🔄 Refreshes cookies every 90 minutes for active stores with credentials');
  console.log('🔍 Auto health check runs after each refresh');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
};

module.exports = {
  startAutoRefreshScheduler,
  refreshAllStoreCookies,
  getNextRefreshTime
};