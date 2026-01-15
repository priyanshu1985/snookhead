
import { User, MenuItem } from './models/index.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('Testing User table access...');
  try {
    const users = await User.findAll();
    console.log('Users found:', users.length);
    if (users.length > 0) console.log('Sample user:', users[0]);
  } catch (err) {
    console.error('User table error:', err.message);
    if (err.message.includes('relation "users" does not exist')) {
        console.log('HINT: Table "users" might be missing or named differently (e.g. "Users")');
    }
  }

  console.log('Testing MenuItem table access...');
  try {
    const items = await MenuItem.findAll();
    console.log('MenuItems found:', items.length);
  } catch (err) {
    console.error('MenuItem table error:', err.message);
  }
  process.exit(0);
}

test();
