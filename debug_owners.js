import "dotenv/config";
import { User } from './models/index.js';

async function checkOwners() {
  try {
    const owners = await User.findAll({ where: { role: 'owner' } });
    console.log(`Found ${owners.length} owners.`);
    console.log('Sample owner data:', JSON.stringify(owners[0], null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOwners();
