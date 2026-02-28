import "dotenv/config";
import { testConnection } from './config/supabase.js';

async function verify() {
  const ok = await testConnection();
  console.log(`Connection status: ${ok ? 'OK' : 'FAILED'}`);
  process.exit(ok ? 0 : 1);
}
verify();
