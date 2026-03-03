import dotenv from 'dotenv';
dotenv.config();
import db from './models/index.js';

async function alter() {
    const sequelize = db.ActiveTable.sequelize;
    try {
        await sequelize.query('ALTER TABLE active_tables ADD COLUMN pause_start_time DATETIME NULL;');
        console.log('Added pause_start_time');
    } catch (e) { console.log(e.message); }
    try {
        await sequelize.query('ALTER TABLE active_tables ADD COLUMN accumulated_pause_seconds INTEGER DEFAULT 0;');
        console.log('Added accumulated_pause_seconds');
    } catch (e) { console.log(e.message); }
    process.exit(0);
}
alter();
