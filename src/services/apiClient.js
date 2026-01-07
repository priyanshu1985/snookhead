import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

/**
 * Enhanced API client with automatic token refresh using Axios-like interceptor pattern
 * This handles all HTTP requests with automatic access token refresh
 */
class ApiClient {
  constructor() {
    this.baseURL = API_URL;
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  // Process failed requests queue after successful refresh
  processQueue(error, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  // Get stored tokens
  async getTokens() {
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
  }

  // Store tokens
  async setTokens(accessToken, refreshToken) {
    try {
      await Promise.all(
        [
          AsyncStorage.setItem('authToken', accessToken),
          refreshToken && AsyncStorage.setItem('refreshToken', refreshToken),
        ].filter(Boolean),
      );
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    const { refreshToken } = await this.getTokens();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include', // Include cookies for httpOnly refresh tokens
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token refresh failed');
      }

      const data = await response.json();

      if (data.accessToken) {
        // Store new tokens
        await this.setTokens(
          data.accessToken,
          data.refreshToken || refreshToken,
        );
        return data.accessToken;
      } else {
        throw new Error('No access token in refresh response');
      }
    } catch (error) {
      // Clear invalid tokens
      await this.clearTokens();
      throw error;
    }
  }

  // Clear all tokens (logout)
  async clearTokens() {
    try {
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Main request method with automatic token refresh
  async request(url, options = {}) {
    const { accessToken } = await this.getTokens();

    // Prepare request with access token
    const requestOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    };

    try {
      // Make the request
      const response = await fetch(`${this.baseURL}${url}`, requestOptions);

      // If token expired, try to refresh and retry
      if (response.status === 401) {
        const errorData = await response.json();

        if (errorData.code === 'TOKEN_EXPIRED') {
          return this.handleTokenExpiredRequest(url, options);
        }
      }

      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  // Handle token expired by refreshing and retrying
  async handleTokenExpiredRequest(url, options) {
    if (this.isRefreshing) {
      // If already refreshing, wait for it to complete
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then(token => {
        // Retry request with new token
        return this.request(url, options);
      });
    }

    this.isRefreshing = true;

    try {
      const newAccessToken = await this.refreshAccessToken();
      this.processQueue(null, newAccessToken);

      // Retry original request with new token
      return this.request(url, options);
    } catch (error) {
      this.processQueue(error, null);

      // If refresh fails, redirect to login
      this.handleAuthFailure();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  // Handle authentication failure (redirect to login)
  handleAuthFailure() {
    // Clear tokens
    this.clearTokens();

    // Emit auth failure event that AuthContext can listen to
    console.log('Authentication failed, user needs to login again');

    // You can use a navigation service or event emitter here
    // For now, we'll just clear tokens and the AuthContext will handle it
    global.authFailureHandler && global.authFailureHandler();
  }

  // Convenience methods
  async get(url, options = {}) {
    const response = await this.request(url, { ...options, method: 'GET' });
    return response.json();
  }

  async post(url, data, options = {}) {
    const response = await this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async put(url, data, options = {}) {
    const response = await this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async delete(url, options = {}) {
    const response = await this.request(url, { ...options, method: 'DELETE' });
    return response.json();
  }

  // Special method for file uploads
  async uploadFile(url, formData, options = {}) {
    const { accessToken } = await this.getTokens();

    const requestOptions = {
      ...options,
      method: 'POST',
      headers: {
        ...options.headers,
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        // Don't set Content-Type for FormData, let the browser set it
      },
      body: formData,
    };

    try {
      const response = await fetch(`${this.baseURL}${url}`, requestOptions);

      if (response.status === 401) {
        const errorData = await response.json();
        if (errorData.code === 'TOKEN_EXPIRED') {
          return this.handleTokenExpiredRequest(url, {
            ...options,
            method: 'POST',
            body: formData,
          });
        }
      }

      return response.json();
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;

// Export helper functions for backward compatibility
export const makeRequest = (url, options) => apiClient.request(url, options);
export const getAuthToken = () =>
  apiClient.getTokens().then(tokens => tokens.accessToken);
