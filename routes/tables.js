const express = require('express');
const router = express.Router();
const { TableAsset } = require('../models');

router.get('/', async (req, res) => {
  const tables = await TableAsset.findAll();
  res.json(tables);
});

router.post('/', async (req, res) => {
  try {
    const t = await TableAsset.create(req.body);
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
