import "dotenv/config";
import { Station } from './models/index.js';

async function checkStations() {
  try {
    const stations = await Station.findAll();
    console.log('Sample station data:', JSON.stringify(stations[0], null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkStations();
