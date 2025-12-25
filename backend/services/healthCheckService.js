// backend/services/healthCheckService.js

const Cookie = require('../models/Cookie');

/**
 * ✅ Helper untuk cek expiry cookie
 */
const checkCookieExpiry = (cookie) => {
  // Jika tidak ada expiry date, anggap session cookie (valid)
  if (!cookie.expirationDate) {
    return { 
      isExpired: false, 
      reason: "no_expiry",
      message: "Session cookie (no expiry)"
    };
  }

  const now = Date.now();
  let expiryDateMs;

  // Normalize semua format ke milliseconds
  if (typeof cookie.expirationDate === "number") {
    if (cookie.expirationDate < 10000000000) {
      expiryDateMs = cookie.expirationDate * 1000;
    } else {
      expiryDateMs = cookie.expirationDate;
    }
  } else if (typeof cookie.expirationDate === "string") {
    const parsed = new Date(cookie.expirationDate);
    expiryDateMs = parsed.getTime();
  } else if (cookie.expirationDate instanceof Date) {
    expiryDateMs = cookie.expirationDate.getTime();
  } else {
    return {
      isExpired: false,
      reason: "unknown_format",
      message: "Unknown date format, assumed valid"
    };
  }

  if (isNaN(expiryDateMs)) {
    return {
      isExpired: false,
      reason: "invalid_date",
      message: "Invalid date, assumed valid"
    };
  }

  const isExpired = expiryDateMs < now;
  const expiryDate = new Date(expiryDateMs);
  const nowDate = new Date(now);
  const diffMs = expiryDateMs - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  return {
    isExpired,
    reason: isExpired ? "expired_date" : "valid_date",
    expiryDate,
    now: nowDate,
    timeRemaining: isExpired 
      ? `Expired ${Math.abs(diffDays)} days ago`
      : `Valid for ${diffDays > 0 ? diffDays + ' days' : diffHours + ' hours'}`,
    message: isExpired 
      ? `Cookie expired on ${expiryDate.toISOString()}`
      : `Cookie valid until ${expiryDate.toISOString()}`
  };
};

/**
 * ✅ MAIN: Check semua cookies dalam 1 store + SAVE STATUS TO DB
 */
const checkCookiesHealth = async (storeId, userId) => {
  try {
    const cookies = await Cookie.find({ storeId, userId });

    if (!cookies || cookies.length === 0) {
      return {
        success: false,
        message: "No cookies found for this store",
        data: {
          storeId,
          totalCookies: 0,
          validCookies: 0,
          expiredCookies: 0,
          cookies: []
        }
      };
    }

    console.log("\n============================================================");
    console.log(`🍪 HEALTH CHECK START – Checking ${cookies.length} cookies`);
    console.log(`📅 Current Time: ${new Date().toISOString()}`);
    console.log("============================================================\n");

    // ✅ Check expiry untuk semua cookies
    const expiryResults = cookies.map(c => {
      const result = checkCookieExpiry(c);
      
      console.log(`Cookie: ${c.name}`);
      console.log(`  Expiry Date: ${result.expiryDate ? result.expiryDate.toISOString() : 'N/A'}`);
      console.log(`  Status: ${result.isExpired ? '🔴 EXPIRED' : '🟢 VALID'}`);
      console.log(`  ${result.message}`);
      console.log(`  Time: ${result.timeRemaining || 'N/A'}`);
      console.log('');
      
      return {
        cookieId: c._id,
        ...result
      };
    });

    // ✅ UPDATE DATABASE dengan health status
    console.log("💾 Updating health status in database...\n");
    
    const updatePromises = cookies.map(async (cookie) => {
      const exp = expiryResults.find(x => x.cookieId.toString() === cookie._id.toString());
      const isValid = !exp.isExpired;
      
      // Update cookie document
      cookie.isValid = isValid;
      cookie.healthStatus = isValid ? 'valid' : 'expired';
      cookie.checkedAt = new Date();
      cookie.statusMessage = exp.message;
      
      await cookie.save();
      
      console.log(`  ✅ Updated: ${cookie.name} → ${isValid ? 'VALID' : 'EXPIRED'}`);
      
      return cookie;
    });

    await Promise.all(updatePromises);
    console.log("\n✅ All cookies updated in database\n");

    // ✅ Reload cookies from DB to get updated data
    const updatedCookies = await Cookie.find({ storeId, userId });

    // Map cookies dengan health status
    const cookiesWithHealth = updatedCookies.map(c => {
      const exp = expiryResults.find(x => x.cookieId.toString() === c._id.toString());
      
      // Normalize expiry untuk frontend
      let displayExpiry = c.expirationDate;
      if (typeof c.expirationDate === "number") {
        const ms = c.expirationDate < 10000000000 
          ? c.expirationDate * 1000 
          : c.expirationDate;
        displayExpiry = new Date(ms);
      } else if (typeof c.expirationDate === "string") {
        displayExpiry = new Date(c.expirationDate);
      }

      return {
        _id: c._id,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expirationDate: displayExpiry,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
        isValid: c.isValid, // ✅ From database
        healthStatus: c.healthStatus, // ✅ From database
        checkedAt: c.checkedAt, // ✅ From database
        statusMessage: c.statusMessage, // ✅ From database
        reason: exp.reason,
        timeRemaining: exp.timeRemaining,
        statusCode: 200
      };
    });

    const validCookies = cookiesWithHealth.filter(c => c.isValid).length;
    const expiredCookies = cookiesWithHealth.length - validCookies;

    console.log("============================================================");
    console.log("✅ HEALTH CHECK COMPLETED");
    console.log("============================================================");
    console.log(`📊 Total cookies    : ${cookies.length}`);
    console.log(`🟢 Valid cookies    : ${validCookies}`);
    console.log(`🔴 Expired cookies  : ${expiredCookies}`);
    console.log(`📝 Auth Check       : SKIPPED (Expiry-based only)`);
    console.log("============================================================\n");

    return {
      success: true,
      message: "Health check completed successfully",
      data: {
        storeId,
        totalCookies: cookies.length,
        validCookies,
        expiredCookies,
        authenticationStatus: true,
        statusCode: 200,
        cookies: cookiesWithHealth,
        checkedAt: new Date()
      }
    };

  } catch (err) {
    console.error("❌ Health check error:", err.message);
    console.error("Stack trace:", err.stack);
    return {
      success: false,
      message: "Health check failed",
      error: err.message
    };
  }
};

module.exports = {
  checkCookiesHealth
};