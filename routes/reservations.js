import express from "express";
import { Reservation, TableAsset, User, Game, ActiveTable } from "../models/index.js";
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

        try {
          // Fetch table info
          const tableIdRaw = reservation.tableId || reservation.tableid;
          if (tableIdRaw !== undefined && tableIdRaw !== null) {
            const tableId = parseInt(tableIdRaw, 10); // Ensure integer
            if (!isNaN(tableId)) {
              const table = await TableAsset.findByPk(tableId).catch(e => {
                  console.warn(`Failed to fetch table ${tableId} for res ${reservation.id}:`, e.message);
                  return null;
              });
              if (table) {
                result.TableAsset = table;
                // Fetch game info for the table
                if (table.gameid) {
                  const game = await Game.findByPk(table.gameid).catch(e => null);
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
            const user = await User.findByPk(userId).catch(e => {
                console.warn(`Failed to fetch user ${userId} for res ${reservation.id}:`, e.message);
                return null;
            });
            if (user) {
              result.User = { id: user.id, name: user.name };
            }
          }
        } catch (innerErr) {
             console.error(`Error enriching reservation ${reservation.id}:`, innerErr.message);
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

      booking_type,
      frame_count,
      set_time,
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



    // Check for conflicts with ACTIVE SESSIONS
    const activeSession = await ActiveTable.findOne({
        where: addStationFilter({ tableid: table_id, status: 'active' }, req.stationId)
    });

    if (activeSession) {
        // Determine end time of active session
        // Normalize fields from DB (lowercase vs snake_case)
        const activeStart = new Date(activeSession.starttime || activeSession.start_time);
        const activeDuration = activeSession.durationminutes || activeSession.duration_minutes;
        
        let activeEnd = new Date();
        
        if (activeSession.bookingendtime || activeSession.endtimer || activeSession.endtime) {
            activeEnd = new Date(activeSession.bookingendtime || activeSession.endtimer || activeSession.endtime);
        } else if ((activeSession.bookingtype || activeSession.booking_type) === 'timer' && activeDuration) {
             activeEnd = new Date(activeStart.getTime() + activeDuration * 60000);
        } else {
             // Open ended / set mode / frame mode: assume it occupies 
             // Default to a safety buffer (e.g. 2 hours from start, or 1 hour from now)
             // or simply conflict if the new reservation overlaps 'now' significantly?
             // Safest: Assume it goes on for at least 60 mins from now if undefined.
             activeEnd = new Date(Date.now() + 60 * 60000); 
        }

        // Validate dates
        if (!isNaN(activeStart.getTime()) && !isNaN(activeEnd.getTime())) {
             // Check overlap: NewStart < ActiveEnd AND NewEnd > ActiveStart
             if (fromTime < activeEnd && toTime > activeStart) {
                  return res.status(409).json({
                     error: "Conflict",
                     message: `Table is currently active with a session until ~${activeEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
                     conflictDetails: { start: activeStart, end: activeEnd }
                  });
             }
        }
    }

    // Check for conflicting reservations within same station
    // Ensure table_id is integer
    const targetTableId = parseInt(table_id);

    // Fetch all reservations for this table
    const tableReservations = await Reservation.findAll({
      where: addStationFilter({ tableId: targetTableId }, req.stationId),
    });

    // ... active session check ... (omitted from replacement chunk to keep it targeted, assuming it's above/below)
    // Actually the active session check is IN BETWEEN in the file (lines 141-173).
    // I need to be careful with replace_file_content not to overwrite my previous fix in active session check.
    // The previous fix was lines 141-173.
    // The 'tableReservations' fetch is at lines 136-139. 
    // The 'conflictingReservation' logic is at lines 176-184.
    
    // I will use multi_replace to handle the fetch (top) and the check (bottom) separately or use a large chunk?
    // Large chunk overwrites the previous fix unless I include it.
    // I will use replace_file_content on the "conflictingReservation" block primarily to change the message.
    // And I will assume 'tableReservations' fetch uses 'table_id' which comes from body. 
    // If I want to fix the lookup key, I should target lines 136-139.

    // Let's do the "conflictingReservation" block first (Lines 176-199).
    
    const conflictingReservation = tableReservations.find((r) => {
      if (r.status !== "pending" && r.status !== "active") return false;

      const existingStart = new Date(r.fromTime || r.reservationtime);
      const existingEnd = r.toTime ? new Date(r.toTime) : new Date(existingStart.getTime() + (r.durationminutes || 60) * 60000);

      // Check for time overlap
      const overlap = fromTime < existingEnd && toTime > existingStart;
      return overlap;
    });

    if (conflictingReservation) {
      const existStart = new Date(conflictingReservation.fromTime || conflictingReservation.reservationtime);
      const existEnd = conflictingReservation.toTime ? new Date(conflictingReservation.toTime) : 
                       new Date(existStart.getTime() + (conflictingReservation.durationminutes || 60) * 60000);
      
      return res.status(409).json({
        error: "Conflict",
        message: `Table is already reserved from ${existStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to ${existEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Please select another table or time.`,
        conflictDetails: {
            start: existStart,
            end: existEnd,
            suggestion: "Please select another table."
        }
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
          booking_type: booking_type || 'timer',
          frame_count,
          set_time,
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

// update reservation (general)
router.put("/:id", auth, stationContext, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    // Find reservation
    const where = addStationFilter({ id }, req.stationId);
    const r = await Reservation.findOne({ where });
    if (!r) return res.status(404).json({ error: "Reservation not found" });

    // Filter allowed updates to prevent overwriting critical fields unintentionally
    // For now, we allow status updates. Add more fields if needed.
    const allowedUpdates = {};
    if (updates.status) allowedUpdates.status = updates.status;
    if (updates.notes) allowedUpdates.notes = updates.notes;
    // Add other fields as necessary

    // Use static update method - ensure we pass where clause clearly
    // Note: Model.update returns the updated rows or count depending on implementation.
    // Our custom implementation in index.js returns returned data.
    await Reservation.update(allowedUpdates, where);
    
    // Fetch fresh copy to return
    const updatedR = await Reservation.findOne({ where });
    res.json({ success: true, reservation: updatedR });
  } catch (err) {
    console.error("Update reservation error:", err);
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
    
    await Reservation.update({ status: "cancelled" }, { where: { id: r.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
