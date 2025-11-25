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
    const payload = {
      game_name: req.body.game_name,
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
    await g.update({
      game_name: req.body.game_name || g.game_name,
      game_modify: new Date(),
      modified_by: req.user.email || req.user.name || req.user.id
    });
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
