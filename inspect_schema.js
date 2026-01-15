
import { getSupabase } from './config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
  const supabase = getSupabase();
  console.log('Inspecting "tables" table...');
  const { data, error } = await supabase.from('tables').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching tables:', error.message);
  } else {
    if (data.length > 0) {
      console.log('Columns in "tables":', Object.keys(data[0]));
    } else {
      console.log('"tables" is empty. Cannot infer columns from data.');
      // Try to insert a dummy row to see errors? No, that might be messy.
    }
  }

  console.log('Inspecting "users" table...');
    const { data: uData, error: uError } = await supabase.from('users').select('*').limit(1);
    if (uData && uData.length > 0) console.log('Columns in "users":', Object.keys(uData[0]));

  console.log('Inspecting "menuitems" table...');
    const { data: mData, error: mError } = await supabase.from('menuitems').select('*').limit(1);
    if (mError) {
        console.log('Error inspecting menuitems:', mError.message);
    } else if (mData && mData.length > 0) {
        console.log('Columns in "menuitems":', Object.keys(mData[0]));
    } else {
        console.log('"menuitems" is empty.');
    }

  process.exit(0);
}

inspect();
