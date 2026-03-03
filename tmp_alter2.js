import dotenv from 'dotenv';
dotenv.config();
import db from './models/index.js';

async function alter() {
    const sequelize = db.ActiveTable.sequelize;
    try {
        await sequelize.query('ALTER TABLE active_tables ADD COLUMN auto_resume_at TIMESTAMP WITH TIME ZONE NULL;');
        console.log('Added auto_resume_at');
    } catch (e) { console.log(e.message); }
    process.exit(0);
}
alter();
