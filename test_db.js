import dotenv from 'dotenv';
dotenv.config();
import { getSupabase } from './config/supabase.js';

async function test() {
  const db = getSupabase();
  const { data, error } = await db.from('activetables').select('*').order('activeid', { ascending: false }).limit(3);
  console.log("3 most recent sessions:");
  console.log(JSON.stringify(data, null, 2));
  process.exit();
}
test();
