import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Store original fetch to avoid infinite recursion
const originalFetch = global.fetch;

// Global variables to track refresh state
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Get stored tokens
const getTokens = async () => {
  try {
    const [accessToken, refreshToken] = await Promise.all([
      AsyncStorage.getItem('authToken'),
      AsyncStorage.getItem('refreshToken'),
    ]);
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error getting tokens:', error);
    return { accessToken: null, refreshToken: null };
  }
};

// Store tokens
const setTokens = async (accessToken, refreshToken) => {
  try {
    const promises = [AsyncStorage.setItem('authToken', accessToken)];
    if (refreshToken) {
      promises.push(AsyncStorage.setItem('refreshToken', refreshToken));
    }
    await Promise.all(promises);
  } catch (error) {
    console.error('Error setting tokens:', error);
  }
};

// Refresh access token
const refreshAccessToken = async () => {
  const { refreshToken } = await getTokens();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    // Use original fetch to avoid infinite recursion
    const response = await originalFetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Token refresh failed');
    }

    const data = await response.json();

    if (data.accessToken) {
      await setTokens(data.accessToken, data.refreshToken || refreshToken);
      return data.accessToken;
    } else {
      throw new Error('No access token in refresh response');
    }
  } catch (error) {
    // Clear invalid tokens and trigger logout
    await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
    throw error;
  }
};

/**
 * Enhanced fetch that automatically handles token refresh
 * This is a drop-in replacement for the native fetch function
 */
const enhancedFetch = async (url, options = {}) => {
  // Convert relative URLs to absolute URLs if needed
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

  console.log('Enhanced fetch called for:', fullUrl);

  // Add timeout to prevent infinite hanging
  const timeout = options.timeout || 30000; // 30 second timeout
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeout),
  );

  // Get current access token
  const { accessToken } = await getTokens();

  // Prepare headers with token
  const enhancedOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
  };

  try {
    // Make the request using original fetch to avoid recursion with timeout
    let response = await Promise.race([
      originalFetch(fullUrl, enhancedOptions),
      timeoutPromise,
    ]);

    console.log('Response status:', response.status);

    // If token expired, try to refresh and retry
    if (response.status === 401) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        console.error('Error parsing 401 response:', parseError);
        throw new Error('Authentication failed');
      }

      if (errorData.code === 'TOKEN_EXPIRED') {
        console.log('Token expired, attempting refresh...');

        // If already refreshing, wait for it to complete
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: token => {
                // Retry request with new token
                const retryOptions = {
                  ...enhancedOptions,
                  headers: {
                    ...enhancedOptions.headers,
                    Authorization: `Bearer ${token}`,
                  },
                };
                resolve(
                  Promise.race([
                    originalFetch(fullUrl, retryOptions),
                    timeoutPromise,
                  ]),
                );
              },
              reject,
            });
          });
        }

        isRefreshing = true;

        try {
          const newAccessToken = await refreshAccessToken();
          processQueue(null, newAccessToken);

          // Retry original request with new token
          const retryOptions = {
            ...enhancedOptions,
            headers: {
              ...enhancedOptions.headers,
              Authorization: `Bearer ${newAccessToken}`,
            },
          };

          response = await Promise.race([
            originalFetch(fullUrl, retryOptions),
            timeoutPromise,
          ]);
          console.log('Retry response status:', response.status);
        } catch (error) {
          processQueue(error, null);
          console.error('Token refresh failed:', error);

          // Trigger logout
          if (global.authFailureHandler) {
            global.authFailureHandler();
          }

          throw error;
        } finally {
          isRefreshing = false;
        }
      }
    }

    return response;
  } catch (error) {
    console.error('Enhanced fetch error:', error);

    // If it's a network error, provide a more helpful message
    if (error.message === 'Request timeout') {
      throw new Error('Request timed out. Please check your connection.');
    }
    if (error.message === 'Network request failed') {
      throw new Error('Network error. Please check your connection.');
    }

    throw error;
  }
};

export default enhancedFetch;
