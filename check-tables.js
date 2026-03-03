import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const { Client } = pg;
const dbUrl = "postgres://postgres.yvfxqicpftbhmrsqhdwp:Priy4nshu*1987*@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("Tables:", res.rows.map(r => r.table_name));
  } catch(e) {
    console.error("Migration error:", e.message);
  } finally {
    await client.end();
  }
}
main();
