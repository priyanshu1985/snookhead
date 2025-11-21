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
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file');
    process.exit(1);
  }

  if (process.env.JWT_SECRET === 'change_this_secret') {
    console.warn('WARNING: Using default JWT secret. Change it for production!');
  }

  console.log('Environment validation passed');
};

module.exports = { validateEnv };