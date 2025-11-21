const express = require('express');
const { sequelize } = require('../config/database');
const router = express.Router();
router.get('/', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'OK', database: 'Connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'Error', database: 'Disconnected', error: error.message });
  }
});
module.exports = router;
