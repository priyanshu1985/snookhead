import express from "express";
import { Order, OrderItem, MenuItem } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

// --------------------------------------------------
// CREATE NEW ORDER (with cart items from menu)
// --------------------------------------------------
router.post("/", auth, stationContext, requireStation, async (req, res) => {
  try {
    const {
      personName,
      orderTotal,
      paymentMethod,
      cashAmount,
      onlineAmount,
      cart, // [{item: {id, name, price}, qty}]
      order_source = "table_booking",
      session_id = null, // Link to active table session for consolidated billing
      table_id = null, // Link to table for reference
      queue_id = null, // Link to queue entry
    } = req.body;

    // Validate required fields
    if (!cart || cart.length === 0) {
      return res.status(400).json({
        error: "Cart items are required",
      });
    }

    if (!["offline", "online", "hybrid", "wallet"].includes(paymentMethod)) {
      return res.status(400).json({
        error: "Invalid payment method",
      });
    }

    // Create order with station_id for multi-tenancy
    const orderData = addStationToData(
      {
        userId: req.user.id, // from auth token
        personName: personName || "Walk-in Customer",
        total: Number(orderTotal) || 0,
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
        session_id: session_id ? parseInt(session_id) : null,
        table_id: table_id ? parseInt(table_id) : null,
        queue_id: queue_id ? parseInt(queue_id) : null,
        // orderDate: new Date(), // Removing as column doesn't exist. DB uses createdAt.
        created_by: req.user.id,
      },
      req.stationId,
      "stationid",
    );

    const order = await Order.create(orderData);

    // Create OrderItems for each item in cart
    let calculatedTotal = 0;

    for (const cartItem of cart) {
      const { item, qty } = cartItem;

      // Find menu item in database with station filter
      const menuWhere = addStationFilter({ id: item.id }, req.stationId);
      const menuItem = await MenuItem.findOne({ where: menuWhere });
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
      // Optional: Decrease stock if MenuItem has stock field
      // ------------------------------------------------------------------
      // INVENTORY SYNC: Deduct from actual inventory
      // ------------------------------------------------------------------
      try {
        const { Inventory } = await import("../models/index.js");
        if (Inventory) {
          const menuName = menuItem.name.trim();
          const inventoryWhere = {
            itemname: menuName,
            isactive: true
          };
          if (req.stationId) inventoryWhere.station_id = req.stationId;

          const inventoryItem = await Inventory.findOne({ where: inventoryWhere });

          if (inventoryItem) {
            // Strict check? We already checked menu item (which should be synced).
            // But let's double check here to be safe against race conditions.
            if (inventoryItem.currentquantity < qty) {
              throw new Error(`Insufficient inventory for ${menuName}. Available: ${inventoryItem.currentquantity}`);
            }

            // Deduct stock
            await inventoryItem.decrement('currentquantity', { by: qty });
            console.log(`Deducted ${qty} from inventory for ${menuName}`);
          } else {
            console.warn(`No inventory item found for ${menuName}, skipping inventory deduction.`);
          }
        }
      } catch (invErr) {
        console.error("Inventory deduction failed:", invErr);
        // If strict mode, we should fail the order?
        // For now, let's return error if it's "Insufficient inventory"
        if (invErr.message.includes("Insufficient inventory")) {
          return res.status(400).json({ error: invErr.message });
        }
      }

      if (menuItem.stock !== undefined) {
        const newStock = Math.max(0, menuItem.stock - qty);
        await MenuItem.update(
          { stock: newStock },
          { where: { id: menuItem.id } },
        );
      }
    }

    // Update order total with calculated amount
    // order is a plain object, so no .save() method
    await Order.update({ total: calculatedTotal }, { where: { id: order.id } });
    order.total = calculatedTotal; // update local object for response

    res.status(201).json({
      message: "Order created successfully",
      order: {
        id: order.id,
        personName: order.personName,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        order_source: order.order_source,
        orderDate: order.createdAt, // key mapped to createdAt
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
router.get("/", auth, stationContext, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      source,
      session_id,
      table_id,
    } = req.query;

    if (req.needsStationSetup) {
      return res.json({
        total: 0,
        currentPage: page,
        data: [],
      });
    }

    let where = {};
    if (status) where.status = status;
    if (source && source !== "all") where.order_source = source;
    if (session_id) where.session_id = parseInt(session_id);
    if (table_id) where.table_id = parseInt(table_id);

    // Apply station filter for multi-tenancy
    where = addStationFilter(where, req.stationId, "stationid");

    const orders = await Order.findAll({
      where,
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      select: "*, OrderItems:orderitem(*, MenuItem:menuitems(*))",
      order: [["createdAt", "DESC"]], // Ensure ordering works with new select
    });

    res.json({
      total: orders.length,
      currentPage: page,
      data: orders,
      debug: {
        station_id: req.stationId,
        where_filter: where,
        raw_orders_count: orders.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// GET ORDERS BY SESSION ID (for billing consolidation)
// --------------------------------------------------
router.get("/by-session/:sessionId", auth, stationContext, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Apply station filter
    const where = addStationFilter(
      { session_id: parseInt(sessionId) },
      { session_id: parseInt(sessionId) },
      req.stationId,
      "stationid",
    );

    const orders = await Order.findAll({
      where,
      select: "*, OrderItems:orderitems(*, MenuItem:menuitems(*))",
      order: [["createdAt", "ASC"]],
    });

    // Transform orders to include item details for easy billing
    const transformedOrders = orders.map((order) => {
      const orderItems = order.OrderItems || [];
      const items = orderItems.map((item) => ({
        id: item.menuItemId,
        name: item.MenuItem?.name || "Unknown Item",
        price: parseFloat(item.priceEach) || 0,
        quantity: item.qty || 1,
        total: (parseFloat(item.priceEach) || 0) * (item.qty || 1),
        category: item.MenuItem?.category || "Food",
      }));

      return {
        id: order.id,
        personName: order.personName,
        total: parseFloat(order.total) || 0,
        status: order.status,
        order_source: order.order_source,
        items,
        createdAt: order.createdAt,
      };
    });

    // Calculate total of all orders for this session
    const sessionMenuTotal = transformedOrders.reduce(
      (sum, order) => sum + order.total,
      0,
    );

    // Flatten all items from all orders for consolidated billing
    const allItems = transformedOrders.flatMap((order) => order.items);

    res.json({
      session_id: sessionId,
      orders: transformedOrders,
      total_orders: transformedOrders.length,
      session_menu_total: sessionMenuTotal,
      consolidated_items: allItems,
    });
  } catch (err) {
    console.error("Error fetching orders by session:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// GET ORDER BY ID (with items)
// --------------------------------------------------
router.get("/:id", auth, stationContext, async (req, res) => {
  try {
    // Apply station filter
    const where = addStationFilter(
      { id: req.params.id },
      req.stationId,
      "stationid",
    );

    const order = await Order.findOne({
      where,
      select: "*, OrderItems:orderitems(*, MenuItem:menuitems(*))",
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
router.post("/:orderId/items", auth, stationContext, async (req, res) => {
  try {
    const { items } = req.body; // [{id, name, price, qty}]

    // Find order with station filter
    const where = addStationFilter(
      { id: req.params.orderId },
      req.stationId,
      "stationid",
    );
    const order = await Order.findOne({ where });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    let addedTotal = 0;

    for (const cartItem of items || []) {
      // Find menu item with station filter
      const menuWhere = addStationFilter({ id: cartItem.id }, req.stationId);
      const menuItem = await MenuItem.findOne({ where: menuWhere });
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
router.patch("/:id/status", auth, stationContext, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "ready", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Find order with station filter
    const where = addStationFilter(
      { id: req.params.id },
      req.stationId,
      "stationid",
    );
    const order = await Order.findOne({ where });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    await Order.update({ status }, { where: { id: order.id } });
    order.status = status;

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
router.delete(
  "/:id",
  auth,
  stationContext,
  authorize("admin", "owner", "manager"),
  async (req, res) => {
    try {
      // Find order with station filter
      const where = addStationFilter(
        { id: req.params.id },
        req.stationId,
        "stationid",
      );
      const order = await Order.findOne({ where });
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Also delete associated OrderItems
      await OrderItem.destroy({ where: { orderId: order.id } });
      await Order.destroy({ where: { id: order.id } });

      res.json({ message: "Order deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
