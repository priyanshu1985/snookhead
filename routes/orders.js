const express = require('express');
const router = express.Router();
const { Order, OrderItem, FoodItem } = require('../models');
const { auth, authorize } = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { userId, items } = req.body;
    let total = 0;
    const order = await Order.create({ userId, total: 0 });
    for (const it of items || []) {
      const food = await FoodItem.findByPk(it.foodId);
      const price = food ? parseFloat(food.price) : 0;
      total += price * (it.qty || 1);
      await OrderItem.create({ orderId: order.id, menuItemId: it.foodId, qty: it.qty || 1, priceEach: price });
    }
    order.total = total.toFixed(2);
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', auth, authorize('staff','admin'), async (req, res) => {
  const list = await Order.findAll();
  res.json(list);
});

module.exports = router;
