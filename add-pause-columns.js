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
    console.log("Connected to DB!");

    await client.query("ALTER TABLE active_tables ADD COLUMN IF NOT EXISTS pause_start_time TIMESTAMP WITH TIME ZONE NULL");
    console.log("Added pause_start_time");

    await client.query("ALTER TABLE active_tables ADD COLUMN IF NOT EXISTS accumulated_pause_seconds INTEGER DEFAULT 0");
    console.log("Added accumulated_pause_seconds");

    await client.query("ALTER TABLE active_tables ADD COLUMN IF NOT EXISTS auto_resume_at TIMESTAMP WITH TIME ZONE NULL");
    console.log("Added auto_resume_at");

    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log("Schema reloaded!");
  } catch (e) {
    console.error("Migration error:", e.message);
  } finally {
    await client.end();
  }
}
main();
