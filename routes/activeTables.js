const express = require("express");
const router = express.Router();
const { ActiveTable, TableAsset, Order, Bill } = require("../models");
const { auth, authorize } = require("../middleware/auth");

// Get all active table sessions
router.get("/", auth, async (req, res) => {
  try {
    const activeSessions = await ActiveTable.findAll({
      where: { status: "active" },
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
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { table_id, game_id, user_id, duration_minutes } = req.body;

      // verify table exists
      const table = await TableAsset.findByPk(table_id);

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
        bookingEndTime = new Date(startTime.getTime() + duration_minutes * 60000);
      }

      // create active session
      const session = await ActiveTable.create({
        table_id: String(table_id), // active_tables.table_id is VARCHAR
        game_id,
        start_time: startTime,
        booking_end_time: bookingEndTime,
        duration_minutes: duration_minutes || null,
        status: "active",
      });

      // create order linked to this session
      const order = await Order.create({
        userId: user_id ?? req.user.id ?? null,
        total: 0,
        status: "pending",
      });

      await table.update({ status: "reserved" });

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
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { active_id, skip_bill = false } = req.body;

      const session = await ActiveTable.findByPk(active_id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is not active" });
      }

      // close session
      const endTime = new Date();
      const startTime = new Date(session.start_time);
      session.end_time = endTime;
      session.status = "completed";
      await session.save();

      // get table info (pricePerMin + frameCharge)
      const table = await TableAsset.findByPk(session.table_id);

      if (!table) {
        return res
          .status(500)
          .json({ error: "Linked table not found for billing" });
      }

      // free the table
      await table.update({ status: "available" });

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

      // create bill record
      const bill = await Bill.create({
        orderId: null,
        total: grandTotal,
        status: "pending",
        details: JSON.stringify({
          table_id: session.table_id,
          game_id: session.game_id,
          minutes,
          pricePerMin,
          frameCharge,
          tableAmount,
        }),
      });

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
router.post(
  "/auto-release",
  auth,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { active_id } = req.body;

      const session = await ActiveTable.findByPk(active_id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is not active" });
      }

      // Close session
      const endTime = new Date();
      session.end_time = endTime;
      session.status = "completed";
      await session.save();

      // Free the table
      const table = await TableAsset.findByPk(session.table_id);
      if (table) {
        await table.update({ status: "available" });
      }

      // Compute billing
      const startTime = new Date(session.start_time);
      const diffMs = endTime - startTime;
      const minutes = Math.ceil(diffMs / 60000);
      const pricePerMin = Number(table?.pricePerMin || 0);
      const frameCharge = Number(table?.frameCharge || 0);
      const tableAmount = minutes * pricePerMin + frameCharge;

      // Create bill record
      const bill = await Bill.create({
        orderId: null,
        total: tableAmount,
        status: "pending",
        details: JSON.stringify({
          table_id: session.table_id,
          game_id: session.game_id,
          minutes,
          pricePerMin,
          frameCharge,
          tableAmount,
          auto_released: true,
        }),
      });

      res.json({
        message: "Session auto-released",
        session,
        bill,
        breakdown: {
          minutes,
          tableAmount,
          total: tableAmount,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Get session by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const session = await ActiveTable.findByPk(req.params.id, {
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

module.exports = router;
