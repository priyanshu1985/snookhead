const { sequelize, User } = require('../models');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    const email = process.env.ADMIN_EMAIL || 'admin@snookhead.com';
    const pass = process.env.ADMIN_PASS || 'admin123';
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      console.log('Admin exists:', existing.email);
      process.exit(0);
    }
    const hash = await bcrypt.hash(pass, 10);
    const u = await User.create({ name: 'Admin', email, passwordHash: hash, role: 'admin' });
    console.log('Created admin:', u.email);
    process.exit(0);
  } catch (err) {
    console.error(err); process.exit(1);
  }
}

seed();
