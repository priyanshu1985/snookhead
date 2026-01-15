
import { getSupabase } from './config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkColumns() {
  const supabase = getSupabase();
  console.log('--- TESTING COLUMN NAMES FOR TABLES ---');

  // Try insert with frame_charge (snake_case)
  console.log('1. Testing "frame_charge"...');
  const { error: e1 } = await supabase.from('tables').insert({
      name: `ColTest ${Date.now()}`,
      gameid: '1', // assuming 1 exists or is foreign key
      frame_charge: 10
  });

  if (e1) {
      console.log('❌ frame_charge failed:', e1.message);
  } else {
      console.log('✅ frame_charge SUCCESS!');
      process.exit(0);
  }

  // Try insert with frameCharge (camelCase)
  console.log('2. Testing "frameCharge"...');
  const { error: e2 } = await supabase.from('tables').insert({
      name: `ColTest ${Date.now()}`,
      gameid: '1',
      frameCharge: 10
  });

  if (e2) {
      console.log('❌ frameCharge failed:', e2.message);
  } else {
      console.log('✅ frameCharge SUCCESS!');
      process.exit(0);
  }
  
 // Try insert with FrameCharge (PascalCase - unlikely but possible if quoted)
  console.log('3. Testing "FrameCharge"...');
  const { error: e3 } = await supabase.from('tables').insert({
      name: `ColTest ${Date.now()}`,
      gameid: '1',
      FrameCharge: 10
  });

  if (e3) {
      console.log('❌ FrameCharge failed:', e3.message);
  } else {
      console.log('✅ FrameCharge SUCCESS!');
      process.exit(0);
  }

  process.exit(0);
}

checkColumns();
