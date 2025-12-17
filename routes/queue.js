const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Queue, TableAsset } = require("../models");
const { auth, authorize } = require("../middleware/auth");

/* =====================================================
   ADD CUSTOMER TO QUEUE
   ===================================================== */
router.post("/", auth, async (req, res) => {
  try {
    const { name, phone, members } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    const lastPosition = await Queue.max("position");
    const position = (lastPosition || 0) + 1;

    const entry = await Queue.create({
      name,
      phone,
      members: members || 1,
      position,
      tentative_wait_minutes: position * 10, // simple estimate
      status: "waiting",
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   LIST QUEUE (FIFO)
   ===================================================== */
router.get("/", auth, async (req, res) => {
  try {
    const list = await Queue.findAll({
      where: { status: "waiting" },
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
router.get("/:id", auth, async (req, res) => {
  try {
    const entry = await Queue.findByPk(req.params.id);
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
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    const transaction = await Queue.sequelize.transaction();

    try {
      // lock next waiting queue entry
      const next = await Queue.findOne({
        where: { status: "waiting" },
        order: [["position", "ASC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!next) {
        await transaction.rollback();
        return res.status(400).json({ error: "Queue is empty" });
      }

      // find suitable table by capacity
      const table = await TableAsset.findOne({
        where: {
          status: "available",
          capacity: { [Op.gte]: next.members },
        },
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
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const entry = await Queue.findByPk(req.params.id);
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
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const entry = await Queue.findByPk(req.params.id);
      if (!entry) return res.status(404).json({ error: "Not found" });

      await entry.update({ status: "cancelled" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   CLEAR QUEUE (ONLY WAITING)
   ===================================================== */
router.post("/clear", auth, authorize("admin"), async (req, res) => {
  try {
    await Queue.update(
      { status: "cancelled" },
      { where: { status: "waiting" } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
