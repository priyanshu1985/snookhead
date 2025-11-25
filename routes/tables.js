const express = require('express');
const router = express.Router();
const { TableAsset, Game } = require('../models');
const { auth, authorize } = require('../middleware/auth');

// List all tables (with game info)
router.get('/', auth, async (req, res) => {
  try {
    const tables = await TableAsset.findAll({
      include: [{ model: Game }]
    });
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a table (staff/admin)
router.post('/', auth, authorize('staff','admin'), async (req, res) => {
  try {
    const { name, dimension, onboardDate, type, pricePerMin, frameCharge, game_id } = req.body;

    if (!game_id) {
      return res.status(400).json({ error: 'game_id is required' });
    }

    const game = await Game.findByPk(game_id);
    if (!game) {
      return res.status(400).json({ error: 'Invalid game_id' });
    }

    const table = await TableAsset.create({
      name,
      dimension,
      onboardDate: onboardDate || new Date(),
      type,
      pricePerMin,
      status: 'available',
      frameCharge,
      game_id
    });

    res.status(201).json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
