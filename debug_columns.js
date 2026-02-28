import "dotenv/config";
import { getSupabase } from './config/supabase.js';

async function checkColumns() {
  try {
    const supabase = getSupabase();
    
    console.log('Sample station_payments record:');
    const { data: p, error: e1 } = await supabase.from('station_payments').select('*').limit(1);
    console.log(JSON.stringify(p[0] || 'No records', null, 2));
    
    console.log('Sample station_issues record:');
    const { data: i, error: e2 } = await supabase.from('station_issues').select('*').limit(1);
    console.log(JSON.stringify(i[0] || 'No records', null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkColumns();
