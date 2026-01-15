import express from "express";
import { getSupabase } from "../config/supabase.js";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const supabase = getSupabase();
    // Test Supabase connection by making a simple storage query (no RLS issues)
    const { error } = await supabase.storage.listBuckets();
    if (error && !error.message.includes('JWT')) {
      throw error;
    }
    res.json({
      status: "OK",
      database: "Connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res
      .status(503)
      .json({
        status: "Error",
        database: "Disconnected",
        error: error.message,
      });
  }
});

export default router;
