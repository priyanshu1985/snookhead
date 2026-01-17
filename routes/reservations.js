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
    // Build filter - fetch pending and active reservations
    const baseFilter = {};
    if (req.stationId) {
      baseFilter.stationid = req.stationId;
    }

    // Get all reservations with pending or active status
    const allReservations = await Reservation.findAll({ where: baseFilter });

    // Filter by status in JavaScript (to avoid enum array issues with Supabase)
    const filteredList = allReservations.filter(
      (r) => r.status === "pending" || r.status === "active"
    );

    // Sort by reservation time
    filteredList.sort((a, b) => {
      // Use both new and old fields for backward compatibility/migration
      const timeA = new Date(a.fromTime || a.reservationtime);
      const timeB = new Date(b.fromTime || b.reservationtime);
      return timeA - timeB;
    });

    // Fetch related data for each reservation
    const enrichedList = await Promise.all(
      filteredList.map(async (reservation) => {
        const result = { 
          ...reservation,
          // Normalize fields for frontend consistency if needed
          reservationtime: reservation.fromTime || reservation.reservationtime,
          durationminutes: reservation.durationminutes || (reservation.toTime && reservation.fromTime ? (new Date(reservation.toTime) - new Date(reservation.fromTime)) / 60000 : 60)
        };

        // Fetch table info
        const tableIdRaw = reservation.tableId || reservation.tableid;
        if (tableIdRaw !== undefined && tableIdRaw !== null) {
          const tableId = parseInt(tableIdRaw, 10); // Ensure integer
          if (!isNaN(tableId)) {
            const table = await TableAsset.findByPk(tableId);
            if (table) {
              result.TableAsset = table;
              // Fetch game info for the table
              if (table.gameid) {
                const game = await Game.findByPk(table.gameid);
                if (game) {
                  result.TableAsset.Game = game;
                }
              }
            }
          }
        }

        // Fetch user info
        if (reservation.userId || reservation.userid) {
          const userId = reservation.userId || reservation.userid;
          const user = await User.findByPk(userId);
          if (user) {
            result.User = { id: user.id, name: user.name };
          }
        }

        return result;
      })
    );

    res.json(enrichedList);
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
    // Fetch all reservations for this table
    const tableReservations = await Reservation.findAll({
      where: addStationFilter({ tableId: table_id }, req.stationId), // Use tableId (camelCase match DB)
    });

    // Filter for pending/active status and check time conflicts
    const conflictingReservation = tableReservations.find((r) => {
      if (r.status !== "pending" && r.status !== "active") return false;

      const existingStart = new Date(r.fromTime || r.reservationtime);
      const existingEnd = r.toTime ? new Date(r.toTime) : new Date(existingStart.getTime() + (r.durationminutes || 60) * 60000);

      // Check for time overlap
      return fromTime < existingEnd && toTime > existingStart;
    });

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
          fromTime: fromTime, // Correct schema: fromTime
          toTime: toTime,     // Correct schema: toTime
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
      // In case of any schema issues that persist
      console.error("Create reservation error:", createError);
      throw createError;
    }
  } catch (err) {
    console.error("Reservation handler error:", err);
    res.status(500).json({ error: err.message });
  }
});

// get reservations for a user
router.get("/user/:id", auth, stationContext, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const where = addStationFilter({ userId: id }, req.stationId); // Check userId casing
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
