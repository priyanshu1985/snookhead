const express = require('express');
const router = express.Router();
const { Game } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { stationContext, requireStation, addStationFilter, addStationToData } = require('../middleware/stationContext');

// List games (filtered by station for multi-tenancy)
router.get('/', auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({}, req.stationId);
    const list = await Game.findAll({ where });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single game
router.get('/:id', auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({ game_id: req.params.id }, req.stationId);
    const g = await Game.findOne({ where });
    if (!g) return res.status(404).json({ error: 'Game not found' });
    res.json(g);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create game (owner/admin)
router.post('/', auth, stationContext, requireStation, authorize('owner','admin'), async (req, res) => {
  try {
    const gameName = req.body.game_name?.trim();

    if (!gameName) {
      return res.status(400).json({ error: 'Game name is required' });
    }

    // Check for duplicate game name within same station
    const existingWhere = addStationFilter({ game_name: gameName }, req.stationId);
    const existing = await Game.findOne({ where: existingWhere });

    if (existing) {
      return res.status(400).json({ error: 'A game with this name already exists' });
    }

    const payload = addStationToData({
      game_name: gameName,
      image_key: req.body.image_key || null,
      game_createdon: new Date(),
      created_by: req.user.email || req.user.name || req.user.id
    }, req.stationId);

    const newG = await Game.create(payload);
    res.status(201).json(newG);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Bad request', details: err.message });
  }
});

// Update game (owner/admin)
router.put('/:id', auth, stationContext, authorize('owner','admin'), async (req, res) => {
  try {
    const where = addStationFilter({ game_id: req.params.id }, req.stationId);
    const g = await Game.findOne({ where });
    if (!g) return res.status(404).json({ error: 'Game not found' });

    const gameName = req.body.game_name?.trim() || g.game_name;

    // Check for duplicate game name within same station (exclude current game)
    if (req.body.game_name && req.body.game_name !== g.game_name) {
      const existingWhere = addStationFilter({ game_name: gameName }, req.stationId);
      const existing = await Game.findOne({ where: existingWhere });

      if (existing) {
        return res.status(400).json({ error: 'A game with this name already exists' });
      }
    }

    const updateData = {
      game_name: gameName,
      game_modify: new Date().toISOString(),
      modified_by: req.user.email || req.user.name || req.user.id
    };

    // Only update image_key if provided in request
    if (req.body.image_key !== undefined) {
      updateData.image_key = req.body.image_key;
    }

    await g.update(updateData);
    res.json(g);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Bad request', details: err.message });
  }
});

// Delete game (owner/admin)
router.delete('/:id', auth, stationContext, authorize('owner','admin'), async (req, res) => {
  try {
    const where = addStationFilter({ game_id: req.params.id }, req.stationId);
    const g = await Game.findOne({ where });
    if (!g) return res.status(404).json({ error: 'Game not found' });
    await g.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
