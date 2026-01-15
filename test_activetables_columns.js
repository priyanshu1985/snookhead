
import { getSupabase } from './config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkActiveTableColumns() {
  const supabase = getSupabase();
  console.log('--- TESTING COLUMN NAMES FOR ACTIVETABLES ---');

  // Try insert with booking_end_time (snake_case)
  console.log('1. Testing "booking_end_time"...');
  // We need a valid table_id and game_id. Assuming 1 and 1 exists based on previous screenshots/tests or nullable.
  // Actually, foreign keys might enforce existence.
  // I will try to read first (select) to see columns? No, empty table.
  // I will try insert with minimal dummy data.
  
  const payload = {
      table_id: 1, // assumes table 1 exists
      game_id: 1, // assumes game 1 exists
      start_time: new Date().toISOString(),
      duration_minutes: 60,
      status: 'active'
  };

  const { error: e1 } = await supabase.from('activetables').insert({
      ...payload,
      booking_end_time: new Date().toISOString()
  });

  if (e1) {
      console.log('❌ booking_end_time failed:', e1.message);
  } else {
      console.log('✅ booking_end_time SUCCESS!');
      process.exit(0);
  }

  // Try insert with bookingEndTime (camelCase)
  console.log('2. Testing "bookingEndTime"...');
  const { error: e2 } = await supabase.from('activetables').insert({
      ...payload,
      bookingEndTime: new Date().toISOString()
  });

  if (e2) {
      console.log('❌ bookingEndTime failed:', e2.message);
  } else {
      console.log('✅ bookingEndTime SUCCESS!');
      process.exit(0);
  }
  
  // Try insert with BookingEndTime (PascalCase)
  console.log('3. Testing "BookingEndTime"...');
   const { error: e3 } = await supabase.from('activetables').insert({
      ...payload,
      BookingEndTime: new Date().toISOString()
  });

  if (e3) {
      console.log('❌ BookingEndTime failed:', e3.message);
  } else {
      console.log('✅ BookingEndTime SUCCESS!');
      process.exit(0);
  }

  process.exit(0);
}

checkActiveTableColumns();
