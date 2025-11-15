const express = require('express');
const router = express.Router();
const { Order, OrderItem, MenuItem } = require('../models');


router.post('/', async (req, res) => {
  try {
    const { userId, items } = req.body;
    let total = 0;
    const order = await Order.create({ userId, total: 0 });
    for (const it of items || []) {
      const menu = await MenuItem.findByPk(it.menuItemId);
      const price = menu ? parseFloat(menu.price) : 0;
      total += price * (it.qty || 1);
      await OrderItem.create({ orderId: order.id, menuItemId: it.menuItemId, qty: it.qty || 1, priceEach: price });
    }
    order.total = total.toFixed(2);
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
