const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

// Get database table info
router.get('/tables', async (req, res) => {
  try {
    const [results] = await sequelize.query('SHOW TABLES');
    res.json({
      database: 'snookhead',
      tableCount: results.length,
      tables: results.map(row => Object.values(row)[0])
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;