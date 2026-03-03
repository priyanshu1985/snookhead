import dotenv from 'dotenv';
dotenv.config();
import db from './models/index.js';

async function alter() {
  const sequelize = db.sequelize || Object.values(db).find(m => m.sequelize)?.sequelize;
  if (!sequelize) {
    console.error("Could not find sequelize instance");
    process.exit(1);
  }

  try {
    await sequelize.query('ALTER TABLE active_tables ADD COLUMN auto_resume_at DATETIME NULL;');
    console.log('Successfully added auto_resume_at');
  } catch (e) {
    console.log('Error or already exists:', e.message);
  }
  process.exit(0);
}
alter();
