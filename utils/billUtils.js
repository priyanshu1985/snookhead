import { getSupabase } from "../config/supabase.js";

/**
 * Generates a sequential bill number that resets daily per station (Domino's style).
 * Format: #YYYYMMDD-N (e.g., #20260304-16)
 * 
 * @param {number|string} stationId - The station ID for multi-tenant isolation
 * @returns {Promise<string>} - The generated bill number
 */
export const generateSequentialBillNo = async (stationId) => {
  try {
    const supabase = getSupabase();
    
    // Calculate start of today in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 mins
    
    // Get current time in IST
    const nowIST = new Date(now.getTime() + istOffset);
    
    // Start of day (00:00:00) in IST
    const startIST = new Date(nowIST);
    startIST.setUTCHours(0, 0, 0, 0);
    
    // Convert back to UTC for database query
    const startUTC = new Date(startIST.getTime() - istOffset);

    // Format for display part of the bill number (YYYYMMDD)
    const year = nowIST.getUTCFullYear();
    const month = String(nowIST.getUTCMonth() + 1).padStart(2, '0');
    const day = String(nowIST.getUTCDate()).padStart(2, '0');
    const dateKey = `${year}${month}${day}`;

    // Fetch all bill numbers for this station created today to find the maximum
    // This is more robust than counting if bills were deleted.
    let query = supabase
      .from("bills")
      .select("billnumber")
      .gte("createdAt", startUTC.toISOString());

    if (stationId) {
      query = query.eq("stationid", stationId);
    }

    const { data: bills, error } = await query;

    if (error) {
      console.error("DB Error Detail:", JSON.stringify(error, null, 2));
      throw error;
    }

    // Extract the numeric part (N) from the bill number and find the max
    let maxNum = 0;
    if (bills && bills.length > 0) {
      bills.forEach(b => {
        const parts = b.billnumber?.split('-');
        if (parts && parts.length > 1) {
          // The numeric part is always the last segment
          const lastPart = parts[parts.length - 1];
          const num = parseInt(lastPart, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }

    const nextNum = maxNum + 1;
    
    // Final Format: #S{stationId}-{YYYYMMDD}-{N}
    // This ensures uniqueness across stations even if they have the same sequence.
    const stationPrefix = stationId ? `S${stationId}-` : '';
    return `#${stationPrefix}${dateKey}-${nextNum}`;
  } catch (err) {
    console.error("Critical: Failed to generate sequential bill number. Falling back to timestamp.", err);
    // Safe fallback to ensure bill creation doesn't fail
    return `B${Date.now()}`;
  }
};
