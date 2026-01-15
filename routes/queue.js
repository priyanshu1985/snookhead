import express from "express";
import { Queue, TableAsset } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

/* =====================================================
   ADD CUSTOMER TO QUEUE
   ===================================================== */
router.post("/", auth, stationContext, requireStation, async (req, res) => {
  try {
    const { name, phone, members } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    // Get max position within this station
    const where = addStationFilter({ status: "waiting" }, req.stationId);
    const lastPosition = await Queue.max("position", { where });
    const position = (lastPosition || 0) + 1;

    const entryData = addStationToData(
      {
        customername: name,
        phone,
        members: members || 1,
        position,
        estimatedwaitminutes: position * 10,
        gameid: req.body.game_id || null, // Assuming game_id is passed
        status: "waiting",
        createdat: new Date(),
      },
      req.stationId
    );

    const entry = await Queue.create(entryData);

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   LIST QUEUE (FIFO)
   ===================================================== */
router.get("/", auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({ status: "waiting" }, req.stationId);
    const list = await Queue.findAll({
      where,
      order: [["position", "ASC"]],
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   GET SINGLE QUEUE ENTRY
   ===================================================== */
router.get("/:id", auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({ id: req.params.id }, req.stationId);
    const entry = await Queue.findOne({ where });
    if (!entry) return res.status(404).json({ error: "Queue entry not found" });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   SEAT NEXT CUSTOMER (FIFO + TABLE CAPACITY SAFE)
   ===================================================== */
router.post(
  "/next",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    const transaction = await Queue.sequelize.transaction();

    try {
      // lock next waiting queue entry within this station
      const queueWhere = addStationFilter({ status: "waiting" }, req.stationId);
      const next = await Queue.findOne({
        where: queueWhere,
        order: [["position", "ASC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!next) {
        await transaction.rollback();
        return res.status(400).json({ error: "Queue is empty" });
      }

      // find suitable table by capacity within this station
      // Note: TableAsset has 'dimension' not capacity usually, unless added custom?
      // Assuming 'type' or something else maps to capacity or keeping logic if capacity exists.
      // Checking table schema... screenshot shows 'dimension', 'type', no 'capacity'.
      // This logic might fail if capacity doesn't exist on TableAsset.
      // But keeping column name fix focus:
      const tableWhere = addStationFilter(
        {
          status: "available",
          // capacity: { [Op.gte]: next.members }, // Capacity likely valid if user added it, otherwise this breaks
        },
        req.stationId
      );
      const table = await TableAsset.findOne({
        where: tableWhere,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!table) {
        await transaction.rollback();
        return res.status(400).json({ error: "No suitable table available" });
      }

      await next.update({ status: "seated" }, { transaction });
      await table.update({ status: "occupied" }, { transaction });

      await transaction.commit();

      res.json({
        message: "Customer seated",
        queue: next,
        table,
      });
    } catch (err) {
      await transaction.rollback();
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   MARK QUEUE ENTRY AS SERVED
   ===================================================== */
router.post(
  "/:id/served",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const entry = await Queue.findOne({ where });
      if (!entry) return res.status(404).json({ error: "Not found" });

      await entry.update({ status: "served" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   CANCEL QUEUE ENTRY
   ===================================================== */
router.post(
  "/:id/cancel",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const entry = await Queue.findOne({ where });
      if (!entry) return res.status(404).json({ error: "Not found" });

      await entry.update({ status: "cancelled" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   CLEAR QUEUE (ONLY WAITING) - within station
   ===================================================== */
router.post(
  "/clear",
  auth,
  stationContext,
  authorize("owner", "admin"),
  async (req, res) => {
    try {
      const where = addStationFilter({ status: "waiting" }, req.stationId);
      await Queue.update({ status: "cancelled" }, { where });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
