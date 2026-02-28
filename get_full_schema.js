import "dotenv/config";
import { getSupabase } from './config/supabase.js';

async function getFullSchema() {
  try {
    const supabase = getSupabase();
    
    // We can't query information_schema directly via API easily.
    // But we can try to use a dummy query that errors out to see if it leaks info, 
    // or just rely on the fact that if table exists, select * from table limit 0 will return headers in some clients, 
    // but not necessarily in supabase-js.
    // The most reliable way is to have at least one record.
    
    const tables = ['stations', 'users', 'stationpayments', 'stationissues'];
    
    for (const table of tables) {
      console.log(`\n=== Table: ${table} ===`);
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Error: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]).join(', '));
      } else {
        console.log('Table exists but is empty. We need to know column names.');
        // Try to insert a dummy record and rollback? No, that's risky.
        // Let's try to search for the table in the current models/index.js just to see what it THINKS it has,
        // and then verify with the user if it fails.
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
getFullSchema();
