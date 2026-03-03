
import express from "express";
import { KitchenExpense } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

// Get all kitchen expenses with optional filters
router.get("/", auth, stationContext, authorize("owner", "admin"), async (req, res) => {
  try {
    const { category, dateFrom, dateTo, search } = req.query;
    const where = addStationFilter({}, req.stationId);

    if (category && category !== "all") {
      where.category = category;
    }

    if (dateFrom || dateTo) {
      where.purchaseDate = {};
      if (dateFrom) where.purchaseDate.gte = dateFrom;
      if (dateTo) where.purchaseDate.lte = dateTo;
    }

    let expenses = await KitchenExpense.findAll({
      where,
      order: [["purchaseDate", "DESC"]],
    });

    if (search) {
      const q = search.toLowerCase();
      expenses = expenses.filter(e => 
        e.itemName?.toLowerCase().includes(q) || 
        e.supplier?.toLowerCase().includes(q) || 
        e.notes?.toLowerCase().includes(q)
      );
    }

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth, stationContext, requireStation, authorize("owner", "admin"), async (req, res) => {
  try {
    const { itemName, category, quantity, unit, cost, purchaseDate, supplier, notes, receiptUrl } = req.body;

    if (!itemName || !cost || !purchaseDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const expenseData = addStationToData({
      itemName,
      category: category || "Other",
      quantity: parseFloat(quantity) || 0,
      unit: unit || "kg",
      cost: parseFloat(cost) || 0,
      purchaseDate,
      supplier,
      notes,
      receiptUrl,
    }, req.stationId);

    const newExpense = await KitchenExpense.create(expenseData);
    res.status(201).json(newExpense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update kitchen expense
router.put("/:id", auth, stationContext, authorize("owner", "admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const where = addStationFilter({ id }, req.stationId);
    
    const existing = await KitchenExpense.findOne({ where });
    if (!existing) return res.status(404).json({ error: "Kitchen expense not found" });

    const updated = await KitchenExpense.update(req.body, { where });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete kitchen expense
router.delete("/:id", auth, stationContext, authorize("owner", "admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const where = addStationFilter({ id }, req.stationId);
    
    const existing = await KitchenExpense.findOne({ where });
    if (!existing) return res.status(404).json({ error: "Kitchen expense not found" });

    await KitchenExpense.destroy({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
