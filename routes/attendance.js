import express from "express";
import { Shift } from "../models/index.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Get active attendance (shift) for user
router.get("/active/:userId", auth, async (req, res) => {
  try {
    // Check if user has an active check-in (status = 'active')
    // We use the Shift model now which points to 'shifts' table
    const activeSession = await Shift.findOne({
      where: { user_id: req.params.userId, status: 'active' }
    });
    res.json(activeSession || null); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clock In
router.post("/check-in", auth, async (req, res) => {
  try {
    const { user_id } = req.body;
    
    // Check if already checked in
    const existing = await Shift.findOne({ where: { user_id, status: 'active' } });
    if (existing) {
        return res.status(400).json({ error: "User is already checked in" });
    }

    const newRecord = await Shift.create({
        user_id,
        check_in_time: new Date(),
        status: 'active'
    });
    
    res.json(newRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clock Out
router.post("/check-out", auth, async (req, res) => {
  try {
    const { user_id, attendance_id } = req.body; // Can accept attendance_id as the shift id
    
    // Find the record
    let record;
    if (attendance_id) {
        record = await Shift.findOne({ where: { id: attendance_id } });
    } else {
        record = await Shift.findOne({ where: { user_id, status: 'active' } });
    }

    if (!record) return res.status(404).json({ error: "Active shift record not found" });

    const checkOutTime = new Date();
    const checkInTime = new Date(record.check_in_time);
    
    // Calculate total hours
    const diffMs = checkOutTime - checkInTime;
    const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

    const updated = await Shift.update(record.id, {
        check_out_time: checkOutTime,
        status: 'completed',
        total_hours: totalHours
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance history for a user
router.get("/user/:userId", auth, async (req, res) => {
    try {
        const history = await Shift.findAll({
            where: { user_id: req.params.userId },
            order: [['check_in_time', 'DESC']]
        });
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
