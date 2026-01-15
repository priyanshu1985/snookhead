
import { getSupabase } from './config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function listTables() {
  const supabase = getSupabase();
  // We can't easily list tables with supabase-js directly without SQL editor or RPC.
  // BUT we can try to query information_schema if we have permissions (PostgREST usually doesn't expose it by default).
  // Alternatively, we can try to "select count" from common names.
  
  const potentialNames = ['users', 'Users', 'USERS', 'User', 'user', 'menuitems', 'MenuItems', 'MENUITEMS'];
  
  for (const name of potentialNames) {
      const { count, error } = await supabase.from(name).select('*', { count: 'exact', head: true });
      if (!error) {
          console.log(`✅ Table "${name}" exists!`);
      } else {
          // console.log(`❌ Table "${name}" error: ${error.message}`);
      }
  }
}

listTables();
