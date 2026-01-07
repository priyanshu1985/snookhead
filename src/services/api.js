import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import { API_URL } from '../config';

// Helper function to get auth token (backward compatibility)
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
};

// Enhanced makeRequest using the new apiClient
const makeRequest = async (url, options = {}) => {
  try {
    const response = await apiClient.request(url, options);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

// Orders API
export const ordersAPI = {
  // Get all orders
  getAll: async () => {
    return await apiClient.get('/api/orders');
  },

  // Get order by ID
  getById: async id => {
    return await apiClient.get(`/api/orders/${id}`);
  },

  // Create new order
  create: async orderData => {
    return await apiClient.post('/api/orders', orderData);
  },

  // Update order
  update: async (id, orderData) => {
    return await apiClient.put(`/api/orders/${id}`, orderData);
  },

  // Delete order
  delete: async id => {
    return await apiClient.delete(`/api/orders/${id}`);
  },

  // Update order status
  updateStatus: async (id, status) => {
    return await apiClient.put(`/api/orders/${id}/status`, { status });
  },
};

// Tables API
export const tablesAPI = {
  // Get all tables
  getAll: async () => {
    return await apiClient.get('/api/tables');
  },

  // Get table by ID
  getById: async id => {
    return await makeRequest(`/api/tables/${id}`);
  },

  // Create new table
  create: async tableData => {
    return await makeRequest('/api/tables', {
      method: 'POST',
      body: JSON.stringify(tableData),
    });
  },

  // Update table
  update: async (id, tableData) => {
    return await makeRequest(`/api/tables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tableData),
    });
  },

  // Delete table
  delete: async id => {
    return await makeRequest(`/api/tables/${id}`, {
      method: 'DELETE',
    });
  },
};

// Menu API
export const menuAPI = {
  // Get all menu items
  getAll: async () => {
    return await makeRequest('/api/menu');
  },

  // Get menu item by ID
  getById: async id => {
    return await makeRequest(`/api/menu/${id}`);
  },

  // Create new menu item
  create: async menuData => {
    return await makeRequest('/api/menu', {
      method: 'POST',
      body: JSON.stringify(menuData),
    });
  },

  // Update menu item
  update: async (id, menuData) => {
    return await makeRequest(`/api/menu/${id}`, {
      method: 'PUT',
      body: JSON.stringify(menuData),
    });
  },

  // Delete menu item
  delete: async id => {
    return await makeRequest(`/api/menu/${id}`, {
      method: 'DELETE',
    });
  },
};

// Admin Stations API
export const adminStationsAPI = {
  // Get all stations
  getAll: async () => {
    return await makeRequest('/api/adminStations');
  },

  // Get station by ID
  getById: async id => {
    return await makeRequest(`/api/adminStations/${id}`);
  },

  // Create new station
  create: async stationData => {
    return await makeRequest('/api/adminStations/create', {
      method: 'POST',
      body: JSON.stringify(stationData),
    });
  },

  // Pause subscription
  pauseSubscription: async id => {
    return await makeRequest(`/api/adminStations/${id}/pause-subscription`, {
      method: 'POST',
    });
  },

  // Upgrade subscription
  upgradeSubscription: async (id, subscriptionData) => {
    return await makeRequest(`/api/adminStations/${id}/upgrade-subscription`, {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
    });
  },

  // Remove station
  remove: async id => {
    return await makeRequest(`/api/adminStations/${id}/remove`, {
      method: 'DELETE',
    });
  },
};

// Bills API
export const billsAPI = {
  // Get all bills
  getAll: async () => {
    return await makeRequest('/api/bills');
  },

  // Get bill by ID
  getById: async id => {
    return await makeRequest(`/api/bills/${id}`);
  },

  // Pay bill
  pay: async id => {
    return await makeRequest(`/api/bills/${id}/pay`, {
      method: 'POST',
    });
  },
};

// Users API
export const usersAPI = {
  // Get all users
  getAll: async () => {
    return await makeRequest('/api/users');
  },

  // Get user by ID
  getById: async id => {
    return await makeRequest(`/api/users/${id}`);
  },

  // Update user
  update: async (id, userData) => {
    return await makeRequest(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
};

// Games API
export const gamesAPI = {
  // Get all games
  getAll: async () => {
    return await makeRequest('/api/games');
  },

  // Create new game
  create: async gameData => {
    return await makeRequest('/api/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });
  },

  // Update game
  update: async (id, gameData) => {
    return await makeRequest(`/api/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(gameData),
    });
  },

  // Delete game
  delete: async id => {
    return await makeRequest(`/api/games/${id}`, {
      method: 'DELETE',
    });
  },
};

// Queue API
export const queueAPI = {
  // Get all queue items
  getAll: async () => {
    return await makeRequest('/api/queue');
  },

  // Add to queue
  add: async queueData => {
    return await makeRequest('/api/queue', {
      method: 'POST',
      body: JSON.stringify(queueData),
    });
  },

  // Update queue item
  update: async (id, queueData) => {
    return await makeRequest(`/api/queue/${id}`, {
      method: 'PUT',
      body: JSON.stringify(queueData),
    });
  },

  // Remove from queue
  remove: async id => {
    return await makeRequest(`/api/queue/${id}`, {
      method: 'DELETE',
    });
  },
};

// Reservations API
export const reservationsAPI = {
  // Get all reservations
  getAll: async () => {
    return await makeRequest('/api/reservations');
  },

  // Create new reservation
  create: async reservationData => {
    return await makeRequest('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    });
  },

  // Update reservation
  update: async (id, reservationData) => {
    return await makeRequest(`/api/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(reservationData),
    });
  },

  // Cancel reservation
  cancel: async id => {
    return await makeRequest(`/api/reservations/${id}/cancel`, {
      method: 'PATCH',
    });
  },
};

// Bugs API
export const bugsAPI = {
  // Get all bugs
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const url = queryParams ? `/api/bugs?${queryParams}` : '/api/bugs';
    return await makeRequest(url);
  },

  // Get bug by ID
  getById: async id => {
    return await makeRequest(`/api/bugs/${id}`);
  },

  // Create new bug report
  create: async bugData => {
    return await makeRequest('/api/bugs', {
      method: 'POST',
      body: JSON.stringify(bugData),
    });
  },

  // Update bug
  update: async (id, bugData) => {
    return await makeRequest(`/api/bugs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bugData),
    });
  },

  // Update bug status
  updateStatus: async (id, status) => {
    return await makeRequest(`/api/bugs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Delete bug
  delete: async id => {
    return await makeRequest(`/api/bugs/${id}`, {
      method: 'DELETE',
    });
  },

  // Get bug statistics
  getStats: async () => {
    return await makeRequest('/api/bugs/stats/summary');
  },
};

// Customer API
export const customerAPI = {
  // Get all customers
  getAll: async () => {
    return await makeRequest('/api/customer');
  },

  // Get customer by ID
  getById: async id => {
    return await makeRequest(`/api/customer/${id}`);
  },

  // Create new customer
  create: async customerData => {
    return await makeRequest('/api/customer', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  },

  // Update customer
  update: async (id, customerData) => {
    return await makeRequest(`/api/customer/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  },

  // Delete/deactivate customer
  delete: async id => {
    return await makeRequest(`/api/customer/${id}`, {
      method: 'DELETE',
    });
  },
};

// Backward compatibility - alias for getMembers
export const getMembers = customerAPI.getAll;

// Owner Panel API
export const ownerAPI = {
  // Check setup status for current user
  checkSetupStatus: async () => {
    return await makeRequest('/api/owner/check-setup-status', {
      method: 'POST',
    });
  },

  // Setup password for first time
  setupPassword: async (password, confirmPassword) => {
    return await makeRequest('/api/owner/setup-password', {
      method: 'POST',
      body: JSON.stringify({ password, confirmPassword }),
    });
  },

  // Verify password for access
  verifyPassword: async password => {
    return await makeRequest('/api/owner/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  // Change password
  changePassword: async (currentPassword, newPassword, confirmNewPassword) => {
    return await makeRequest('/api/owner/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmNewPassword,
      }),
    });
  },

  // Reset password (admin only)
  resetPassword: async targetUserId => {
    return await makeRequest('/api/owner/reset-password', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  // Dashboard - Get stats
  getStats: async (period = 'day') => {
    return await makeRequest(`/api/owner/dashboard/stats?period=${period}`);
  },

  // Dashboard - Get game utilization
  getGameUtilization: async () => {
    return await makeRequest('/api/owner/dashboard/game-utilization');
  },

  // Dashboard - Get revenue data
  getRevenue: async (period = 'week') => {
    return await makeRequest(`/api/owner/dashboard/revenue?period=${period}`);
  },

  // Dashboard - Get complete summary
  getSummary: async () => {
    return await makeRequest('/api/owner/dashboard/summary');
  },
};

// Wallet API
export const walletAPI = {
  // Get wallet by customer ID
  getByCustomerId: async customerId => {
    return await makeRequest(`/api/wallets/customer/${customerId}`);
  },

  // Get all wallets (admin/owner only)
  getAll: async () => {
    return await makeRequest('/api/wallets');
  },

  // Create new wallet
  create: async walletData => {
    return await makeRequest('/api/wallets/create', {
      method: 'POST',
      body: JSON.stringify(walletData),
    });
  },

  // Add balance to wallet
  addBalance: async (walletId, amount) => {
    return await makeRequest(`/api/wallets/${walletId}/add-balance`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  // Deduct balance from wallet
  deductBalance: async (walletId, amount) => {
    return await makeRequest(`/api/wallets/${walletId}/deduct-balance`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  // Scan QR code
  scanQR: async qrData => {
    return await makeRequest('/api/wallets/scan-qr', {
      method: 'POST',
      body: JSON.stringify({ qr_data: qrData }),
    });
  },
};
