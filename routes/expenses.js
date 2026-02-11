import express from "express";
import { Expense } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

// Get all expenses (Owner/Admin)
router.get("/", auth, stationContext, authorize("owner", "admin"), async (req, res) => {
  try {
    if (req.needsStationSetup) {
      return res.json([]);
    }

    const where = addStationFilter({}, req.stationId);
    const expenses = await Expense.findAll({
      where,
      order: [["date", "DESC"]],
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new expense
router.post("/", auth, stationContext, requireStation, authorize("owner", "admin"), async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;

    if (!title || !amount || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const expenseData = addStationToData({
      title,
      amount: parseFloat(amount),
      category: category || "Other",
      date,
      description,
      created_by: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, req.stationId);

    const newExpense = await Expense.create(expenseData);

    res.status(201).json(newExpense);
  } catch (err) {
    console.error("Expense creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete expense
router.delete("/:id", auth, stationContext, authorize("owner", "admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const where = addStationFilter({ id }, req.stationId);
    
    // Check if exists first to be safe (optional with destroy where but good for 404)
    const expense = await Expense.findOne({ where });
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    await Expense.destroy({ where: { id: expense.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
