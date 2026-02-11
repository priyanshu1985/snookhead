import express from "express";
import { MenuItem } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

// --------------------------------------------------
// GET ALL MENU ITEMS + Filters + Search + Pagination
// --------------------------------------------------
router.get("/", auth, stationContext, async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 50,
      includeUnavailable, // New param to include unavailable items (for setup menu)
    } = req.query;

    console.log("GET /menu query:", req.query);

    if (req.needsStationSetup) {
      return res.json({
        success: true,
        total: 0,
        currentPage: 1,
        data: [],
      });
    }

    let where = {};

    // Only filter by availability if not explicitly requesting all items
    if (includeUnavailable !== "true") {
      where.is_available = true; // Only show available items
    }

    // Apply station filter for multi-tenancy
    where = addStationFilter(where, req.stationId, 'stationid');

    // Fetch all matching items for this station
    const allItems = await MenuItem.findAll({ where });

    // In-memory filtering for search and price (since findAll only supports exact equality)
    let filteredItems = allItems;

    if (category) {
        filteredItems = filteredItems.filter(item => item.category === category);
    }

    if (minPrice) {
        filteredItems = filteredItems.filter(item => Number(item.price) >= Number(minPrice));
    }
    if (maxPrice) {
        filteredItems = filteredItems.filter(item => Number(item.price) <= Number(maxPrice));
    }

    if (search) {
        const searchLower = search.toLowerCase();
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(searchLower) || 
            (item.description && item.description.toLowerCase().includes(searchLower))
        );
    }

    // Sort: Category then Name
    filteredItems.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
    });

    const total = filteredItems.length;
    const limitNum = parseInt(limit);
    const start = (parseInt(page) - 1) * limitNum;
    const items = filteredItems.slice(start, start + limitNum);

    // For mobile app, return simple array format
    if (
      req.headers["user-agent"] &&
      req.headers["user-agent"].includes("okhttp")
    ) {
      return res.json(items);
    }

    // For web/admin, return detailed format
    res.json({
      success: true,
      total: total,
      currentPage: parseInt(page),
      data: items,
    });
  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// GET MENU ITEM BY ID
// --------------------------------------------------
router.get("/:id", auth, stationContext, async (req, res) => {
  try {
    // Find item with station filter to ensure owner can only see their items
    const where = addStationFilter({ id: req.params.id }, req.stationId, 'stationid');
    const item = await MenuItem.findOne({ where });
    if (!item) return res.status(404).json({ error: "Menu item not found" });

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// ADD MENU ITEM
// --------------------------------------------------
router.post("/", auth, stationContext, requireStation, async (req, res) => {
  try {
    const { name, category, price } = req.body;

    if (!name || !category || !price) {
      return res
        .status(400)
        .json({ error: "name, category, and price are required" });
    }

    // Removed hardcoded category validation to allow custom categories


    // Add station_id for multi-tenancy
    const itemData = addStationToData(
      {
        name,
        category,
        item_type: req.body.item_type || "prepared",
        description: req.body.description,
        price,
        purchasePrice: req.body.purchasePrice || 0,
        stock: req.body.stock || 0,
        threshold: req.body.threshold || 5,
        supplierPhone: req.body.supplierPhone, // Map correctly if present
        imageUrl: req.body.image_url || req.body.imageUrl, // imageUrl -> imageUrl
        is_available:
          req.body.is_available !== undefined ? req.body.is_available : true,
      },
      req.stationId,
      'stationid'
    );

    const item = await MenuItem.create(itemData);

    res.status(201).json({
      message: "Menu item created successfully",
      item,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// UPDATE MENU ITEM
// --------------------------------------------------
router.put(
  "/:id",
  auth,
  stationContext,
  authorize("staff", "admin", "owner", "manager"),
  async (req, res) => {
    try {
      // Find item with station filter to ensure owner can only update their items
      const where = addStationFilter({ id: req.params.id }, req.stationId, 'stationid');
      const item = await MenuItem.findOne({ where });

      if (!item) return res.status(404).json({ error: "Menu item not found" });

      console.log(`PUT /menu/${req.params.id} body:`, req.body);

      // Explicitly construct update payload to avoid missing fields or security issues
      const updateData = {
        name: req.body.name,
        category: req.body.category,
        item_type: req.body.item_type,
        price: req.body.price,
        purchasePrice: req.body.purchasePrice,
        description: req.body.description,
        imageUrl: req.body.image_url || req.body.imageUrl,
        stock: req.body.stock,
        threshold: req.body.threshold,
        supplierPhone: req.body.supplierPhone,
      };

      // Only update fields that are present in the request
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      // Explicitly handle is_available boolean
      if (req.body.is_available !== undefined) {
        updateData.is_available = req.body.is_available;
      }

      console.log("Updating menu item with:", updateData);

      await MenuItem.update(updateData, { where: { id: req.params.id } });
      const updatedItem = await MenuItem.findByPk(req.params.id);

      res.json({
        message: "Menu item updated successfully",
        item: updatedItem,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// --------------------------------------------------
// DELETE MENU ITEM
// --------------------------------------------------
router.delete(
  "/:id",
  auth,
  stationContext,
  authorize("admin", "owner"),
  async (req, res) => {
    try {
      // Find item with station filter to ensure owner can only delete their items
      const where = addStationFilter({ id: req.params.id }, req.stationId, 'stationid');
      const item = await MenuItem.findOne({ where });

      if (!item) return res.status(404).json({ error: "Menu item not found" });

      await MenuItem.destroy({ where: { id: req.params.id } });

      res.json({ message: "Menu item deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// --------------------------------------------------
// UPDATE STOCK (increase / decrease)
// --------------------------------------------------
router.patch(
  "/:id/stock",
  auth,
  stationContext,
  authorize("staff", "admin", "owner", "manager"),
  async (req, res) => {
    try {
      const { quantity } = req.body;

      if (quantity == null) {
        return res.status(400).json({ error: "Quantity is required" });
      }

      // Find item with station filter
      const where = addStationFilter({ id: req.params.id }, req.stationId, 'stationid');
      const item = await MenuItem.findOne({ where });

      if (!item) return res.status(404).json({ error: "Menu item not found" });

      // Update stock
      const newStock = item.stock + Number(quantity);
      const finalStock = newStock < 0 ? 0 : newStock;

      await MenuItem.update({ stock: finalStock }, { where: { id: req.params.id } });

      res.json({
        message: "Stock updated",
        stock: item.stock,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// --------------------------------------------------
// GET LOW STOCK ITEMS
// --------------------------------------------------
router.get(
  "/alerts/low-stock",
  auth,
  stationContext,
  authorize("staff", "admin", "owner", "manager"),
  async (req, res) => {
    try {
      // Build where clause with station filter
      // Build where clause with station filter
      const where = addStationFilter({}, req.stationId, 'stationid');

      // Fetch all items
      const allItems = await MenuItem.findAll({ where });

      // Filter in memory for logic: stock < threshold
      const items = allItems.filter(item => {
          const stock = Number(item.stock || 0);
          const threshold = Number(item.threshold || 5);
          // Only return if stock is being tracked (threshold > 0 or explicit logic?)
          // Assuming all items with stock tracking have a threshold.
          return stock < threshold;
      });

      res.json({
        success: true,
        total: items.length,
        lowStockItems: items,
      });
    } catch (err) {
      console.error("Low stock fetch error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
