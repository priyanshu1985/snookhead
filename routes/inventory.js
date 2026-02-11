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
    if (req.needsStationSetup) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 },
        summary: { total_items: 0, active_items: 0, low_stock_items: 0, out_of_stock_items: 0, total_value: 0, categories: [] }
      });
    }

    const models = await getModels();
    const { Inventory } = models;

    const {
      category,
      status,
      search,
      sort_by = "itemname",
      sort_order = "asc",
      page = 1,
      limit = 50,
      include_inactive = "false",
    } = req.query;

    // Fetch ALL items for this station
    const where = {};
    if (req.stationId) {
        where.station_id = req.stationId;
    }
    // Note: 'isactive' filter is better done in memory if not all fields are reliable, 
    // but we can try to filter simple fields at DB level if findAll supports it.
    // The custom findAll supports simple equality.
    if (include_inactive !== "true") {
      where.isactive = true;
    }
    if (category) {
      where.category = category;
    }

    // Fetch all matching station items
    const allItems = await Inventory.findAll({ where });

    // In-memory filtering for Search (LIKE equivalent)
    let filteredRows = allItems;
    
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredRows = filteredRows.filter(item => 
          (item.itemname && item.itemname.toLowerCase().includes(lowerSearch)) ||
          (item.description && item.description.toLowerCase().includes(lowerSearch)) ||
          (item.supplier && item.supplier.toLowerCase().includes(lowerSearch))
      );
    }

    // Filter by status
    if (status) {
      if (status === "low_stock") {
        filteredRows = filteredRows.filter(
          (item) => item.currentquantity <= item.minimumthreshold
        );
      } else if (status === "out_of_stock") {
        filteredRows = filteredRows.filter((item) => item.currentquantity === 0);
      } else if (status === "in_stock") {
        filteredRows = filteredRows.filter(
          (item) => item.currentquantity > item.minimumthreshold
        );
      }
    }

    // Sorting
    filteredRows.sort((a, b) => {
        let valA = a[sort_by];
        let valB = b[sort_by];
        
        // Handle string vs number
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return sort_order === 'asc' ? -1 : 1;
        if (valA > valB) return sort_order === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination
    const totalCount = filteredRows.length;
    const offset = (page - 1) * limit;
    const limitNum = parseInt(limit);
    const paginatedRows = filteredRows.slice(offset, offset + limitNum);

    // Calculate Summary from FILTERED rows (or allRows? usually summary is for current view or all? 
    // The original code calculated summary from 'rows' which was 'findAndCountAll' result (post-DB-filter).
    // So distinct from 'filteredRows' by status? 
    // Original code: 'filteredRows' was derived from 'rows' by applying 'status' filter.
    // 'summary' used 'count' (DB result) and 'rows' (DB result) and 'filteredRows' (status filtered).
    // Let's stick to 'filteredRows' being the result of search/category/station.
    // AND 'status' is applied on top?
    // Wait, original: DB filter had Search + Category + Station. Status was applied in memory.
    // So 'rows' = search/cat/station matches.
    
    // My 'filteredRows' above has Search/Cat/Station applied. 
    // THEN I applied Status to it.
    // So 'paginatedRows' is correct for the table.
    
    // Summary needs 'all rows matching search/cat/station' (ignoring status filter? or respecting it?)
    // Original summary usage:
    // total_items: count (from DB, so search/cat/station match)
    // active_items: rows.filter(...)
    // low_stock_items: filteredRows.filter(...) -> This implies logic re-filtering?
    // In original: 'filteredRows = rows' then 'if (status) filteredRows = ...'
    // So 'rows' = search/cat/station results.
    // 'filteredRows' = search/cat/station + status results.
    
    // I need to separate the Status filter step if I want to replicate exact summary logic.
    // or just calculate summary on valid dataset.
    
    // Let's re-organized:
    // 1. Base set = All items for station
    // 2. Search/Category set = Base set filtered by Search & Category & Active
    // 3. Status set = Search/Cat set filtered by Status
    
    // Re-eval:
    // 'categories' in summary was empty array in original.
    
    // Let's implement robustly.
    
    const summaryData = {
        total_items: filteredRows.length, // Logic change: Summary reflects current filters? Or broader? 
        // Original: 'count' was DB result (Search + Cat + Station).
        // My 'filteredRows' includes Status filter if applied.
        // Let's just use filteredRows for stats to be consistent with what user sees.
        active_items: filteredRows.filter((item) => item.isactive).length,
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
        categories: []
    };

    res.json({
      success: true,
      data: paginatedRows,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum),
      },
      summary: summaryData,
    });
  } catch (error) {
    console.error("Error fetching inventory:");
    console.error(error);
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
      const existingWhere = { itemname: item_name.trim() };
      if (req.stationId) {
          existingWhere.station_id = req.stationId;
      }
      
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
      const itemData = {
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
      };
      
      if (req.stationId) {
          itemData.station_id = req.stationId;
      }

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
    
    // Normalize field names
    if (updateData.item_name !== undefined) { updateData.itemname = updateData.item_name; delete updateData.item_name; }
    if (updateData.minimum_threshold !== undefined) { updateData.minimumthreshold = parseInt(updateData.minimum_threshold); delete updateData.minimum_threshold; }
    if (updateData.cost_per_unit !== undefined) { updateData.costperunit = parseFloat(updateData.cost_per_unit); delete updateData.cost_per_unit; }
    if (updateData.last_restocked !== undefined) { updateData.lastrestocked = updateData.last_restocked; delete updateData.last_restocked; }
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

    // Fetch all active items for station
    const whereClause = { isactive: true };
    if (req.stationId) {
        whereClause.station_id = req.stationId;
    }

    const allItems = await Inventory.findAll({ where: whereClause });

    // In-memory filter for low stock
    const lowStockItems = allItems.filter(
        (item) => item.currentquantity <= item.minimumthreshold
    );

    // Sort by quantity asc
    lowStockItems.sort((a, b) => a.currentquantity - b.currentquantity);

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
