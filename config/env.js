require('dotenv').config();

const requiredEnvVars = [
  'DB_NAME',
  'DB_USER',
  'DB_PASS',
  'DB_HOST',
  'JWT_SECRET'
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    const { logStartup } = require('../middleware/logger');
    logStartup.error(`Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
};

module.exports = { validateEnv };
