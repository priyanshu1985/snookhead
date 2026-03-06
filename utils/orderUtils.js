import { getSupabase } from "../config/supabase.js";

/**
 * Generates a sequential order number that resets daily per station.
 * Format: #O{stationId}-{YYYYMMDD}-{N}
 * 
 * @param {number|string} stationId - The station ID for multi-tenant isolation
 * @returns {Promise<string>} - The generated order number
 */
export const generateSequentialOrderNo = async (stationId) => {
  try {
    const supabase = getSupabase();
    
    // Calculate start of today in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffset);
    const startIST = new Date(nowIST);
    startIST.setUTCHours(0, 0, 0, 0);
    const startUTC = new Date(startIST.getTime() - istOffset);

    // Format for display (YYYYMMDD)
    const year = nowIST.getUTCFullYear();
    const month = String(nowIST.getUTCMonth() + 1).padStart(2, '0');
    const day = String(nowIST.getUTCDate()).padStart(2, '0');
    const dateKey = `${year}${month}${day}`;

    // Fetch orders for this station created today
    let query = supabase
      .from("orders")
      .select("order_number")
      .gte("createdAt", startUTC.toISOString());

    if (stationId) {
      query = query.eq("stationid", stationId);
    }

    const { data: orders, error } = await query;

    if (error) {
      // If error is "column does not exist", we might need to fallback
      if (error.code === 'PGRST204' || error.message.includes('column "order_number" does not exist')) {
        console.warn("Table orders does not have order_number column. Using ID fallback.");
        return null;
      }
      throw error;
    }

    let maxNum = 0;
    if (orders && orders.length > 0) {
      orders.forEach(o => {
        if (o.order_number) {
          const parts = o.order_number.split('-');
          if (parts && parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            const num = parseInt(lastPart, 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      });
    }

    const nextNum = maxNum + 1;
    const stationPrefix = stationId ? `S${stationId}-` : '';
    return `O${stationPrefix}${dateKey}-${nextNum}`;
  } catch (err) {
    console.error("Failed to generate sequential order number:", err);
    return null;
  }
};
