
import { getSupabase } from './config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkMenuColumns() {
  const supabase = getSupabase();
  console.log('--- TESTING COLUMN NAMES FOR MENU ITEMS ---');

  // Try insert with supplier (lowercase) - expects fail
  console.log('1. Testing "supplier"...');
  const { error: e1 } = await supabase.from('menuitems').insert({
      name: `MenuTest ${Date.now()}`,
      category: 'Food',
      price: 10,
      supplier: 'Test'
  });

  if (e1) {
      console.log('❌ supplier failed:', e1.message);
  } else {
      console.log('✅ supplier SUCCESS!');
      process.exit(0);
  }

  // Try insert with Supplier (PascalCase)
  console.log('2. Testing "Supplier"...');
  const { error: e2 } = await supabase.from('menuitems').insert({
      name: `MenuTest ${Date.now()}`,
      category: 'Food',
      price: 10,
      Supplier: 'Test'
  });

  if (e2) {
      console.log('❌ Supplier failed:', e2.message);
  } else {
      console.log('✅ Supplier SUCCESS!');
      process.exit(0);
  }
  
 // Try insert with supplierName (camelCase)
  console.log('3. Testing "supplierName"...');
  const { error: e3 } = await supabase.from('menuitems').insert({
      name: `MenuTest ${Date.now()}`,
      category: 'Food',
      price: 10,
      supplierName: 'Test'
  });

  if (e3) {
      console.log('❌ supplierName failed:', e3.message);
  } else {
      console.log('✅ supplierName SUCCESS!');
      process.exit(0);
  }

  // Try insert WITHOUT supplier
    console.log('4. Testing "NO supplier"...');
  const { error: e4 } = await supabase.from('menuitems').insert({
      name: `MenuTest ${Date.now()}`,
      category: 'Food',
      price: 10,
  });

  if (e4) {
      console.log('❌ NO supplier failed:', e4.message);
  } else {
      console.log('✅ NO supplier SUCCESS! (Column might be optional or missing)');
      process.exit(0);
  }

  process.exit(0);
}

checkMenuColumns();
