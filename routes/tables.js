const express = require('express');
const router = express.Router();
const { TableAsset } = require('../models');
const { auth, authorize } = require('../middleware/auth');

// -------------------------------------------------
// GET ALL TABLES + Filters + Pagination
// -------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const tables = await TableAsset.findAll({
      where,
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });

    res.json({
      total: tables.length,
      currentPage: page,
      data: tables
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------
// GET TABLE BY ID
// -------------------------------------------------
router.get('/:id', auth, async (req, res) => {
  try {
    const table = await TableAsset.findByPk(req.params.id);

    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    res.json(table);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------
// ADD TABLE
// -------------------------------------------------
router.post('/', auth, authorize('staff', 'admin'), async (req, res) => {
  try {
    const {
      name, dimension, onboardDate,
      type, pricePerMin, status, frameCharge
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Table name is required" });
    }

    const allowedStatus = ['available', 'reserved', 'maintenance'];
    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const newTable = await TableAsset.create({
      name,
      dimension,
      onboardDate,
      type,
      pricePerMin,
      status,
      frameCharge
    });

    res.status(201).json({
      message: "Table added successfully",
      table: newTable
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------
// UPDATE TABLE
// -------------------------------------------------
router.put('/:id', auth, authorize('staff', 'admin'), async (req, res) => {
  try {
    const table = await TableAsset.findByPk(req.params.id);

    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    await table.update(req.body);

    res.json({
      message: "Table updated successfully",
      table
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------
// DELETE TABLE
// -------------------------------------------------
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const table = await TableAsset.findByPk(req.params.id);

    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    await table.destroy();

    res.json({ message: "Table deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------
// UPDATE TABLE STATUS ONLY
// (Example: available → reserved)
// -------------------------------------------------
router.patch('/:id/status', auth, authorize('staff', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatus = ['available', 'reserved', 'maintenance'];

    if (!status || !allowedStatus.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const table = await TableAsset.findByPk(req.params.id);

    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    table.status = status;
    await table.save();

    res.json({
      message: "Status updated successfully",
      status: table.status
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
