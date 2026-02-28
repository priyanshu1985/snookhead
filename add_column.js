import 'dotenv/config';
import { getSupabase } from './config/supabase.js';

const supabase = getSupabase();

async function addApprovalColumn() {
  console.log('Adding is_approved column to users table...');
  
  // Try to use RPC if available, or just direct SQL if service role allows
  // Since we are using service role, we might be able to use the REST API
  // but it doesn't support ALTER TABLE directly.
  
  // Let's first check if 'status' column exists and we can reuse it
  const { data: record, error: queryError } = await supabase
    .from('users')
    .select('*')
    .limit(1);
    
  if (queryError) {
    console.error('Error fetching user:', queryError.message);
    return;
  }
  
  const columns = Object.keys(record[0]);
  if (columns.includes('is_approved')) {
    console.log('is_approved column already exists.');
    return;
  }

  console.log('Available columns:', columns.join(', '));
  
  // If we can't run SQL directly via REST, we might need the user to do it
  // or use a clever trick if possible.
  
  // Actually, I can try to use the 'salary_amount' column as a workaround if I can't add a column,
  // but that's hacky.
  
  // Let's try to run a raw SQL query if they have a 'rpc' for it
  const { error: rpcError } = await supabase.rpc('exec_sql', { 
    sql_query: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;' 
  });
  
  if (rpcError) {
    console.warn('RPC exec_sql failed (likely not defined):', rpcError.message);
    console.log('I will try to use "salary_amount" or another field as a proxy for "is_approved" if I cannot add a column.');
    console.log('OR I can try to check if there is a "status" field in the Station table that I can use.');
  } else {
    console.log('Successfully added is_approved column via RPC!');
  }
}

addApprovalColumn();
