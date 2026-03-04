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

    // Count bills for this station created today
    let query = supabase
      .from("bills")
      .select("*", { count: "exact", head: true })
      .gte("createdAt", startUTC.toISOString());

    // Apply station filter if it exists (multi-tenancy)
    if (stationId) {
      query = query.eq("stationid", stationId);
    }

    const { count, error } = await query;

    if (error) {
      console.error("DB Error Detail:", JSON.stringify(error, null, 2));
      throw error;
    }

    const nextNum = (count || 0) + 1;
    
    // Final Format: #YYYYMMDD-N
    return `#${dateKey}-${nextNum}`;
  } catch (err) {
    console.error("Critical: Failed to generate sequential bill number. Falling back to timestamp.", err);
    // Safe fallback to ensure bill creation doesn't fail
    return `B${Date.now()}`;
  }
};
