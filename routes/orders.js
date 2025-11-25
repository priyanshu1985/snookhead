const express = require("express");
const router = express.Router();
const { Order, OrderItem, FoodItem } = require("../models");
const { auth, authorize } = require("../middleware/auth");

router.post("/", auth, async (req, res) => {
  try {
    const { userId, items } = req.body;
    let total = 0;
    const order = await Order.create({ userId, total: 0 });
    for (const it of items || []) {
      const food = await FoodItem.findByPk(it.foodId);
      const price = food ? parseFloat(food.price) : 0;
      total += price * (it.qty || 1);
      await OrderItem.create({
        orderId: order.id,
        menuItemId: it.foodId,
        qty: it.qty || 1,
        priceEach: price,
      });
    }
    order.total = total.toFixed(2);
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: add one or more items to an existing order (for active session)
router.post("/:orderId/items", auth, async (req, res) => {
  try {
    const { items } = req.body; // [{ foodId, qty }]
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    let addedTotal = 0;

    for (const it of items || []) {
      const food = await FoodItem.findByPk(it.foodId);
      if (!food) continue;
      const price = Number(food.price || 0);
      const qty = it.qty || 1;
      addedTotal += price * qty;

      await OrderItem.create({
        orderId: order.id,
        menuItemId: it.foodId,
        qty,
        priceEach: price,
      });
    }

    order.total = Number(order.total || 0) + addedTotal;
    await order.save();

    res.status(201).json({ order, addedTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// list orders
router.get("/", auth, authorize("staff", "admin"), async (req, res) => {
  const list = await Order.findAll();
  res.json(list);
});

module.exports = router;
