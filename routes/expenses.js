import express from "express";
import { Expense } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";

const router = express.Router();

// Get all expenses (Owner/Admin)
router.get("/", auth, authorize("owner", "admin"), async (req, res) => {
  try {
    const expenses = await Expense.findAll({
      order: [["date", "DESC"]],
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new expense
router.post("/", auth, authorize("owner", "admin"), async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;

    if (!title || !amount || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newExpense = await Expense.create({
      title,
      amount: parseFloat(amount),
      category: category || "Other",
      date,
      description,
      created_by: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json(newExpense);
  } catch (err) {
    console.error("Expense creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete expense
router.delete("/:id", auth, authorize("owner", "admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await Expense.destroy({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
