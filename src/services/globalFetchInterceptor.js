import enhancedFetch from './enhancedFetch';

/**
 * Global fetch replacement that automatically handles token refresh
 * This replaces the native fetch for all API calls in the app
 */
const originalFetch = global.fetch;

// Override global fetch for API calls only
global.fetch = (url, options) => {
  // Only intercept API calls to our backend
  if (typeof url === 'string' && url.includes('/api/')) {
    console.log('Intercepting API call:', url);
    return enhancedFetch(url, options);
  }

  // Use original fetch for other requests (images, external APIs, etc.)
  return originalFetch(url, options);
};

console.log(
  'Global fetch interceptor initialized - all /api/ calls will automatically refresh tokens',
);

// Export for manual usage
export { enhancedFetch };
