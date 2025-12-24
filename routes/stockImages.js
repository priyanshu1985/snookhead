const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { auth } = require('../middleware/auth');

// Directory containing stock game images
const GAME_IMAGES_DIR = path.join(__dirname, '..', 'public', 'game-images');

// Allowed image extensions
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

/**
 * GET /api/stock-images/games
 * Lists all stock images available for games
 * Returns array of { key, filename, url }
 */
router.get('/games', auth, async (req, res) => {
  try {
    // Check if directory exists
    try {
      await fs.access(GAME_IMAGES_DIR);
    } catch {
      // Directory doesn't exist, return empty array
      return res.json([]);
    }

    // Read directory contents
    const files = await fs.readdir(GAME_IMAGES_DIR);

    // Filter for image files and map to response format
    const images = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ALLOWED_EXTENSIONS.includes(ext);
      })
      .map(filename => {
        // Use filename without extension as the key
        const key = filename;
        return {
          key,
          filename,
          url: `/static/game-images/${encodeURIComponent(filename)}`
        };
      })
      .sort((a, b) => a.filename.localeCompare(b.filename));

    res.json(images);
  } catch (err) {
    console.error('Error listing stock images:', err);
    res.status(500).json({ error: 'Failed to list stock images' });
  }
});

module.exports = router;
