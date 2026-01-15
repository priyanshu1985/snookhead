import express from "express";
import { TableAsset } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

// -------------------------------------------------
// GET ALL TABLES + Filters + Pagination
// -------------------------------------------------
router.get("/", auth, stationContext, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    let where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    // Apply station filter for multi-tenancy
    where = addStationFilter(where, req.stationId);

    const tables = await TableAsset.findAll({
      where,
      offset: (page - 1) * limit,
      limit: parseInt(limit),
    });

    res.json({
      total: tables.length,
      currentPage: page,
      data: tables,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------
// GET TABLE BY ID
// -------------------------------------------------
router.get("/:id", auth, stationContext, async (req, res) => {
  try {
    // Apply station filter
    const where = addStationFilter({ id: req.params.id }, req.stationId);
    const table = await TableAsset.findOne({ where });

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
router.post(
  "/",
  auth,
  stationContext,
  requireStation,
  authorize("owner", "staff", "admin"),
  async (req, res) => {
    try {
      const {
        name,
        dimension,
        onboardDate,
        type,
        pricePerMin,
        status,
        frameCharge,
        game_id,
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Table name is required" });
      }

      if (!game_id) {
        return res.status(400).json({ error: "Game ID is required" });
      }

      const allowedStatus = ["available", "reserved", "maintenance"];
      if (status && !allowedStatus.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Add station_id for multi-tenancy
      const tableData = addStationToData(
        {
          name,
          dimension,
          onboardDate: onboardDate,
          type,
          pricePerMin: pricePerMin,
          status,
          frameCharge: frameCharge,
          gameid: game_id,
        },
        req.stationId
      );

      const newTable = await TableAsset.create(tableData);

      res.status(201).json({
        message: "Table added successfully",
        table: newTable,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// -------------------------------------------------
// UPDATE TABLE
// -------------------------------------------------
router.put(
  "/:id",
  auth,
  stationContext,
  authorize("owner", "staff", "admin"),
  async (req, res) => {
    try {
      // Apply station filter
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const table = await TableAsset.findOne({ where });

      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      await TableAsset.update(req.body, { where: { id: req.params.id } });
      // Fetch updated table
      const updatedTable = await TableAsset.findByPk(req.params.id);

      res.json({
        message: "Table updated successfully",
        table,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// -------------------------------------------------
// DELETE TABLE
// -------------------------------------------------
router.delete(
  "/:id",
  auth,
  stationContext,
  authorize("owner", "admin"),
  async (req, res) => {
    try {
      // Apply station filter
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const table = await TableAsset.findOne({ where });

      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      await TableAsset.destroy({ where: { id: req.params.id } });

      res.json({ message: "Table deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// -------------------------------------------------
// UPDATE TABLE STATUS ONLY
// (Example: available → reserved)
// -------------------------------------------------
router.patch(
  "/:id/status",
  auth,
  stationContext,
  authorize("owner", "staff", "admin"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const allowedStatus = ["available", "reserved", "maintenance"];

      if (!status || !allowedStatus.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Apply station filter
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const table = await TableAsset.findOne({ where });

      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      await TableAsset.update({ status }, { where: { id: req.params.id } });

      res.json({
        message: "Status updated successfully",
        status: table.status,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
