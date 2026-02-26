// config/supabase.js
import { createClient } from "@supabase/supabase-js";

let supabase = null;

// Initialize Supabase client
export const initSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for server

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file"
    );
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey);
  return supabase;
};

// Get Supabase client (lazy initialization)
export const getSupabase = () => {
  if (!supabase) {
    initSupabase();
  }
  return supabase;
};

// Connection test
export const testConnection = async () => {
  try {
    const client = getSupabase();
    console.log("🔍 Checking Supabase connectivity...");

    // Test with a simple storage query with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for slow networks

    const { data, error } = await client.storage.listBuckets();
    clearTimeout(timeoutId);

    if (error) {
      console.log("❌ Supabase Connection Failed:", error.message);
      if (error.message.includes("fetch failed")) {
        console.log("💡 Hint: This is likely a network/DNS issue. Check your internet or firewall.");
      }
      return false;
    }

    console.log("✅ Supabase Connected Successfully!");
    return true;
  } catch (err) {
    console.log("❌ Connection Error:", err.message);
    if (err.name === 'AbortError') {
      console.log("📡 Timeout: The network is too slow to reach Supabase. Retrying might help.");
    }
    return false;
  }
};

// Export the client getter as default for backward compatibility
export { getSupabase as supabase };
