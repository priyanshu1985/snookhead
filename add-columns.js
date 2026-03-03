import { Sequelize } from 'sequelize';
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres');
async function run() {
  try {
    await sequelize.query('ALTER TABLE public.tables ADD COLUMN "pricePerHalfHour" numeric(10,2);');
    console.log("Added pricePerHalfHour column");
  } catch (e) {
    if (!e.message.includes('already exists')) {
      console.error(e);
    } else {
      console.log("Column pricePerHalfHour already exists");
    }
  }
  
  try {
    await sequelize.query('ALTER TABLE public.tables ADD COLUMN "pricePerHour" numeric(10,2);');
    console.log("Added pricePerHour column");
  } catch (e) {
    if (!e.message.includes('already exists')) {
      console.error(e);
    } else {
      console.log("Column pricePerHour already exists");
    }
  }
  process.exit(0);
}
run();
