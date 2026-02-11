import express from "express";
import { Shift } from "../models/index.js";
import { auth } from "../middleware/auth.js";
import { stationContext, requireStation, addStationFilter, addStationToData } from "../middleware/stationContext.js";

const router = express.Router();

// Get active attendance (shift) for user
router.get("/active/:userId", auth, stationContext, async (req, res) => {
  try {
    if (req.needsStationSetup) return res.json(null);

    // Verify user belongs to station (via Shift record check)
    // Finding shift by user_id AND station_id
    const where = addStationFilter({ user_id: req.params.userId, status: 'active' }, req.stationId);
    
    // Check if user is trying to access data from another station?
    // Usually user context is enough.
    
    const activeSession = await Shift.findOne({ where });
    res.json(activeSession || null); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clock In
router.post("/check-in", auth, stationContext, requireStation, async (req, res) => {
  try {
    const { user_id } = req.body;
    
    // Check if already checked in AT THIS STATION
    const where = addStationFilter({ user_id, status: 'active' }, req.stationId);
    const existing = await Shift.findOne({ where });
    if (existing) {
        return res.status(400).json({ error: "User is already checked in" });
    }

    const shiftData = addStationToData({
        user_id,
        check_in_time: new Date(),
        status: 'active'
    }, req.stationId);

    const newRecord = await Shift.create(shiftData);
    
    res.json(newRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clock Out
router.post("/check-out", auth, stationContext, async (req, res) => {
  try {
    const { user_id, attendance_id } = req.body; 
    
    // Find the record restricted by Station
    let where = {};
    if (attendance_id) {
        where = addStationFilter({ id: attendance_id }, req.stationId);
    } else {
        where = addStationFilter({ user_id, status: 'active' }, req.stationId);
    }

    const record = await Shift.findOne({ where });

    if (!record) return res.status(404).json({ error: "Active shift record not found" });

    const checkOutTime = new Date();
    const checkInTime = new Date(record.check_in_time);
    
    // Calculate total hours
    const diffMs = checkOutTime - checkInTime;
    const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
    
    // Update
    // Note: custom update in model/index.js (from my memory) took (data, filter) OR (id, data)?
    // Re-reading models/index.js Shift.update:
    /*
    async update(shiftData, filter) {
       let actualData, actualFilter;
       if (typeof shiftData !== 'object' || shiftData === null) {
           // First arg is ID
           actualFilter = { where: { id: shiftData } };
           actualData = filter; 
       } else { ... }
    */
    // So update(record.id, data) works.
    
    await Shift.update(record.id, {
        check_out_time: checkOutTime,
        status: 'completed',
        total_hours: totalHours
    });
    
    // Return updated record
    const updated = await Shift.findOne({ where: { id: record.id }});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance history for a user
router.get("/user/:userId", auth, stationContext, async (req, res) => {
    try {
        if (req.needsStationSetup) return res.json([]);
        
        const where = addStationFilter({ user_id: req.params.userId }, req.stationId);
        
        const history = await Shift.findAll({
            where,
            order: [['check_in_time', 'DESC']]
        });
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
