
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api';
const AUTH_URL = 'http://localhost:4000/api/auth';
const TEST_EMAIL = `api_data_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';

async function testDataApis() {
  console.log('🚀 Testing Data APIs...');

  try {
    // 1. Register & Login to get Token
    console.log('\n🔑 1. Authenticating...');
    const regRes = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Data Test User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: 'owner',
        phone: '9998887776'
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(`Registration failed: ${regData.error}`);
    const token = regData.accessToken;
    console.log('✅ Authenticated. Token received.');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Test GET /tables
    console.log('\n🎱 2. Testing GET /tables...');
    const tablesRes = await fetch(`${BASE_URL}/tables`, { headers });
    const tablesData = await tablesRes.json();
    if (!tablesRes.ok) throw new Error(`GET /tables failed: ${tablesRes.status} ${JSON.stringify(tablesData)}`);
    console.log(`✅ GET /tables Success. Count: ${tablesData.total || tablesData.length || 0}`);

    // 3. Test GET /games
    console.log('\n🎮 3. Testing GET /games...');
    const gamesRes = await fetch(`${BASE_URL}/games`, { headers });
    const gamesData = await gamesRes.json();
    if (!gamesRes.ok) throw new Error(`GET /games failed: ${gamesRes.status} ${JSON.stringify(gamesData)}`);
    console.log(`✅ GET /games Success. Count: ${gamesData.length || 0}`);

    // 4. Test GET /bills
    console.log('\n🧾 4. Testing GET /bills...');
    const billsRes = await fetch(`${BASE_URL}/bills`, { headers });
    const billsData = await billsRes.json();
    if (!billsRes.ok) throw new Error(`GET /bills failed: ${billsRes.status} ${JSON.stringify(billsData)}`);
    console.log(`✅ GET /bills Success. Count: ${billsData.length || 0}`);

    console.log('\n✨ All Data API tests passed!');
  } catch (error) {
    console.error('❌ Data API Test Failed:', error.message);
    process.exit(1);
  }
}

testDataApis();
