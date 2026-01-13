import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';
import { API_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenRefreshing, setTokenRefreshing] = useState(false);

  // Check if user is already logged in when app starts
  useEffect(() => {
    checkAuthState();

    // Set up global auth failure handler for apiClient
    global.authFailureHandler = handleAuthFailure;

    return () => {
      // Cleanup
      global.authFailureHandler = null;
    };
  }, []);

  const checkAuthState = async () => {
    try {
      const [authToken, refreshToken, userData] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('refreshToken'),
        AsyncStorage.getItem('userData'),
      ]);

      // User is considered logged in if they have a refresh token (not just access token)
      // This is because access tokens expire quickly but refresh tokens keep them logged in
      if (refreshToken && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);

        // Try to validate/refresh the session silently
        // If access token is expired, apiClient will auto-refresh using the refresh token
        try {
          const userInfo = await apiClient.get('/api/auth/me');
          if (userInfo.success) {
            setUser(userInfo.user);
            await AsyncStorage.setItem('userData', JSON.stringify(userInfo.user));
          }
        } catch (error) {
          console.log('Token validation failed:', error.message);
          // Only logout if refresh token is also invalid (handled by apiClient)
          // The apiClient will call handleAuthFailure if refresh fails
        }
      } else if (authToken && userData && !refreshToken) {
        // Edge case: has access token but no refresh token - still try to use it
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (accessToken, refreshToken, userData) => {
    try {
      // Store tokens and user data
      await Promise.all([
        AsyncStorage.setItem('authToken', accessToken),
        AsyncStorage.setItem('refreshToken', refreshToken || ''),
        AsyncStorage.setItem('userData', JSON.stringify(userData)),
      ]);

      setUser(userData);
      setIsAuthenticated(true);

      console.log('Login successful:', userData.email);
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  };

  const refreshAccessToken = async () => {
    if (tokenRefreshing) return null;

    try {
      setTokenRefreshing(true);

      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Only logout if refresh token is explicitly invalid/revoked
        if (errorData.code === 'INVALID_REFRESH_TOKEN' || errorData.code === 'USER_NOT_FOUND') {
          console.log('Refresh token is invalid, logging out');
          await logout(false); // Don't call backend, token is already invalid
        }
        throw new Error(errorData.error || 'Token refresh failed');
      }

      const data = await response.json();

      if (data.success && data.accessToken) {
        // Update stored tokens
        await Promise.all(
          [
            AsyncStorage.setItem('authToken', data.accessToken),
            data.refreshToken &&
              AsyncStorage.setItem('refreshToken', data.refreshToken),
          ].filter(Boolean),
        );

        // Update user info if provided
        if (data.user) {
          setUser(data.user);
          await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        }

        return data.accessToken;
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Don't auto-logout here - only logout if refresh token is invalid (handled above)
      // This prevents logout on temporary network errors
      throw error;
    } finally {
      setTokenRefreshing(false);
    }
  };

  const logout = async (callBackend = true) => {
    console.log('Logout started...');

    try {
      // Immediately reset auth state for better UX
      setUser(null);
      setIsAuthenticated(false);

      if (callBackend) {
        // Get current tokens for backend logout
        const [authToken, refreshToken] = await Promise.all([
          AsyncStorage.getItem('authToken'),
          AsyncStorage.getItem('refreshToken'),
        ]);

        // Call backend logout endpoint with timeout - don't wait too long
        if (refreshToken) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            await fetch(`${API_URL}/api/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(authToken && { Authorization: `Bearer ${authToken}` }),
              },
              body: JSON.stringify({ refreshToken }),
              credentials: 'include',
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            console.log('Backend logout successful');
          } catch (backendError) {
            console.warn(
              'Backend logout failed or timed out, continuing with local logout:',
              backendError.message || backendError,
            );
            // Don't throw - continue with local logout
          }
        }
      }

      // Remove all auth-related data from AsyncStorage
      await AsyncStorage.multiRemove([
        'authToken',
        'userData',
        'refreshToken',
        'userRole',
      ]);

      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force logout even if there's an error
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const getUserRole = () => {
    return user?.role || null;
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isStaff = () => {
    return user?.role === 'staff';
  };

  const isOwner = () => {
    return user?.role === 'owner';
  };

  const isCustomer = () => {
    return user?.role === 'customer';
  };

  // Get current station ID for multi-tenancy
  const getStationId = () => {
    return user?.station_id || null;
  };

  // Check if user has a station assigned
  const hasStation = () => {
    return !!user?.station_id;
  };

  // Handle authentication failure (called by apiClient)
  const handleAuthFailure = async () => {
    console.log('Authentication failed, logging out user');
    await logout(false); // Don't call backend since tokens are already invalid
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    tokenRefreshing,
    login,
    logout,
    refreshAccessToken,
    handleAuthFailure,
    getUserRole,
    getStationId,
    hasStation,
    isAdmin,
    isStaff,
    isOwner,
    isCustomer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
