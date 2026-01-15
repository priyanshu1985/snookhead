
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api';
const AUTH_URL = 'http://localhost:4000/api/auth';
const TEST_EMAIL = `api_creation_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';

async function testCreationFlows() {
  console.log('🚀 Testing Creation Flows (Games, Tables, Menu)...');

  try {
    // 1. Authenticate (Register new owner)
    console.log('\n🔑 1. Authenticating as Owner...');
    const regRes = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Creation Test User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: 'owner',
        phone: '1234567890'
      })
    });
    
    // If user already exists (shouldn't happen with unique email but just in case), try login
    let token = '';
    const regData = await regRes.json();
    
    if (regRes.ok) {
        token = regData.accessToken;
        console.log('✅ Registration Successful. Token received.');
    } else {
        console.log('User exists or error, trying login...');
        const loginRes = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
            headers: { 'Content-Type': 'application/json' }
        });
        const loginData = await loginRes.json();
        if(!loginRes.ok) throw new Error(loginData.error || 'Login failed');
        token = loginData.accessToken;
        console.log('✅ Login Successful.');
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Create GAME
    console.log('\n🎮 2. Creating Game...');
    const gameRes = await fetch(`${BASE_URL}/games`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            game_name: `Snooker ${Date.now()}`
        })
    });
    const gameData = await gameRes.json();
    if (!gameRes.ok) throw new Error(`Create Game failed: ${gameRes.status} ${JSON.stringify(gameData)}`);
    console.log('✅ Game Created:', gameData);
    const gameId = gameData.gameid || gameData.game_id || gameData.id; // handle different return formats if any

    // 3. Create TABLE
    console.log('\n🎱 3. Creating Table...');
    const tableRes = await fetch(`${BASE_URL}/tables`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: `Table ${Date.now()}`,
            dimension: '12x6',
            type: 'Snooker',
            pricePerMin: 0.5,
            status: 'available',
            game_id: gameId
        })
    });
    const tableData = await tableRes.json();
    if (!tableRes.ok) throw new Error(`Create Table failed: ${tableRes.status} ${JSON.stringify(tableData)}`);
    console.log('✅ Table Created:', tableData.table?.name);

    // 4. Create MENU ITEM
    console.log('\n🍔 4. Creating Menu Item...');
    const menuRes = await fetch(`${BASE_URL}/menu`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: `Burger ${Date.now()}`,
            category: 'Food',
            price: 15.00,
            description: 'Delicious test burger'
        })
    });
    const menuData = await menuRes.json();
    if (!menuRes.ok) throw new Error(`Create Menu Item failed: ${menuRes.status} ${JSON.stringify(menuData)}`);
    console.log('✅ Menu Item Created:', menuData.item?.name);

    console.log('\n✨ All Creation Flows Passed!');

  } catch (error) {
    console.error('❌ Creation Test Failed:', error.message);
    process.exit(1);
  }
}

testCreationFlows();
