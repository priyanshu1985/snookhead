import "dotenv/config";
import { getSupabase } from './config/supabase.js';

async function getSchema() {
  try {
    const supabase = getSupabase();
    
    const table = 'bills';
    console.log(`\n--- Schema for table: ${table} ---`);
    
    const { data: record, error: queryError } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (queryError) {
      console.log(`Error querying ${table}: ${queryError.message}`);
    } else if (record && record.length > 0) {
      console.log(`Columns for ${table}:`, Object.keys(record[0]).join(', '));
      console.log('Sample record:', JSON.stringify(record[0], null, 2));
    } else {
      console.log(`Table ${table} exists (no records to show columns).`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

getSchema();
