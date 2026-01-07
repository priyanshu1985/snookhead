const express = require("express");
const router = express.Router();
const { Reservation, TableAsset, User, Game } = require("../models");
const { auth, authorize } = require("../middleware/auth");

// list reservations
router.get("/", auth, async (req, res) => {
  try {
    const list = await Reservation.findAll({
      where: {
        status: ["pending", "active"],
      },
      include: [
        {
          model: TableAsset,
          attributes: ["id", "name", "game_id", "type"],
          include: [
            {
              model: Game,
              attributes: ["game_id", "game_name"],
            },
          ],
        },
        {
          model: User,
          attributes: ["id", "name"],
        },
      ],
      order: [["fromTime", "ASC"]],
    });
    res.json(list);
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).json({ error: err.message });
  }
});

// create new reservation
router.post("/", auth, async (req, res) => {
  try {
    const {
      table_id,
      game_id,
      customer_name,
      customer_phone,
      reservation_date,
      start_time,
      duration_minutes,
      notes,
    } = req.body;

    // Validate required fields
    if (!table_id || !reservation_date || !start_time) {
      return res.status(400).json({
        error: "Table ID, reservation date, and start time are required",
      });
    }

    // Parse date and time
    const fromTime = new Date(`${reservation_date}T${start_time}`);
    const toTime = new Date(
      fromTime.getTime() + (duration_minutes || 60) * 60000
    );

    // Check if table exists
    const table = await TableAsset.findByPk(table_id);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    // Check for conflicting reservations
    const conflictingReservation = await Reservation.findOne({
      where: {
        tableId: table_id,
        status: ["pending", "active"],
        fromTime: {
          [require("sequelize").Op.lt]: toTime,
        },
        toTime: {
          [require("sequelize").Op.gt]: fromTime,
        },
      },
    });

    if (conflictingReservation) {
      return res.status(400).json({
        error: "Table is already reserved for this time slot",
      });
    }

    // Create reservation with error handling for missing columns
    try {
      const reservation = await Reservation.create({
        userId: req.user.id,
        tableId: table_id,
        customerName: customer_name,
        customerPhone: customer_phone,
        fromTime,
        toTime,
        status: "pending",
        notes: notes || "",
      });

      res.status(201).json({
        success: true,
        message: "Reservation created successfully",
        reservation,
      });
    } catch (createError) {
      // If customerName/customerPhone columns don't exist, try without them
      if (
        createError.message.includes("column") ||
        createError.message.includes("customerName") ||
        createError.message.includes("customerPhone")
      ) {
        console.log(
          "Customer columns not found, creating reservation without customer fields..."
        );

        const basicReservation = await Reservation.create({
          userId: req.user.id,
          tableId: table_id,
          fromTime,
          toTime,
          status: "pending",
          notes: notes
            ? `${notes} | Customer: ${customer_name} | Phone: ${customer_phone}`
            : `Customer: ${customer_name} | Phone: ${customer_phone}`,
        });

        res.status(201).json({
          success: true,
          message: "Reservation created successfully (customer info in notes)",
          reservation: basicReservation,
          warning:
            "Customer fields not available in database. Please update schema.",
        });
      } else {
        throw createError; // Re-throw if it's a different error
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get reservations for a user
router.get("/user/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const list = await Reservation.findAll({ where: { user_id: id } });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// auto assign available table (simple first-free)
router.post("/autoassign", auth, async (req, res) => {
  try {
    const { reservationId } = req.body;
    const r = await Reservation.findByPk(reservationId);
    if (!r) return res.status(404).json({ error: "Reservation not found" });
    // find an available table
    const t = await TableAsset.findOne({ where: { status: "available" } });
    if (!t) return res.status(400).json({ error: "No available table" });
    await r.update({ table_id: t.table_id, status: "assigned" });
    await t.update({ status: "occupied" });
    res.json({ success: true, table: t });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// cancel reservation
router.post("/:id/cancel", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await Reservation.findByPk(id);
    if (!r) return res.status(404).json({ error: "Not found" });
    await r.update({ status: "cancelled" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
