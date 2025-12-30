const express = require("express");
const router = express.Router();
const { Order, OrderItem, MenuItem } = require("../models");
const { auth, authorize } = require("../middleware/auth");

// --------------------------------------------------
// CREATE NEW ORDER (with cart items from menu)
// --------------------------------------------------
router.post("/", auth, async (req, res) => {
  try {
    const {
      personName,
      orderTotal,
      paymentMethod,
      cashAmount,
      onlineAmount,
      cart, // [{item: {id, name, price}, qty}]
      order_source = "table_booking",
    } = req.body;

    // Validate required fields
    if (!personName || !cart || cart.length === 0) {
      return res.status(400).json({
        error: "personName and cart items are required",
      });
    }

    if (!["offline", "online", "hybrid"].includes(paymentMethod)) {
      return res.status(400).json({
        error: "Invalid payment method",
      });
    }

    // Create order
    const order = await Order.create({
      userId: req.user.id, // from auth token
      personName,
      orderTotal: Number(orderTotal) || 0,
      paymentMethod,
      cashAmount:
        paymentMethod === "offline" || paymentMethod === "hybrid"
          ? Number(cashAmount)
          : 0,
      onlineAmount:
        paymentMethod === "online" || paymentMethod === "hybrid"
          ? Number(onlineAmount)
          : 0,
      status: "pending", // pending, completed, cancelled
      order_source,
      orderDate: new Date(),
    });

    // Create OrderItems for each item in cart
    let calculatedTotal = 0;

    for (const cartItem of cart) {
      const { item, qty } = cartItem;

      // Find menu item in database to verify it exists and get current price
      const menuItem = await MenuItem.findByPk(item.id);
      if (!menuItem) {
        return res.status(404).json({
          error: `Menu item ${item.name} not found`,
        });
      }

      const priceEach = Number(menuItem.price) || 0;
      const itemTotal = priceEach * qty;
      calculatedTotal += itemTotal;

      // Create OrderItem
      await OrderItem.create({
        orderId: order.id,
        menuItemId: item.id,
        qty: Number(qty) || 1,
        priceEach,
      });

      // Optional: Decrease stock if MenuItem has stock field
      if (menuItem.stock !== undefined) {
        menuItem.stock = Math.max(0, menuItem.stock - qty);
        await menuItem.save();
      }
    }

    // Update order total with calculated amount
    order.total = calculatedTotal;
    await order.save();

    res.status(201).json({
      message: "Order created successfully",
      order: {
        id: order.id,
        personName: order.personName,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        order_source: order.order_source,
        orderDate: order.orderDate,
      },
    });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// GET ALL ORDERS (for all authenticated users)
// --------------------------------------------------
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, source } = req.query;

    const where = {};
    if (status) where.status = status;
    if (source && source !== "all") where.order_source = source;

    const orders = await Order.findAll({
      where,
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      include: [
        {
          model: OrderItem,
          include: [MenuItem],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      total: orders.length,
      currentPage: page,
      data: orders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// GET ORDER BY ID (with items)
// --------------------------------------------------
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: OrderItem,
          include: [MenuItem],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// ADD ITEMS TO EXISTING ORDER
// --------------------------------------------------
router.post("/:orderId/items", auth, async (req, res) => {
  try {
    const { items } = req.body; // [{id, name, price, qty}]

    const order = await Order.findByPk(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    let addedTotal = 0;

    for (const cartItem of items || []) {
      const menuItem = await MenuItem.findByPk(cartItem.id);
      if (!menuItem) continue;

      const priceEach = Number(menuItem.price) || 0;
      const qty = Number(cartItem.qty) || 1;
      const itemTotal = priceEach * qty;
      addedTotal += itemTotal;

      await OrderItem.create({
        orderId: order.id,
        menuItemId: menuItem.id,
        qty,
        priceEach,
      });

      // Decrease stock
      if (menuItem.stock !== undefined) {
        menuItem.stock = Math.max(0, menuItem.stock - qty);
        await menuItem.save();
      }
    }

    order.total = Number(order.total) + addedTotal;
    await order.save();

    res.status(201).json({
      message: "Items added to order",
      order,
      addedTotal,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// UPDATE ORDER STATUS (for all authenticated users)
// --------------------------------------------------
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.status = status;
    await order.save();

    res.json({
      message: "Order status updated",
      order,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// DELETE ORDER
// --------------------------------------------------
router.delete("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Also delete associated OrderItems
    await OrderItem.destroy({ where: { orderId: order.id } });
    await order.destroy();

    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
