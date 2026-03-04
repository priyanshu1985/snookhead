import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Configure Cloudinary from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — no disk writes, buffer goes straight to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/webm",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and audio are allowed."), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Helper: upload a buffer to Cloudinary via stream
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "snookhead/uploads", resource_type: "auto", ...options },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

// POST /api/upload
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Check if Cloudinary is configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const result = await uploadBufferToCloudinary(req.file.buffer);

      return res.json({
        success: true,
        url: result.secure_url,       // permanent HTTPS CDN URL
        filename: result.public_id,
        mimetype: req.file.mimetype,
      });
    } else {
      // Fallback to local storage if Cloudinary is not configured
      console.log("⚠️ Cloudinary not configured, falling back to local storage");
      
      const ext = req.file.mimetype.split("/")[1]?.split("+")[0] || "jpg";
      const filename = `${uuidv4()}.${ext}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      
      // Ensure directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const uploadPath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(uploadPath, req.file.buffer);
      
      return res.json({
        success: true,
        url: `/static/uploads/${filename}`,
        filename: filename,
        mimetype: req.file.mimetype,
      });
    }
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "File upload failed" });
  }
});

export default router;
