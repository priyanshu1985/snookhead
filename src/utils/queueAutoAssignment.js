// Queue Auto-Assignment Utility
// Handles automatic assignment of queue members to tables when they become available

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

/**
 * Get the next queue member waiting for a specific table WITHOUT auto-assigning
 * Used to show confirmation dialog before starting the session
 * @param {number} tableId - The ID of the table that became available
 * @returns {Promise<object|null>} - Returns the next queue member or null
 */
export const getNextQueueMember = async tableId => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found');
      return null;
    }

    console.log(`Checking queue for table ${tableId}...`);

    // Fetch the queue to find waiting customers for this table
    const queueResponse = await fetch(`${API_URL}/api/queue`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!queueResponse.ok) {
      console.error('Failed to fetch queue');
      return null;
    }

    const queueData = await queueResponse.json();
    const queue = Array.isArray(queueData)
      ? queueData
      : queueData.queue || queueData.data || [];

    // Find table's game ID
    const tableResponse = await fetch(`${API_URL}/api/tables`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    let tableGameId = null;
    if (tableResponse.ok) {
      const tablesData = await tableResponse.json();
      const allTables = Array.isArray(tablesData.data)
        ? tablesData.data
        : Array.isArray(tablesData)
        ? tablesData
        : [];
      const table = allTables.find(t => t.id === tableId);
      if (table) {
        tableGameId = table.game_id || table.gameid;
      }
    }

    // Sort queue by priority: specific table first, then by position/creation time
    const waitingCustomers = queue
      .filter(q => q.status === 'waiting')
      .sort((a, b) => {
        const aMatchesTable = a.preferredtableid === tableId;
        const bMatchesTable = b.preferredtableid === tableId;

        if (aMatchesTable && !bMatchesTable) return -1;
        if (!aMatchesTable && bMatchesTable) return 1;

        const aMatchesGame = a.gameid === tableGameId;
        const bMatchesGame = b.gameid === tableGameId;

        if (aMatchesGame && !bMatchesGame) return -1;
        if (!aMatchesGame && bMatchesGame) return 1;

        return (a.position || a.id) - (b.position || b.id);
      });

    if (waitingCustomers.length === 0) {
      console.log('No waiting customers found in queue');
      return null;
    }

    const nextCustomer = waitingCustomers[0];
    console.log(
      `Found waiting customer: ${
        nextCustomer.customername || nextCustomer.customer_name
      }`,
    );

    return nextCustomer;
  } catch (error) {
    console.error('Error getting next queue member:', error);
    return null;
  }
};

/**
 * Start a session for a queue member and remove them from queue
 * @param {number} tableId - The ID of the table
 * @param {object} queueMember - The queue member to assign
 * @returns {Promise<object|null>} - Returns session data or null
 */
export const assignQueueMemberToTable = async (tableId, queueMember) => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return null;

    const bookingData = {
      table_id: tableId,
      game_id: queueMember.gameid || 1,
      user_id: null,
      duration_minutes: queueMember.duration_minutes || null,
      booking_type: queueMember.booking_type || 'timer',
      frame_count: queueMember.frame_count || null,
      customer_name:
        queueMember.customername ||
        queueMember.customer_name ||
        'Queue Customer',
    };

    console.log('Starting session for queue member:', bookingData);

    const bookingResponse = await fetch(`${API_URL}/api/activeTables/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bookingData),
    });

    const bookingResult = await bookingResponse.json();

    if (
      !bookingResponse.ok ||
      (bookingResult && bookingResult.success === false)
    ) {
      console.error('Failed to start booking:', bookingResult);
      return null;
    }

    console.log('✅ Session started successfully!');

    // Remove customer from queue
    try {
      await fetch(`${API_URL}/api/queue/${queueMember.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Customer removed from queue');
    } catch (deleteError) {
      console.error('Failed to remove customer from queue:', deleteError);
    }

    return bookingResult;
  } catch (error) {
    console.error('Error assigning queue member:', error);
    return null;
  }
};

/**
 * Check and auto-assign queue members when a table becomes available
 * This should be called whenever a table status changes from occupied to available
 * @param {number} tableId - The ID of the table that became available
 * @returns {Promise<boolean>} - Returns true if assignment was successful
 */
export const checkAndAutoAssignQueue = async tableId => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found for queue auto-assignment');
      return false;
    }

    console.log(`Checking queue for table ${tableId}...`);

    // Fetch the queue to find waiting customers for this table
    const queueResponse = await fetch(`${API_URL}/api/queue`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!queueResponse.ok) {
      console.error('Failed to fetch queue');
      return false;
    }

    const queueData = await queueResponse.json();
    const queue = Array.isArray(queueData)
      ? queueData
      : queueData.queue || queueData.data || [];

    // Find first waiting customer for this table or for any table with same game
    // Priority: 1) Specific table preference, 2) Same game any table
    const tableResponse = await fetch(`${API_URL}/api/tables`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    let tableGameId = null;
    if (tableResponse.ok) {
      const tablesData = await tableResponse.json();
      const allTables = Array.isArray(tablesData.data)
        ? tablesData.data
        : Array.isArray(tablesData)
        ? tablesData
        : [];
      const table = allTables.find(t => t.id === tableId);
      if (table) {
        tableGameId = table.game_id || table.gameid;
      }
    }

    // Sort queue by priority: specific table first, then by position/creation time
    const waitingCustomers = queue
      .filter(q => q.status === 'waiting')
      .sort((a, b) => {
        // First priority: customers waiting for this specific table
        const aMatchesTable = a.preferredtableid === tableId;
        const bMatchesTable = b.preferredtableid === tableId;

        if (aMatchesTable && !bMatchesTable) return -1;
        if (!aMatchesTable && bMatchesTable) return 1;

        // Second priority: customers waiting for same game (any table)
        const aMatchesGame = a.gameid === tableGameId;
        const bMatchesGame = b.gameid === tableGameId;

        if (aMatchesGame && !bMatchesGame) return -1;
        if (!aMatchesGame && bMatchesGame) return 1;

        // Third priority: position or ID (FIFO)
        return (a.position || a.id) - (b.position || b.id);
      });

    if (waitingCustomers.length === 0) {
      console.log('No waiting customers found in queue');
      return false;
    }

    // Get the first waiting customer
    const nextCustomer = waitingCustomers[0];
    console.log(
      `Found waiting customer: ${
        nextCustomer.customername || nextCustomer.customer_name
      }`,
    );

    // Auto-assign by starting a table booking for this customer
    const bookingData = {
      table_id: tableId,
      game_id: nextCustomer.gameid || 1,
      user_id: null,
      duration_minutes: nextCustomer.duration_minutes || null,
      booking_type: nextCustomer.booking_type || 'timer',
      frame_count: nextCustomer.frame_count || null,
      customer_name:
        nextCustomer.customername ||
        nextCustomer.customer_name ||
        'Queue Customer',
    };

    console.log('Starting auto-assignment booking:', bookingData);

    const bookingResponse = await fetch(`${API_URL}/api/activeTables/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bookingData),
    });

    const bookingResult = await bookingResponse.json();

    // Check both HTTP status and response body for errors
    if (
      !bookingResponse.ok ||
      (bookingResult && bookingResult.success === false)
    ) {
      console.error('Failed to start booking:', bookingResult);

      // If it's a conflict, log the specific message
      if (bookingResult.error === 'BOOKING_CONFLICT') {
        console.log('Table has a booking conflict, skipping auto-assignment');
      }

      return false;
    }

    console.log('✅ Auto-assignment successful!');

    // Remove customer from queue
    try {
      await fetch(`${API_URL}/api/queue/${nextCustomer.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Customer removed from queue');
    } catch (deleteError) {
      console.error('Failed to remove customer from queue:', deleteError);
      // Don't fail the assignment if queue deletion fails
    }

    return true;
  } catch (error) {
    console.error('Error in queue auto-assignment:', error);
    return false;
  }
};

/**
 * Poll for queue assignments (can be called periodically to check for available tables)
 * This is a backup mechanism in case real-time updates are not available
 */
export const pollQueueAssignments = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return;

    // Fetch all tables
    const tablesResponse = await fetch(`${API_URL}/api/tables`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!tablesResponse.ok) return;

    const tablesData = await tablesResponse.json();
    const allTables = Array.isArray(tablesData.data)
      ? tablesData.data
      : Array.isArray(tablesData)
      ? tablesData
      : [];

    // Find available tables
    const availableTables = allTables.filter(
      table => table.status === 'available' || !table.status,
    );

    console.log(`Found ${availableTables.length} available tables`);

    // Try to assign queue members to available tables
    for (const table of availableTables) {
      await checkAndAutoAssignQueue(table.id);
    }
  } catch (error) {
    console.error('Error polling queue assignments:', error);
  }
};

/**
 * Start auto-assignment monitoring
 * Call this when the app starts or when entering relevant screens
 */
export const startQueueMonitoring = (intervalMs = 30000) => {
  console.log('Starting queue monitoring...');
  const intervalId = setInterval(() => {
    pollQueueAssignments();
  }, intervalMs);

  return intervalId;
};

/**
 * Stop auto-assignment monitoring
 */
export const stopQueueMonitoring = intervalId => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('Stopped queue monitoring');
  }
};
