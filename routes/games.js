const express = require('express');
const router = express.Router();
const { Game } = require('../models');
const { auth, authorize } = require('../middleware/auth');

// List games (any authenticated user)
router.get('/', auth, async (req, res) => {
  try {
    const list = await Game.findAll();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single game
router.get('/:id', auth, async (req, res) => {
  try {
    const g = await Game.findByPk(req.params.id);
    if (!g) return res.status(404).json({ error: 'Game not found' });
    res.json(g);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create game (owner/admin)
router.post('/', auth, authorize('owner','admin'), async (req, res) => {
  try {
    const gameName = req.body.game_name?.trim();

    if (!gameName) {
      return res.status(400).json({ error: 'Game name is required' });
    }

    // Check for duplicate game name (case-insensitive)
    const existing = await Game.findOne({
      where: { game_name: gameName }
    });

    if (existing) {
      return res.status(400).json({ error: 'A game with this name already exists' });
    }

    const payload = {
      game_name: gameName,
      image_key: req.body.image_key || null,
      game_createdon: new Date(),
      created_by: req.user.email || req.user.name || req.user.id
    };
    const newG = await Game.create(payload);
    res.status(201).json(newG);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Bad request', details: err.message });
  }
});

// Update game (owner/admin)
router.put('/:id', auth, authorize('owner','admin'), async (req, res) => {
  try {
    const g = await Game.findByPk(req.params.id);
    if (!g) return res.status(404).json({ error: 'Game not found' });

    const gameName = req.body.game_name?.trim() || g.game_name;

    // Check for duplicate game name (exclude current game)
    if (req.body.game_name && req.body.game_name !== g.game_name) {
      const existing = await Game.findOne({
        where: { game_name: gameName }
      });

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
router.delete('/:id', auth, authorize('owner','admin'), async (req, res) => {
  try {
    const g = await Game.findByPk(req.params.id);
    if (!g) return res.status(404).json({ error: 'Game not found' });
    await g.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
