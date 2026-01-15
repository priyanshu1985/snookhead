import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { auth } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Directory containing stock game images
const GAME_IMAGES_DIR = path.join(__dirname, "..", "public", "game-images");

// Directory containing stock menu images
const MENU_IMAGES_DIR = path.join(__dirname, "..", "public", "menu-images");

// Allowed image extensions
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

/**
 * GET /api/stock-images/games
 * Lists all stock images available for games
 * Returns array of { key, filename, url }
 */
router.get("/games", auth, async (req, res) => {
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
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ALLOWED_EXTENSIONS.includes(ext);
      })
      .map((filename) => {
        const key = filename;
        return {
          key,
          filename,
          url: "/static/game-images/" + encodeURIComponent(filename),
        };
      })
      .sort((a, b) => a.filename.localeCompare(b.filename));

    res.json(images);
  } catch (err) {
    console.error("Error listing stock images:", err);
    res.status(500).json({ error: "Failed to list stock images" });
  }
});

/**
 * GET /api/stock-images/menu
 * Lists all stock images available for menu items
 * Returns array of { key, filename, url }
 */
router.get("/menu", auth, async (req, res) => {
  try {
    // Check if directory exists
    try {
      await fs.access(MENU_IMAGES_DIR);
    } catch {
      // Directory doesn't exist, return empty array
      return res.json([]);
    }

    // Read directory contents
    const files = await fs.readdir(MENU_IMAGES_DIR);

    // Filter for image files and map to response format
    const images = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ALLOWED_EXTENSIONS.includes(ext);
      })
      .map((filename) => {
        const key = filename;
        return {
          key,
          filename,
          url: "/static/menu-images/" + encodeURIComponent(filename),
        };
      })
      .sort((a, b) => a.filename.localeCompare(b.filename));

    res.json(images);
  } catch (err) {
    console.error("Error listing menu stock images:", err);
    res.status(500).json({ error: "Failed to list menu stock images" });
  }
});

export default router;
