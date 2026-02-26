/**
 * Reservation & Booking Service Layer
 * Handles the complete flow for table reservations and immediate bookings
 */

import {
  reservationsAPI,
  activeTablesAPI,
  walletAPI,
  gamesAPI,
  tablesAPI,
  menuAPI,
} from './api';

/**
 * Create a future reservation with optional advance payment
 * @param {Object} reservationData - Reservation details
 * @param {Object} paymentData - Payment information (optional)
 * @param {boolean} acknowledgeConflicts - Whether to override conflict warnings
 * @returns {Promise} Created reservation
 */
export const createAdvanceReservation = async (
  reservationData,
  paymentData = null,
  acknowledgeConflicts = false,
) => {
  try {
    let notes = reservationData.notes || '';

    // Handle advance wallet payment if provided
    if (paymentData?.paymentMode === 'wallet' && paymentData?.payNow) {
      const { customerId, amount } = paymentData;

      // 1. Check wallet balance first
      const wallet = await walletAPI.lookup(customerId);
      if (!wallet || wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // 2. Deduct money from wallet
      await walletAPI.deductMoney(customerId, amount);

      // 3. Add payment note to reservation
      notes = `${notes}\n[PAID_WALLET: ${amount}]`.trim();
    }

    // Create reservation with updated notes and conflict acknowledgment flag
    const reservation = await reservationsAPI.create({
      ...reservationData,
      notes,
      acknowledge_conflicts: acknowledgeConflicts,
    });

    return {
      success: true,
      reservation,
      payment: paymentData
        ? { mode: paymentData.paymentMode, amount: paymentData.amount }
        : null,
    };
  } catch (error) {
    console.error('Advance reservation error:', error);
    console.log('Error details:', {
      message: error.message,
      status: error.status,
      data: error.data,
    });

    // Check if it's a BOOKING_WARNING (HTTP 409) that can be acknowledged
    if (
      error.message === 'BOOKING_WARNING' ||
      error.message.includes('BOOKING_WARNING') ||
      (error.status === 409 && error.data?.error === 'BOOKING_WARNING')
    ) {
      // Return a special response indicating user needs to confirm
      return {
        success: false,
        needsConfirmation: true,
        error: 'BOOKING_WARNING',
        message:
          error.data?.message ||
          error.message ||
          'There is a potential conflict with this reservation. Do you want to proceed anyway?',
        conflicts: error.data?.conflicts || [],
      };
    }

    throw error;
  }
};

/**
 * Start an immediate table session (walk-in)
 * @param {Object} sessionData - Session details
 * @param {boolean} acknowledgeConflicts - Force start despite conflicts
 * @returns {Promise} Started session
 */
export const startImmediateBooking = async (
  sessionData,
  acknowledgeConflicts = false,
) => {
  try {
    const payload = {
      ...sessionData,
      ...(acknowledgeConflicts && { acknowledge_conflicts: true }),
    };

    const response = await activeTablesAPI.start(payload);

    // Check if response indicates a conflict (backend returns success: false)
    if (
      response &&
      response.success === false &&
      response.error === 'BOOKING_CONFLICT'
    ) {
      // Format conflict message from conflicts array
      let conflictMessage = response.message || 'Table has a conflict';

      if (response.conflicts && response.conflicts.length > 0) {
        const conflict = response.conflicts[0];
        if (conflict.customer) {
          conflictMessage = `Table is currently in use by ${
            conflict.customer
          }. ${response.message || ''}`;
        }
      }

      return {
        success: false,
        conflict: true,
        error: conflictMessage,
        data: response.conflicts || null,
      };
    }

    return { success: true, session: response };
  } catch (error) {
    console.error('Immediate booking error:', error);
    console.log('Error details:', {
      message: error.message,
      status: error.status,
      data: error.data,
    });

    // Check if it's a BOOKING_WARNING (HTTP 409) that can be acknowledged
    if (
      error.message === 'BOOKING_WARNING' ||
      error.message.includes('BOOKING_WARNING') ||
      (error.status === 409 && error.data?.error === 'BOOKING_WARNING')
    ) {
      return {
        success: false,
        needsConfirmation: true,
        error: 'BOOKING_WARNING',
        message:
          error.data?.message ||
          error.message ||
          'There is a potential conflict with this booking. Do you want to proceed anyway?',
        conflicts: error.data?.conflicts || [],
      };
    }

    // Handle HTTP error responses (409 Conflict or other)
    if (
      error.message.includes('409') ||
      error.message.includes('reserved') ||
      error.message.includes('occupied') ||
      error.message.includes('conflict')
    ) {
      return {
        success: false,
        conflict: true,
        error: error.message,
        data: null,
      };
    }

    console.error('Immediate booking error:', error);
    throw error;
  }
};

/**
 * Lookup wallet by phone/member ID/alias
 * @param {string} query - Phone, member_seq, or alias
 * @returns {Promise} Wallet details with customer info
 */
export const lookupWallet = async query => {
  try {
    const wallet = await walletAPI.lookup(query);

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    return {
      success: true,
      wallet: {
        id: wallet.id,
        customerId: wallet.customerid,
        customerName: wallet.Customer?.name || 'Unknown',
        balance: parseFloat(wallet.balance || 0),
        phone: wallet.Customer?.phone || '',
        memberSeq: wallet.Customer?.member_seq || null,
      },
    };
  } catch (error) {
    console.error('Wallet lookup error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate estimated cost for reservation
 * @param {Object} bookingDetails - Booking details
 * @returns {Promise} Estimated cost breakdown
 */
export const calculateEstimatedCost = async bookingDetails => {
  const {
    booking_type,
    duration_minutes,
    frame_count,
    game_id,
    table_id, // New: support table-specific pricing
    food_orders = [],
  } = bookingDetails;

  try {
    // 1. Get game and table details for pricing
    const [gamesData, tablesData] = await Promise.all([
      gamesAPI.getAll(),
      tablesAPI.getAll()
    ]);

    // Robustly handle potentially wrapped responses (e.g., { data: [...] })
    const games = Array.isArray(gamesData) ? gamesData : (gamesData?.data || []);
    const tables = Array.isArray(tablesData) ? tablesData : (tablesData?.data || []);

    // Robust ID matching (handling string vs number)
    const game = games.find(g => String(g.id) === String(game_id));
    const table = table_id ? tables.find(t => String(t.id) === String(table_id)) : null;

    if (!game) {
      console.warn(`[calculateEstimatedCost] Game not found for ID: ${game_id}. Using 0 as fallback.`);
    }

    let tableCost = 0;

    // 2. Calculate table cost
    // Prioritize table pricing if available (matches old ReservationFormModal logic)
    if (table) {
      if ((booking_type === 'timer' || booking_type === 'set_time') && duration_minutes) {
        const pricePerMin = parseFloat(table.pricePerMin || table.pricepermin || 0);
        if (pricePerMin > 0) {
          tableCost = duration_minutes * pricePerMin;
        } else {
          // Fallback to game pricing if table price is not set
          const hours = duration_minutes / 60;
          tableCost = hours * (game?.price_per_hour || 0);
        }
      } else if (booking_type === 'frame' && frame_count) {
        const frameCharge = parseFloat(table.frameCharge || table.framecharge || 0);
        if (frameCharge > 0) {
          tableCost = frame_count * frameCharge;
        } else {
          // Fallback
          tableCost = frame_count * (game?.price_per_frame || 0);
        }
      }
    } else if (game) {
      // Game-level fallback if table not specified
      if ((booking_type === 'timer' || booking_type === 'set_time') && duration_minutes) {
        const hours = duration_minutes / 60;
        tableCost = hours * (game.price_per_hour || 0);
      } else if (booking_type === 'frame' && frame_count) {
        tableCost = frame_count * (game.price_per_frame || 0);
      }
    }

    // 3. Calculate food cost
    let foodCost = 0;
    if (food_orders.length > 0) {
      const menuItems = await menuAPI.getAll();
      foodCost = food_orders.reduce((total, order) => {
        const item = menuItems.find(m => String(m.id) === String(order.id));
        let itemPrice = item ? item.price : 0;
        
        if (order.variation_id && item?.variations) {
          const variation = item.variations.find(v => String(v.id) === String(order.variation_id));
          if (variation) itemPrice = variation.price;
        }
        
        return total + (itemPrice * order.qty);
      }, 0);
    }

    const subtotal = tableCost + foodCost;
    const taxRate = 0.05; // 5% GST
    const taxes = subtotal * taxRate;
    const totalCost = subtotal + taxes;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tableCost: parseFloat(tableCost.toFixed(2)),
      foodCost: parseFloat(foodCost.toFixed(2)),
      taxes: parseFloat(taxes.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      breakdown: {
        game: game?.name || 'Unknown',
        table: table?.name || 'Any',
        booking_type,
        ...(booking_type === 'timer' && {
          duration: `${duration_minutes} minutes`,
        }),
        ...((booking_type === 'timer' || booking_type === 'set_time') && {
          duration: `${duration_minutes} minutes`,
        }),
        ...(booking_type === 'frame' && { frames: frame_count }),
      },
    };
  } catch (error) {
    console.error('Cost calculation error:', error);
    throw error;
  }
};

/**
 * Get available tables for a specific game and time slot
 * @param {number} gameId - Game ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {number} durationMinutes - Duration in minutes
 * @returns {Promise} Available tables
 */
export const getAvailableTables = async (
  gameId,
  date = null,
  startTime = null,
  durationMinutes = null,
) => {
  try {
    const rawTables = await tablesAPI.getAll();
    const allTables = Array.isArray(rawTables) ? rawTables : (rawTables?.data || []);

    // Filter tables by game
    let availableTables = allTables.filter(
      t => String(t.gameid || t.game_id) === String(gameId) && t.status !== 'maintenance',
    );

    // If checking for specific time slot, filter out reserved tables
    if (date && startTime && durationMinutes) {
      const reservations = await reservationsAPI.getAll();

      const requestedStart = new Date(`${date}T${startTime}`);
      const requestedEnd = new Date(
        requestedStart.getTime() + durationMinutes * 60000,
      );

      availableTables = availableTables.filter(table => {
        // Check if table has any conflicting reservations
        const hasConflict = reservations.some(res => {
          if (res.table_id !== table.id || res.status === 'cancelled')
            return false;

          const resStart = new Date(
            `${res.reservation_date}T${res.start_time}`,
          );
          const resEnd = new Date(
            resStart.getTime() + (res.duration_minutes || 60) * 60000,
          );

          // Check for time overlap
          return requestedStart < resEnd && requestedEnd > resStart;
        });

        return !hasConflict;
      });
    }

    return availableTables;
  } catch (error) {
    console.error('Get available tables error:', error);
    throw error;
  }
};

export default {
  createAdvanceReservation,
  startImmediateBooking,
  lookupWallet,
  calculateEstimatedCost,
  getAvailableTables,
};
