
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  console.log(`\n--- Checking table: ${tableName} ---`);
  // Try to insert a dummy row to get schema error or select one
  const { data, error } = await supabase.from(tableName).select("*").limit(1);
  
  if (error) {
    console.error(`Error selecting from ${tableName}:`, error.message);
    if (error.hint) console.log("Hint:", error.hint);
    return;
  }

  if (data && data.length > 0) {
    console.log("Columns found (from first row):", Object.keys(data[0]));
  } else {
    console.log("Table exists but is empty. Cannot infer columns from data.");
    // Try to trigger an error by selecting a non-existent column to see if it lists valid ones?
    // Or just accept we know it exists.
    // Let's try to get column info if possible. Supabase API doesn't list columns directly easily without rows.
  }
}

async function main() {
  await checkTable("users");
  await checkTable("stations");
}

main();
