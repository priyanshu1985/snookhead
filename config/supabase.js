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

    // Test with storage API which is more reliable than table access
    const { data, error } = await client.storage.listBuckets();

    if (error) {
      console.log("❌ Supabase Connection Failed:", error.message);
      return false;
    }

    console.log("✅ Supabase Connected Successfully!");
    return true;
  } catch (err) {
    console.log("❌ Connection Error:", err.message);
    return false;
  }
};

// Export the client getter as default for backward compatibility
export { getSupabase as supabase };
