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

      if (authToken && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);

        // Validate token by making a test request
        try {
          const userInfo = await apiClient.get('/api/auth/me');
          if (userInfo.success) {
            setUser(userInfo.user);
          }
        } catch (error) {
          console.log('Token validation failed, user may need to re-login');
          // Don't immediately logout - let the interceptor handle it
        }
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
      // Auto-logout on refresh failure
      await logout();
      throw error;
    } finally {
      setTokenRefreshing(false);
    }
  };

  const logout = async (callBackend = true) => {
    try {
      if (callBackend) {
        // Get current tokens for backend logout
        const [authToken, refreshToken] = await Promise.all([
          AsyncStorage.getItem('authToken'),
          AsyncStorage.getItem('refreshToken'),
        ]);

        // Call backend logout endpoint to invalidate tokens
        if (refreshToken) {
          try {
            await fetch(`${API_URL}/api/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(authToken && { Authorization: `Bearer ${authToken}` }),
              },
              body: JSON.stringify({ refreshToken }),
              credentials: 'include',
            });
            console.log('Backend logout successful');
          } catch (backendError) {
            console.warn(
              'Backend logout failed, continuing with local logout:',
              backendError,
            );
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

      // Reset auth state
      setUser(null);
      setIsAuthenticated(false);

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
    isAdmin,
    isStaff,
    isOwner,
    isCustomer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
