import "dotenv/config";
import { getSupabase } from './config/supabase.js';

async function checkTables() {
  try {
    const supabase = getSupabase();
    
    console.log('Checking stationpayments...');
    const { data: p1, error: e1 } = await supabase.from('stationpayments').select('id').limit(1);
    console.log('stationpayments:', e1 ? e1.message : 'Exists');
    
    console.log('Checking station_payments...');
    const { data: p2, error: e2 } = await supabase.from('station_payments').select('id').limit(1);
    console.log('station_payments:', e2 ? e2.message : 'Exists');
    
    console.log('Checking stationissues...');
    const { data: i1, error: i_e1 } = await supabase.from('stationissues').select('id').limit(1);
    console.log('stationissues:', i_e1 ? i_e1.message : 'Exists');
    
    console.log('Checking station_issues...');
    const { data: i2, error: i_e2 } = await supabase.from('station_issues').select('id').limit(1);
    console.log('station_issues:', i_e2 ? i_e2.message : 'Exists');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTables();
