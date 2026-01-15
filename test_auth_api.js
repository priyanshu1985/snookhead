
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api/auth';
const TEST_EMAIL = `api_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';

async function testAuth() {
  console.log('🚀 Testing Auth API Routes...');

  // 1. Register
  console.log('\n📝 1. Testing Register...');
  try {
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'API Test User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: 'customer' // explicit role
      })
    });
    
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(regData.error || 'Registration failed');
    console.log('✅ Registration Successful:', regData.user.email);

    // 2. Login
    console.log('\n🔑 2. Testing Login...');
    const loginRes = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        })
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.error || 'Login failed');
    console.log('✅ Login Successful. Token received.');

    console.log('\n✨ API Route Verification Passed!');

  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    process.exit(1);
  }
}

testAuth();
