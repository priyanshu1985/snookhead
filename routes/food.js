import express from "express";
import { FoodItem } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

// Get all food items - filtered by station
router.get("/", auth, stationContext, async (req, res) => {
  try {
    if (req.needsStationSetup) {
      return res.json([]);
    }
    const where = addStationFilter({}, req.stationId);
    const list = await FoodItem.findAll({ where });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create food item - with station_id
router.post(
  "/",
  auth,
  stationContext,
  requireStation,
  authorize("owner", "admin"),
  async (req, res) => {
    try {
      const { name, image_url, price } = req.body;
      const foodData = addStationToData(
        { name, imageurl: image_url, price }, // image_url -> imageurl
        req.stationId
      );
      const created = await FoodItem.create(foodData);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Delete food item - filtered by station
router.delete(
  "/:id",
  auth,
  stationContext,
  authorize("owner", "admin"),
  async (req, res) => {
    try {
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const deleted = await FoodItem.destroy({ where });
      if (deleted === 0) {
        return res.status(404).json({ error: "Food item not found" });
      }
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
