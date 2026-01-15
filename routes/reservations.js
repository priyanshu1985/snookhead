import express from "express";
import { Reservation, TableAsset, User, Game } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

// list reservations
router.get("/", auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter(
      {
        status: ["pending", "active"],
      },
      req.stationId
    );
    const list = await Reservation.findAll({
      where,
      include: [
        {
          model: TableAsset,
          attributes: ["id", "name", "gameid", "type"], // game_id -> gameid
          include: [
            {
              model: Game,
              attributes: ["gameid", "gamename"], // game_id -> gameid, game_name -> gamename
            },
          ],
        },
        {
          model: User,
          attributes: ["id", "name"],
        },
      ],
      order: [["reservationtime", "ASC"]], // fromTime -> reservationtime
    });
    res.json(list);
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).json({ error: err.message });
  }
});

// create new reservation
router.post("/", auth, stationContext, requireStation, async (req, res) => {
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

    // Check if table exists and belongs to this station
    const tableWhere = addStationFilter({ id: table_id }, req.stationId);
    const table = await TableAsset.findOne({ where: tableWhere });
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    // Check for conflicting reservations within same station
    const conflictingReservations = await Reservation.findAll({
      where: addStationFilter(
        {
          tableId: table_id,
          status: ["pending", "active"],
        },
        req.stationId
      ),
    });

    // ... (conflict check remains same as it relies on JS Date objects)

    if (conflictingReservation) {
      return res.status(400).json({
        error: "Table is already reserved for this time slot",
      });
    }

    try {
      const reservationData = addStationToData(
        {
          userId: req.user.id,
          tableId: table_id,
          customerName: customer_name,
          customerPhone: customer_phone,
          reservationtime: fromTime, // fromTime -> reservationtime
          durationminutes: duration_minutes || 60, // toTime -> durationminutes
          status: "pending",
          notes: notes || "",
        },
        req.stationId
      );
      const reservation = await Reservation.create(reservationData);

      res.status(201).json({
        success: true,
        message: "Reservation created successfully",
        reservation,
      });
    } catch (createError) {
      // If customerName/customerPhone columns don't exist (fallback)
      if (
        createError.message.includes("column") ||
        createError.message.includes("customerName") ||
        createError.message.includes("customerPhone")
      ) {
        // ... (logging)

        const basicReservationData = addStationToData(
          {
            userId: req.user.id,
            tableId: table_id,
            reservationtime: fromTime, // fromTime -> reservationtime
            durationminutes: duration_minutes || 60, // toTime -> durationminutes
            status: "pending",
            notes: notes
              ? `${notes} | Customer: ${customer_name} | Phone: ${customer_phone}`
              : `Customer: ${customer_name} | Phone: ${customer_phone}`,
          },
          req.stationId
        );
        const basicReservation = await Reservation.create(basicReservationData);

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
router.get("/user/:id", auth, stationContext, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const where = addStationFilter({ user_id: id }, req.stationId);
    const list = await Reservation.findAll({ where });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// auto assign available table (simple first-free)
router.post("/autoassign", auth, stationContext, async (req, res) => {
  try {
    const { reservationId } = req.body;
    const rWhere = addStationFilter({ id: reservationId }, req.stationId);
    const r = await Reservation.findOne({ where: rWhere });
    if (!r) return res.status(404).json({ error: "Reservation not found" });
    // find an available table within same station
    const tableWhere = addStationFilter({ status: "available" }, req.stationId);
    const t = await TableAsset.findOne({ where: tableWhere });
    if (!t) return res.status(400).json({ error: "No available table" });
    await r.update({ tableId: t.id, status: "assigned" });
    await t.update({ status: "occupied" });
    res.json({ success: true, table: t });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// cancel reservation
router.post("/:id/cancel", auth, stationContext, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const where = addStationFilter({ id }, req.stationId);
    const r = await Reservation.findOne({ where });
    if (!r) return res.status(404).json({ error: "Not found" });
    await r.update({ status: "cancelled" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
