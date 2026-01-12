const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Queue, TableAsset } = require("../models");
const { auth, authorize } = require("../middleware/auth");
const { stationContext, requireStation, addStationFilter, addStationToData } = require("../middleware/stationContext");

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

    const entryData = addStationToData({
      name,
      phone,
      members: members || 1,
      position,
      tentative_wait_minutes: position * 10, // simple estimate
      status: "waiting",
    }, req.stationId);

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
      const tableWhere = addStationFilter({
        status: "available",
        capacity: { [Op.gte]: next.members },
      }, req.stationId);
      const table = await TableAsset.findOne({
        where: tableWhere,
        order: [["capacity", "ASC"]],
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
router.post("/clear", auth, stationContext, authorize("owner", "admin"), async (req, res) => {
  try {
    const where = addStationFilter({ status: "waiting" }, req.stationId);
    await Queue.update(
      { status: "cancelled" },
      { where }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
