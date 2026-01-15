
import { getSupabase } from './config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function inspectColumns() {
  const supabase = getSupabase();
  
  const tables = ['games', 'tables', 'menuitems'];
  
  console.log('--- INSPECTING COLUMNS ---');
  
  for (const table of tables) {
      console.log(`\nTable: ${table}`);
      // Supabase-js doesn't give easy access to information_schema directly via .from() standard generic text
      // But we can try rpc if defined, or just plain old error based discovery?
      // Actually, we can use the .rpc() if we had a function, but we don't.
      // We can try to select * limit 0? No that returns []
      
      // Let's try to insert a dummy record with invalid keys to force an error listing valid columns?
      // Or just assume standard snake_case removal if that was the pattern for users/stations.
      
      // Better approach: Query a known endpoint or just look at previous errors.
      // Wait, I can try to use a direct SQL query if I had a way, but I only have the client.
      
      // Let's try to infer from the "Bad request" details if I can reproduce it.
      // But first, let's try to fetch one row again.
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (data && data.length > 0) {
          console.log(`Columns: ${Object.keys(data[0]).join(', ')}`);
      } else {
          console.log('No data found to infer columns.');
      }
  }
}

inspectColumns();
