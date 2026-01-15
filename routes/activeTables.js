import express from "express";
import { ActiveTable, TableAsset, Order, Bill } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

// Get all active table sessions
router.get("/", auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({ status: "active" }, req.stationId);
    const activeSessions = await ActiveTable.findAll({
      where,
      include: [
        {
          model: TableAsset,
        },
      ],
    });

    res.json(activeSessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start a table session
// body: { table_id, game_id, user_id?, duration_minutes? }
router.post(
  "/start",
  auth,
  stationContext,
  requireStation,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { table_id, game_id, user_id, duration_minutes } = req.body;

      // verify table exists and belongs to this station
      const tableWhere = addStationFilter({ id: table_id }, req.stationId);
      const table = await TableAsset.findOne({ where: tableWhere });

      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      if (table.status !== "available") {
        return res.status(400).json({ error: "Table is not available" });
      }

      // Calculate booking_end_time if duration is provided
      const startTime = new Date();
      let bookingEndTime = null;
      if (duration_minutes && duration_minutes > 0) {
        bookingEndTime = new Date(
          startTime.getTime() + duration_minutes * 60000
        );
      }

      // create active session with station_id
      const sessionData = addStationToData(
        {
          tableid: table_id,
          gameid: game_id,
          starttime: startTime,
          bookingendtime: bookingEndTime,
          durationminutes: duration_minutes || null,
          status: "active",
        },
        req.stationId
      );
      const session = await ActiveTable.create(sessionData);

      // create order linked to this session with station_id
      const orderData = addStationToData(
        {
          userId: user_id ?? req.user.id ?? null,
          total: 0,
          status: "pending",
        },
        req.stationId
      );
      const order = await Order.create(orderData);

      await TableAsset.update({ status: "reserved" }, { where: { id: table.id } });

      res.status(201).json({
        message: "Session started",
        session,
        order,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Stop a table session and optionally generate bill
// body: { active_id, skip_bill? }
router.post(
  "/stop",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { active_id, skip_bill = false } = req.body;

      // Map active_id to activeid for database lookup
      const sessionWhere = addStationFilter({ activeid: active_id }, req.stationId);
      const session = await ActiveTable.findOne({ where: sessionWhere });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is not active" });
      }

      // close session
      const endTime = new Date();
      const startTime = new Date(session.starttime); // Use starttime from DB
      session.endtime = endTime;
      session.status = "completed";
      await ActiveTable.update({ endtime: endTime, status: "completed" }, { where: { activeid: session.activeid } });

      // get table info
      const table = await TableAsset.findByPk(session.tableid); // Use tableid from DB

      if (!table) {
        return res
          .status(500)
          .json({ error: "Linked table not found for billing" });
      }

      // free the table
      await TableAsset.update({ status: "available" }, { where: { id: table.id } });

      // If skip_bill is true, just return session info without creating a bill
      if (skip_bill) {
        return res.json({
          message: "Session stopped and table released",
          session,
        });
      }

      // compute time in minutes (rounded up)
      const diffMs = endTime - startTime;
      const minutes = Math.ceil(diffMs / 60000);

      const pricePerMin = Number(table.pricePerMin || 0);
      const frameCharge = Number(table.frameCharge || 0);
      const tableAmount = minutes * pricePerMin + frameCharge;

      const grandTotal = tableAmount;

      // create bill record with station_id
      const billData = addStationToData(
        {
          orderId: null,
          total: grandTotal,
          status: "pending",
          details: JSON.stringify({
            table_id: session.tableid,
            game_id: session.gameid,
            minutes,
            pricePerMin,
            frameCharge,
            tableAmount,
          }),
        },
        req.stationId
      );
      const bill = await Bill.create(billData);

      res.json({
        message: "Bill generated",
        session,
        bill,
        breakdown: {
          minutes,
          tableAmount,
          total: grandTotal,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Auto-release expired sessions (called by frontend or cron)
// body: { active_id, cart_items?: [{id, name, price, qty}] }
router.post(
  "/auto-release",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { active_id, cart_items = [] } = req.body;

      const sessionWhere = addStationFilter({ activeid: active_id }, req.stationId);
      const session = await ActiveTable.findOne({ where: sessionWhere });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is not active" });
      }

      // Close session
      const endTime = new Date();
      // session.endtime = endTime;
      // session.status = "completed";
      await ActiveTable.update({ endtime: endTime, status: "completed" }, { where: { activeid: session.activeid } });

      // Free the table
      const table = await TableAsset.findByPk(session.tableid);
      if (table) {
        await TableAsset.update({ status: "available" }, { where: { id: table.id } });
      }

      // Compute table charges
      // Use booked duration if available (timer mode), otherwise use elapsed time
      const startTime = new Date(session.starttime);
      const diffMs = endTime - startTime;
      const elapsedMinutes = Math.ceil(diffMs / 60000);
      const minutes = session.durationminutes || elapsedMinutes;
      const pricePerMin = Number(table?.pricePerMin || 0);
      // Don't add frame charges for timer-based sessions (only for frame-based bookings)
      const table_charges = minutes * pricePerMin;

      // Calculate menu charges from cart items
      let menu_charges = 0;
      const bill_items = [];

      if (cart_items && cart_items.length > 0) {
        for (const item of cart_items) {
          const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
          menu_charges += itemTotal;
          bill_items.push({
            menu_item_id: item.id,
            name: item.name,
            price: Number(item.price || 0),
            quantity: Number(item.qty || 1),
            total: itemTotal,
          });
        }
      }

      const total_amount = table_charges + menu_charges;

      // Generate bill number
      const bill_number = `BILL-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;

      // Create items summary
      const items_summary = [
        `Table charges (${minutes} min)`,
        ...bill_items.map((item) => `${item.name} x${item.quantity}`),
      ]
        .filter(Boolean)
        .join(", ");

      // Create bill record with proper structure and station_id
      const billData = addStationToData(
        {
          bill_number,
          orderId: null,
          customer_name: "Walk-in Customer",
          table_id: table?.id || null,
          session_id: session.active_id,
          table_charges,
          menu_charges,
          total_amount,
          status: "pending",
          bill_items: bill_items.length > 0 ? bill_items : null,
          items_summary,
          session_duration: minutes,
          details: JSON.stringify({
            table_id: session.table_id,
            game_id: session.game_id,
            minutes,
            pricePerMin,
            auto_released: true,
          }),
        },
        req.stationId
      );
      const bill = await Bill.create(billData);

      res.json({
        message: "Session auto-released",
        session,
        bill,
        breakdown: {
          minutes,
          table_charges,
          menu_charges,
          total_amount,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Get session by ID
router.get("/:id", auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({ active_id: req.params.id }, req.stationId);
    const session = await ActiveTable.findOne({
      where,
      include: [{ model: TableAsset }],
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
