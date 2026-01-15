
import { getSupabase } from './config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function debugPermissions() {
  const supabase = getSupabase();
  
  console.log('--- DEBUGGING PERMISSIONS ---');
  
  // 1. Check User table (known good)
  console.log('\n1. Checking "users" table access...');
  const { data: uData, error: uError } = await supabase.from('users').select('count', { count: 'exact', head: true });
  if (uError) console.log('❌ Users Select Failed:', uError.message);
  else console.log('✅ Users Select OK.');

  // 2. Check Games table Select
  console.log('\n2. Checking "games" table SELECT...');
  const { data: gData, error: gError } = await supabase.from('games').select('count', { count: 'exact', head: true });
  if (gError) console.log('❌ Games Select Failed:', gError.message);
  else console.log('✅ Games Select OK.');

  // 3. Check Games table Insert
  console.log('\n3. Checking "games" table INSERT...');
  const { data: iData, error: iError } = await supabase.from('games').insert({
      gamename: `Permission Test ${Date.now()}`,
      gamecreatedon: new Date(),
      createdby: 'system_test'
  }).select();

  if (iError) {
      console.log('❌ Games Insert Failed:', JSON.stringify(iError, null, 2));
      // Log auth state
      const { data: authData } = await supabase.auth.getSession();
      // Since we use service key, there is no session but let's check config headers
      // Actually accessing private props is hacky but we need to know the role.
      // We can try rpc to get current user? No.
  } else {
      console.log('✅ Games Insert OK.');
      // Cleanup
      if (iData && iData.length) {
          await supabase.from('games').delete().eq('gameid', iData[0].gameid);
      }
  }

  process.exit(0);
}

debugPermissions();
