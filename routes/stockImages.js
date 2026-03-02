import express from "express";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import fetch from "node-fetch";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper: upload a buffer to Cloudinary via stream
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "image", ...options },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

// Helper: list images from a Cloudinary folder
const listCloudinaryImages = async (folder) => {
  const result = await cloudinary.api.resources({
    type: "upload",
    prefix: folder,
    max_results: 200,
  });

  return (result.resources || []).map((r) => ({
    key: r.public_id,
    filename: r.public_id.split("/").pop(),
    url: r.secure_url,
  }));
};

/**
 * GET /api/stock-images/games
 * Lists all stock game images stored in Cloudinary
 */
router.get("/games", auth, async (req, res) => {
  try {
    const images = await listCloudinaryImages("snookhead/stock-images/games");
    res.json(images);
  } catch (err) {
    console.error("Error listing stock game images:", err);
    // Return empty array rather than crashing if folder doesn't exist yet
    res.json([]);
  }
});

/**
 * GET /api/stock-images/menu
 * Lists all stock menu images stored in Cloudinary
 */
router.get("/menu", auth, async (req, res) => {
  try {
    const images = await listCloudinaryImages("snookhead/stock-images/menu");
    res.json(images);
  } catch (err) {
    console.error("Error listing stock menu images:", err);
    res.json([]);
  }
});

/**
 * POST /api/stock-images/add
 * Downloads an external image URL and saves it to Cloudinary
 * Body: { folder: 'games' | 'menu', imageUrl: string }
 */
router.post("/add", auth, async (req, res) => {
  try {
    const { folder, imageUrl } = req.body;

    if (!folder || !["games", "menu"].includes(folder)) {
      return res.status(400).json({ error: "Invalid folder. Must be 'games' or 'menu'." });
    }
    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required." });
    }

    // Fetch the image from the external URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Build a clean filename from the URL
    const timestamp = Date.now();
    const rawName = imageUrl.split("/").pop().split("?")[0].replace(/[^a-z0-9]/gi, "_").substring(0, 20);
    const publicId = `snookhead/stock-images/${folder}/stock_${rawName}_${timestamp}`;

    const result = await uploadBufferToCloudinary(buffer, { public_id: publicId, overwrite: false });

    res.json({
      success: true,
      key: result.public_id,
      url: result.secure_url,
      filename: result.public_id.split("/").pop(),
    });
  } catch (err) {
    console.error("Error adding stock image:", err);
    res.status(500).json({ error: "Failed to add image to stock" });
  }
});

export default router;
