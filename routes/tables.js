const express = require('express');
const router = express.Router();
const { TableAsset } = require('../models');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const tables = await TableAsset.findAll();
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, authorize('staff','admin'), async (req, res) => {
  try {
    const t = await TableAsset.create(req.body);
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
