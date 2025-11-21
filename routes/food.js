const express = require('express');
const router = express.Router();
const { FoodItem } = require('../models');
const { auth, authorize } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const list = await FoodItem.findAll();
  res.json(list);
});

router.post('/', auth, authorize('owner','admin'), async (req, res) => {
  try {
    const { name, image_url, price } = req.body;
    const created = await FoodItem.create({ name, image_url, price });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, authorize('owner','admin'), async (req, res) => {
  try {
    await FoodItem.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
