// Reservation Monitoring Utility
// Handles automatic notification when reservation time arrives

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import eventEmitter from './eventEmitter';

let monitoringInterval = null;
let lastCheckedReservations = new Set();

/**
 * Get reservations that are ready to start NOW (at or past scheduled time)
 * @returns {Promise<Array>} - Array of reservations ready to start
 */
export const getUpcomingReservations = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found');
      return [];
    }

    // Fetch all pending reservations
    const response = await fetch(`${API_URL}/api/reservations`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch reservations');
      return [];
    }

    const data = await response.json();
    const reservations = Array.isArray(data) ? data : data.data || [];

    // Filter for pending reservations only
    const pendingReservations = reservations.filter(
      r => r.status === 'pending',
    );

    // Get current time
    const now = new Date();

    // Find reservations that are ready NOW (at or past scheduled time)
    const upcomingReservations = pendingReservations.filter(reservation => {
      const reservationTime = new Date(
        reservation.fromTime ||
          reservation.fromtime ||
          reservation.reservationtime ||
          reservation.reservation_time,
      );

      // Check if current time has reached or passed the scheduled time
      const timeDiff = now.getTime() - reservationTime.getTime(); // Positive if we're past scheduled time

      // Show notification if:
      // 1. Current time is at or past scheduled time (timeDiff >= 0)
      // 2. But not more than 30 minutes late (timeDiff <= 30 min)
      const isReady = timeDiff >= 0 && timeDiff <= 30 * 60 * 1000;

      return isReady;
    });

    return upcomingReservations;
  } catch (error) {
    console.error('Error getting upcoming reservations:', error);
    return [];
  }
};

/**
 * Check for reservations that need to be notified
 * Emits event for each new reservation that's ready
 */
const checkReservations = async () => {
  try {
    const upcomingReservations = await getUpcomingReservations(); // Check for ready reservations

    for (const reservation of upcomingReservations) {
      const reservationKey = `res_${reservation.id}`;

      // Only emit event if this reservation hasn't been notified yet
      if (!lastCheckedReservations.has(reservationKey)) {
        console.log(
          `Reservation ready: ${
            reservation.customerName || reservation.customer_name
          } for table ${reservation.tableId || reservation.tableid}`,
        );

        // Emit event with reservation details
        eventEmitter.emit('RESERVATION_READY', reservation);

        // Mark as notified
        lastCheckedReservations.add(reservationKey);
      }
    }

    // Clean up old entries from the set (reservations that are no longer in the list)
    const currentReservationKeys = new Set(
      upcomingReservations.map(r => `res_${r.id}`),
    );
    for (const key of lastCheckedReservations) {
      if (!currentReservationKeys.has(key)) {
        lastCheckedReservations.delete(key);
      }
    }
  } catch (error) {
    console.error('Error checking reservations:', error);
  }
};

/**
 * Start monitoring for upcoming reservations
 * @param {number} intervalSeconds - How often to check (default: 30 seconds)
 */
export const startReservationMonitoring = (intervalSeconds = 30) => {
  // Stop any existing monitoring
  stopReservationMonitoring();

  console.log(
    `Starting reservation monitoring (checking every ${intervalSeconds}s)`,
  );

  // Initial check
  checkReservations();

  // Set up interval
  monitoringInterval = setInterval(() => {
    checkReservations();
  }, intervalSeconds * 1000);
};

/**
 * Stop monitoring for reservations
 */
export const stopReservationMonitoring = () => {
  if (monitoringInterval) {
    console.log('Stopping reservation monitoring');
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
};

/**
 * Reset the notification tracking (useful for testing or manual refresh)
 */
export const resetReservationTracking = () => {
  lastCheckedReservations.clear();
  console.log('Reservation tracking reset');
};

/**
 * Manually trigger a reservation check (useful for pull-to-refresh)
 */
export const triggerReservationCheck = async () => {
  console.log('Manual reservation check triggered');
  await checkReservations();
};
