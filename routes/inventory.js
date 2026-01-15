import express from "express";
import { auth } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";
import { validateRequired } from "../middleware/validation.js";

const router = express.Router();

// Get models
let models;
const getModels = async () => {
  if (!models) {
    models = await import("../models/index.js");
  }
  return models;
};

// Validation middleware for inventory items
const validateInventoryItem = (req, res, next) => {
  const { item_name, category, current_quantity, minimum_threshold, unit } =
    req.body;

  const errors = [];

  if (!item_name || item_name.trim().length === 0) {
    errors.push("Item name is required");
  }

  if (!category) {
    errors.push("Category is required");
  }

  if (
    current_quantity !== undefined &&
    (isNaN(current_quantity) || current_quantity < 0)
  ) {
    errors.push("Current quantity must be a non-negative number");
  }

  if (
    minimum_threshold !== undefined &&
    (isNaN(minimum_threshold) || minimum_threshold < 0)
  ) {
    errors.push("Minimum threshold must be a non-negative number");
  }

  if (!unit || unit.trim().length === 0) {
    errors.push("Unit is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors,
    });
  }

  next();
};

// Test endpoint to check if routes are working
router.get("/test", (req, res) => {
  res.json({
    message: "Inventory routes are working!",
    timestamp: new Date().toISOString(),
  });
});

// GET /api/inventory - List all inventory items
router.get("/", auth, stationContext, async (req, res) => {
  try {
    console.log("GET /api/inventory - Starting request...");

    const models = await getModels();
    console.log("Models loaded:", Object.keys(models));

    const { Inventory } = models;
    if (!Inventory) {
      throw new Error("Inventory model not found");
    }

    console.log("Inventory model found, executing query...");

    const {
      category,
      status,
      search,
      sort_by = "item_name",
      sort_order = "asc",
      page = 1,
      limit = 50,
      include_inactive = "false",
    } = req.query;

    // Build where clause
    let whereClause = {};

    if (include_inactive !== "true") {
      whereClause.isactive = true;
    }

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { itemname: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { supplier: { [Op.like]: `%${search}%` } },
      ];
    }

    // Apply station filter for multi-tenancy
    whereClause = addStationFilter(whereClause, req.stationId);

    // Pagination
    const offset = (page - 1) * limit;
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 items per page

    // Order clause
    const orderClause = [[sort_by, sort_order.toUpperCase()]];

    const { count, rows } = await Inventory.findAndCountAll({
      where: whereClause,
      order: orderClause,
      limit: limitNum,
      offset: offset,
    });

    // Filter by status if requested
    let filteredRows = rows;
    if (status) {
      if (status === "low_stock") {
        filteredRows = rows.filter(
          (item) => item.currentquantity <= item.minimumthreshold
        );
      } else if (status === "out_of_stock") {
        filteredRows = rows.filter((item) => item.currentquantity === 0);
      } else if (status === "in_stock") {
        filteredRows = rows.filter(
          (item) => item.currentquantity > item.minimumthreshold
        );
      }
    }

    // Calculate summary statistics
    const summary = {
      total_items: count,
      active_items: rows.filter((item) => item.isactive).length,
      low_stock_items: filteredRows.filter(
        (item) => item.currentquantity <= item.minimumthreshold
      ).length,
      out_of_stock_items: filteredRows.filter(
        (item) => item.currentquantity === 0
      ).length,
      total_value: filteredRows.reduce(
        (sum, item) => sum + (item.costperunit || 0) * item.currentquantity,
        0
      ),
      categories: await Inventory.findAll({
        attributes: [
          "category",
          [Inventory.sequelize.fn("COUNT", "*"), "count"],
        ],
        where: { isactive: true },
        group: ["category"],
        raw: true,
      }),
    };

    res.json({
      success: true,
      data: filteredRows,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: count,
        pages: Math.ceil(count / limitNum),
      },
      summary,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({
      error: "Failed to fetch inventory items",
      details: error.message,
    });
  }
});

// GET /api/inventory/:id - Get single inventory item
router.get("/:id", auth, stationContext, async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const { id } = req.params;

    // Apply station filter
    const where = addStationFilter({ id }, req.stationId);
    const item = await Inventory.findOne({ where });

    if (!item) {
      return res.status(404).json({
        error: "Inventory item not found",
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    res.status(500).json({
      error: "Failed to fetch inventory item",
      details: error.message,
    });
  }
});

// POST /api/inventory - Add new inventory item
router.post(
  "/",
  auth,
  stationContext,
  requireStation,
  validateInventoryItem,
  async (req, res) => {
    try {
      const { Inventory } = await getModels();
      const {
        item_name,
        category,
        current_quantity = 0,
        minimum_threshold = 10,
        unit,
        cost_per_unit,
        supplier,
        description,
        last_restocked,
      } = req.body;

      // Check if item already exists for this station
      const existingWhere = addStationFilter(
        { itemname: item_name.trim() },
        req.stationId
      );
      const existingItem = await Inventory.findOne({
        where: existingWhere,
      });

      if (existingItem) {
        return res.status(409).json({
          error: "Inventory item already exists",
          suggestion: "Use PUT /api/inventory/:id to update existing item",
        });
      }

      // Create new inventory item with station_id
      const itemData = addStationToData(
        {
          itemname: item_name.trim(),
          category,
          currentquantity: parseInt(current_quantity),
          minimumthreshold: parseInt(minimum_threshold),
          unit: unit.trim(),
          costperunit: cost_per_unit ? parseFloat(cost_per_unit) : null,
          supplier: supplier ? supplier.trim() : null,
          description: description ? description.trim() : null,
          lastrestocked: last_restocked ? new Date(last_restocked) : null,
          isactive: true,
        },
        req.stationId
      );

      const newItem = await Inventory.create(itemData);

      // Fetch the created item with virtual fields
      const itemWithVirtuals = await Inventory.findByPk(newItem.id);

      res.status(201).json({
        success: true,
        message: "Inventory item created successfully",
        data: itemWithVirtuals,
      });
    } catch (error) {
      console.error("Error creating inventory item:", error);

      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map((err) => err.message),
        });
      }

      res.status(500).json({
        error: "Failed to create inventory item",
        details: error.message,
      });
    }
  }
);

// PUT /api/inventory/:id - Update inventory item
router.put("/:id", auth, stationContext, async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const { id } = req.params;
    const updateData = req.body;

    // Apply station filter
    const where = addStationFilter({ id }, req.stationId);
    const item = await Inventory.findOne({ where });
    if (!item) {
      return res.status(404).json({
        error: "Inventory item not found",
      });
    }

    // Handle quantity updates
    if (updateData.current_quantity !== undefined) {
      updateData.currentquantity = parseInt(updateData.current_quantity);
      delete updateData.current_quantity; // remove old key
      if (updateData.currentquantity > item.currentquantity) {
        updateData.lastrestocked = new Date();
      }
    }
    // Handle specific fields renaming if passed in body
    if (updateData.item_name) { updateData.itemname = updateData.item_name; delete updateData.item_name; }
    if (updateData.minimum_threshold) { updateData.minimumthreshold = updateData.minimum_threshold; delete updateData.minimum_threshold; }
    if (updateData.cost_per_unit) { updateData.costperunit = updateData.cost_per_unit; delete updateData.cost_per_unit; }
    if (updateData.last_restocked) { updateData.lastrestocked = updateData.last_restocked; delete updateData.last_restocked; }
    if (updateData.is_active !== undefined) { updateData.isactive = updateData.is_active; delete updateData.is_active; }

    // Update the item
    await item.update(updateData);

    // Fetch updated item with virtual fields
    const updatedItem = await Inventory.findByPk(id);

    res.json({
      success: true,
      message: "Inventory item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Error updating inventory item:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors.map((err) => err.message),
      });
    }

    res.status(500).json({
      error: "Failed to update inventory item",
      details: error.message,
    });
  }
});

// PATCH /api/inventory/:id/quantity - Update item quantity (stock in/out)
router.patch("/:id/quantity", auth, stationContext, async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const { id } = req.params;
    const { quantity_change, operation = "add", reason } = req.body;

    if (!quantity_change || isNaN(quantity_change) || quantity_change <= 0) {
      return res.status(400).json({
        error: "Valid quantity_change is required",
      });
    }

    // Apply station filter
    const where = addStationFilter({ id }, req.stationId);
    const item = await Inventory.findOne({ where });
    if (!item) {
      return res.status(404).json({
        error: "Inventory item not found",
      });
    }

    let newQuantity;
    if (operation === "add") {
      newQuantity = item.currentquantity + parseInt(quantity_change);
    } else if (operation === "subtract") {
      newQuantity = item.currentquantity - parseInt(quantity_change);
    } else {
      return res.status(400).json({
        error: 'Operation must be "add" or "subtract"',
      });
    }

    if (newQuantity < 0) {
      return res.status(400).json({
        error: "Insufficient stock. Current quantity would become negative.",
        current_quantity: item.currentquantity,
        requested_change: quantity_change,
      });
    }

    // Update quantity and last_restocked if adding stock
    const updateData = {
      currentquantity: newQuantity,
    };

    if (operation === "add") {
      updateData.lastrestocked = new Date();
    }

    await item.update(updateData);

    // Fetch updated item
    const updatedItem = await Inventory.findByPk(id);

    res.json({
      success: true,
      message: `Stock ${operation}ed successfully`,
      data: updatedItem,
      change_summary: {
        operation,
        quantity_change: parseInt(quantity_change),
        previous_quantity: item.currentquantity,
        new_quantity: newQuantity,
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error("Error updating inventory quantity:", error);
    res.status(500).json({
      error: "Failed to update inventory quantity",
      details: error.message,
    });
  }
});

// DELETE /api/inventory/:id - Delete (deactivate) inventory item
router.delete("/:id", auth, stationContext, async (req, res) => {
  try {
    const { Inventory } = await getModels();
    const { id } = req.params;
    const { permanent = false } = req.query;

    // Apply station filter
    const where = addStationFilter({ id }, req.stationId);
    const item = await Inventory.findOne({ where });
    if (!item) {
      return res.status(404).json({
        error: "Inventory item not found",
      });
    }

    if (permanent === "true") {
      await item.destroy();
      res.json({
        success: true,
        message: "Inventory item permanently deleted",
      });
    } else {
      await item.update({ isactive: false });
      res.json({
        success: true,
        message: "Inventory item deactivated",
        data: item,
      });
    }
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    res.status(500).json({
      error: "Failed to delete inventory item",
      details: error.message,
    });
  }
});

// GET /api/inventory/low-stock - Get items running low
router.get("/alerts/low-stock", auth, stationContext, async (req, res) => {
  try {
    const { Inventory } = await getModels();

    // Build where clause with station filter
    let whereClause = {
      isactive: true,
      currentquantity: {
        [Op.lte]: Inventory.sequelize.col("minimumthreshold"),
      },
    };
    whereClause = addStationFilter(whereClause, req.stationId);

    const lowStockItems = await Inventory.findAll({
      where: whereClause,
      order: [["currentquantity", "ASC"]],
    });

    const outOfStockItems = lowStockItems.filter(
      (item) => item.currentquantity === 0
    );
    const criticallyLowItems = lowStockItems.filter(
      (item) =>
        item.currentquantity > 0 &&
        item.currentquantity <= item.minimumthreshold * 0.5
    );

    res.json({
      success: true,
      data: lowStockItems,
      alerts: {
        out_of_stock: outOfStockItems.length,
        critically_low: criticallyLowItems.length,
        total_low_stock: lowStockItems.length,
      },
      summary: {
        out_of_stock_items: outOfStockItems,
        critically_low_items: criticallyLowItems,
      },
    });
  } catch (error) {
    console.error("Error fetching low stock items:", error);
    res.status(500).json({
      error: "Failed to fetch low stock items",
      details: error.message,
    });
  }
});

export default router;
