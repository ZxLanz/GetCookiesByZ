// frontend/src/utils/cookieParser.js

/**
 * Parse Cookie String format ke JSON
 * Input: "_gcl_au=1.1.333; _fbp=fb.2.1765; laravel_session=eyJpdiI6..."
 * Output: [{name, value, domain, path, ...}, ...]
 */
export const parseCookieString = (cookieString, defaultDomain = '.kasirpintar.co.id') => {
  if (!cookieString || typeof cookieString !== 'string') {
    throw new Error('Cookie string tidak valid');
  }

  // Split by semicolon and trim
  const cookiePairs = cookieString
    .split(';')
    .map(pair => pair.trim())
    .filter(pair => pair.length > 0);

  if (cookiePairs.length === 0) {
    throw new Error('Tidak ada cookies yang valid ditemukan');
  }

  const cookies = [];

  for (const pair of cookiePairs) {
    // Split name=value
    const equalIndex = pair.indexOf('=');
    
    if (equalIndex === -1) {
      console.warn(`Skipping invalid cookie: ${pair}`);
      continue;
    }

    const name = pair.substring(0, equalIndex).trim();
    const value = pair.substring(equalIndex + 1).trim();

    if (!name || !value) {
      console.warn(`Skipping cookie with empty name or value: ${pair}`);
      continue;
    }

    // Create cookie object with default values
    cookies.push({
      name,
      value,
      domain: defaultDomain,
      path: '/',
      expirationDate: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days in seconds (Unix timestamp)
      httpOnly: false,
      secure: true,
      sameSite: 'Lax'
    });
  }

  return cookies;
};

/**
 * Convert JSON cookies ke Cookie String format
 * Input: [{name, value, ...}, ...]
 * Output: "_gcl_au=1.1.333; _fbp=fb.2.1765; laravel_session=eyJpdiI6..."
 */
export const convertToCookieString = (cookies) => {
  if (!Array.isArray(cookies) || cookies.length === 0) {
    throw new Error('Tidak ada cookies untuk diexport');
  }

  return cookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');
};

/**
 * Auto-detect format (Cookie String vs JSON)
 */
export const detectCookieFormat = (input) => {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  // Check if it's JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      return null;
    }
  }

  // Check if it's Cookie String (contains = and possibly ;)
  if (trimmed.includes('=')) {
    return 'cookie-string';
  }

  return null;
};

/**
 * Parse any format (auto-detect)
 */
export const parseAnyCookieFormat = (input, defaultDomain = '.kasirpintar.co.id') => {
  const format = detectCookieFormat(input);

  if (format === 'json') {
    return JSON.parse(input);
  } else if (format === 'cookie-string') {
    return parseCookieString(input, defaultDomain);
  } else {
    throw new Error('Format tidak dikenali. Gunakan Cookie String atau JSON.');
  }
};