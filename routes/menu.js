const express = require('express');
const router = express.Router();
const { MenuItem } = require('../models');

router.get('/', async (req, res) => {
  const items = await MenuItem.findAll();
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const item = await MenuItem.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/', async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
