import express from "express";
import { TableAsset, Queue, ActiveTable, Bill } from "../models/index.js";
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
// Includes queue booking info and active session info
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

    // Get queue entries that are "seated" (assigned from queue, waiting to start)
    const queueEntries = await Queue.findAll({
      where: req.stationId ? { stationid: req.stationId } : {},
    });
    const seatedQueue = queueEntries.filter((q) => q.status === "seated");

    // Get active sessions
    const activeSessions = await ActiveTable.findAll({
      where: req.stationId ? { stationid: req.stationId } : {},
    });
    const activeSessionsFiltered = activeSessions.filter((s) => s.status === "active");

    // Enrich tables with booking info
    const enrichedTables = tables.map((table) => {
      const result = { ...table };

      // Check if table has an active session
      const activeSession = activeSessionsFiltered.find(
        (s) => s.tableid === table.id
      );
      if (activeSession) {
        result.activeSession = activeSession;
        result.bookedBy = activeSession.customer_name || "Customer";
        result.bookingType = "active_session";
      }

      // Check if table is assigned from queue (waiting to start session)
      const queueBooking = seatedQueue.find(
        (q) => q.preferredtableid === table.id
      );
      if (queueBooking && !activeSession) {
        result.queueBooking = queueBooking;
        result.bookedBy = queueBooking.customername;
        result.bookingType = "queue";
      }

      return result;
    });

    res.json({
      total: enrichedTables.length,
      currentPage: page,
      data: enrichedTables,
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
  authorize("owner", "staff", "admin", "manager"),
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
  authorize("owner", "staff", "admin", "manager"),
  async (req, res) => {
    try {
      // Apply station filter
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const table = await TableAsset.findOne({ where });

      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      // Map and sanitize the update data, similar to POST
      const {
        name,
        dimension,
        onboardDate,
        type,
        pricePerMin,
        status,
        frameCharge,
        game_id,
        gameid // handle both cases if sent
      } = req.body;

      // Construct update object with correct DB column names
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (dimension !== undefined) updateData.dimension = dimension;
      if (onboardDate !== undefined) updateData.onboardDate = onboardDate;
      if (type !== undefined) updateData.type = type;
      if (pricePerMin !== undefined) updateData.pricePerMin = pricePerMin;
      if (status !== undefined) updateData.status = status;
      if (frameCharge !== undefined) updateData.frameCharge = frameCharge;
      
      // Handle game_id mapping logic
      if (game_id !== undefined) updateData.gameid = game_id;
      else if (gameid !== undefined) updateData.gameid = gameid;

      await TableAsset.update(updateData, { where: { id: req.params.id } });
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
      const tableId = req.params.id;

      // Validate tableId
      if (!tableId || tableId === 'undefined' || tableId === 'null') {
        return res.status(400).json({ error: "Valid Table ID is required" });
      }

      const parsedTableId = parseInt(tableId);

      // Apply station filter
      const where = addStationFilter({ id: parsedTableId }, req.stationId);
      const table = await TableAsset.findOne({ where });

      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      // Check for active sessions on this table
      const activeSessions = await ActiveTable.findAll({
        where: addStationFilter({ tableid: parsedTableId, status: "active" }, req.stationId),
      });

      if (activeSessions.length > 0) {
        return res.status(400).json({
          error: "Cannot delete table with active sessions",
          message: "Please end all active sessions on this table before deleting.",
        });
      }

      // Delete related completed sessions first (to avoid FK constraint)
      const completedSessions = await ActiveTable.findAll({
        where: addStationFilter({ tableid: parsedTableId }, req.stationId),
      });

      // Delete bills that reference these sessions
      for (const session of completedSessions) {
        const sessionId = session.activeid;
        if (sessionId) {
          await Bill.destroy({ where: { sessionid: sessionId } });
        }
      }

      // Delete all sessions for this table
      await ActiveTable.destroy({
        where: addStationFilter({ tableid: parsedTableId }, req.stationId),
      });

      // Delete any queue entries for this table
      await Queue.destroy({
        where: addStationFilter({ preferredtableid: parsedTableId }, req.stationId),
      });

      // Now delete the table
      await TableAsset.destroy({ where: { id: parsedTableId } });

      res.json({ message: "Table deleted successfully" });
    } catch (err) {
      console.error("Table delete error:", err);
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
  authorize("owner", "staff", "admin", "manager"),
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
