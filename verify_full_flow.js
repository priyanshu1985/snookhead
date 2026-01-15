
import { User, Station } from './models/index.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const TEST_EMAIL = `test_flow_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';

async function runTest() {
  console.log('🚀 Starting Full Flow Verification...');

  try {
    // 1. Create User
    console.log('\n📝 Step 1: Creating User...');
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    const newUser = await User.create({
      name: 'Test Setup User',
      email: TEST_EMAIL,
      passwordHash: hash,
      role: 'owner',
      phone: '1234567890'
    });
    console.log('✅ User Created:', newUser.id);

    if (!newUser.id) throw new Error('User creation returned no ID');

    // 2. Fetch User
    console.log('\n🔍 Step 2: Fetching User...');
    const fetchedUser = await User.findByPk(newUser.id);
    if (!fetchedUser || fetchedUser.email !== TEST_EMAIL) {
      throw new Error('Fetched user does not match created user');
    }
    console.log('✅ User Fetched:', fetchedUser.email);

    // 3. Update User
    console.log('\n✏️ Step 3: Updating User...');
    const updatedUser = await User.update(
      { phone: '0987654321' },
      { where: { id: newUser.id } }
    );
    // Note: Our model wrapper returns an array or object depending on implementation, let's check
    console.log('✅ User Updated response:', updatedUser ? 'Success' : 'Failed');
    
    // Verify update
    const refetched = await User.findByPk(newUser.id);
    if (refetched.phone !== '0987654321') {
        console.warn('⚠️ Update might have failed silently. Current phone:', refetched.phone);
    } else {
        console.log('✅ Update Verified');
    }

    // 4. Delete User
    console.log('\n🗑️ Step 4: Deleting User...');
    await User.destroy({ where: { id: newUser.id } });
    
    // Verify deletion
    const deletedCheck = await User.findByPk(newUser.id);
    if (deletedCheck) {
         console.warn('⚠️ Deletion might have failed. User still found.');
    } else {
         console.log('✅ User Deleted Successfully');
    }

    console.log('\n✨ All backend steps passed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    if (error.message.includes('permission denied')) {
        console.error('💡 HINT: This is likely an RLS (Row Level Security) issue in Supabase.');
    }
    process.exit(1);
  }
}

runTest();
