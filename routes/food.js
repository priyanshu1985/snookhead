const express = require('express');
const router = express.Router();
const { FoodItem } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { stationContext, requireStation, addStationFilter, addStationToData } = require('../middleware/stationContext');

// Get all food items - filtered by station
router.get('/', auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({}, req.stationId);
    const list = await FoodItem.findAll({ where });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create food item - with station_id
router.post('/', auth, stationContext, requireStation, authorize('owner','admin'), async (req, res) => {
  try {
    const { name, image_url, price } = req.body;
    const foodData = addStationToData({ name, image_url, price }, req.stationId);
    const created = await FoodItem.create(foodData);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete food item - filtered by station
router.delete('/:id', auth, stationContext, authorize('owner','admin'), async (req, res) => {
  try {
    const where = addStationFilter({ id: req.params.id }, req.stationId);
    const deleted = await FoodItem.destroy({ where });
    if (deleted === 0) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
