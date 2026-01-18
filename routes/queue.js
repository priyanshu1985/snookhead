import express from "express";
import { Queue, TableAsset, Game } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

/* =====================================================
   QUEUE STATUS MAPPING:
   - waiting: Player is in queue, waiting for a table
   - seated: Player is currently playing (assigned to table)
   - served: Game completed
   - cancelled: Cancelled or no-show
   ===================================================== */

/* =====================================================
   GET QUEUE LIST - Returns waiting + playing entries
   Sorted by: priority (if any), then createdat (FIFO)
   ===================================================== */
router.get("/", auth, stationContext, async (req, res) => {
  try {
    const { gameid, status } = req.query;

    // Build filter
    const where = {};
    if (req.stationId) {
      where.stationid = req.stationId;
    }

    // Filter by game if specified
    if (gameid) {
      where.gameid = parseInt(gameid);
    }

    // Fetch all queue entries, then filter by status in JS (to avoid enum issues)
    const allEntries = await Queue.findAll({
      where,
      order: [["createdat", "ASC"]],
    });

    // Filter by status - default shows waiting entries
    let filteredEntries;
    if (status === "all") {
      filteredEntries = allEntries;
    } else if (status === "playing") {
      filteredEntries = allEntries.filter((e) => e.status === "seated");
    } else if (status === "completed") {
      filteredEntries = allEntries.filter((e) => e.status === "served");
    } else {
      // Default: show waiting (queued) entries
      filteredEntries = allEntries.filter((e) => e.status === "waiting");
    }

    // Enrich with game and table info
    const enrichedList = await Promise.all(
      filteredEntries.map(async (entry, index) => {
        const result = {
          ...entry,
          position: index + 1, // Dynamic position based on FIFO order
        };

        // Fetch game info
        if (entry.gameid) {
          const game = await Game.findByPk(entry.gameid);
          if (game) {
            result.Game = game;
          }
        }

        // Fetch preferred table info
        if (entry.preferredtableid) {
          const table = await TableAsset.findByPk(entry.preferredtableid);
          if (table) {
            result.PreferredTable = table;
          }
        }

        return result;
      })
    );

    res.json(enrichedList);
  } catch (err) {
    console.error("Error fetching queue:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   GET QUEUE SUMMARY - For owner dashboard view
   Shows: current games, waiting queue, next player
   ===================================================== */
router.get("/summary", auth, stationContext, async (req, res) => {
  try {
    const where = {};
    if (req.stationId) {
      where.stationid = req.stationId;
    }

    const allEntries = await Queue.findAll({
      where,
      order: [["createdat", "ASC"]],
    });

    // Group by status
    const waiting = allEntries.filter((e) => e.status === "waiting");
    const playing = allEntries.filter((e) => e.status === "seated");

    // Group waiting by game
    const waitingByGame = {};
    for (const entry of waiting) {
      const gameId = entry.gameid || "unknown";
      if (!waitingByGame[gameId]) {
        waitingByGame[gameId] = [];
      }
      waitingByGame[gameId].push(entry);
    }

    // Get next player (first in queue)
    const nextPlayer = waiting.length > 0 ? waiting[0] : null;

    // Enrich next player with game info
    let nextPlayerEnriched = null;
    if (nextPlayer) {
      nextPlayerEnriched = { ...nextPlayer };
      if (nextPlayer.gameid) {
        const game = await Game.findByPk(nextPlayer.gameid);
        if (game) {
          nextPlayerEnriched.Game = game;
        }
      }
    }

    // Enrich playing entries with table info
    const playingEnriched = await Promise.all(
      playing.map(async (entry) => {
        const result = { ...entry };
        if (entry.preferredtableid) {
          const table = await TableAsset.findByPk(entry.preferredtableid);
          if (table) {
            result.Table = table;
          }
        }
        if (entry.gameid) {
          const game = await Game.findByPk(entry.gameid);
          if (game) {
            result.Game = game;
          }
        }
        return result;
      })
    );

    res.json({
      totalWaiting: waiting.length,
      totalPlaying: playing.length,
      waitingByGame,
      currentGames: playingEnriched,
      nextPlayer: nextPlayerEnriched,
    });
  } catch (err) {
    console.error("Error fetching queue summary:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   ADD TO QUEUE (Walk-in or scheduled)
   ===================================================== */
router.post("/", auth, stationContext, requireStation, async (req, res) => {
  try {
    const {
      customername,
      phone,
      members,
      gameid,
      preferredtableid,
    } = req.body;

    // Validation
    if (!customername || !phone) {
      return res.status(400).json({ error: "Customer name and phone are required" });
    }
    if (!gameid) {
      return res.status(400).json({ error: "Game selection is required" });
    }

    // Verify game exists
    const game = await Game.findByPk(gameid);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // Verify preferred table if specified
    if (preferredtableid) {
      const tableWhere = addStationFilter({ id: preferredtableid }, req.stationId);
      const table = await TableAsset.findOne({ where: tableWhere });
      if (!table) {
        return res.status(404).json({ error: "Preferred table not found" });
      }
      // Check if table is for the same game
      if (table.gameid !== parseInt(gameid)) {
        return res.status(400).json({ error: "Table is not for the selected game" });
      }
    }

    // Calculate estimated wait time based on queue length for this game
    const gameQueueWhere = addStationFilter({ gameid: parseInt(gameid) }, req.stationId);
    const gameQueue = await Queue.findAll({ where: gameQueueWhere });
    const waitingCount = gameQueue.filter((e) => e.status === "waiting").length;
    const estimatedWait = waitingCount * 15; // 15 mins per person average

    // Create queue entry
    const entryData = addStationToData(
      {
        customername,
        phone,
        members: members || 1,
        gameid: parseInt(gameid),
        preferredtableid: preferredtableid ? parseInt(preferredtableid) : null,
        estimatedwaitminutes: estimatedWait,
        status: "waiting",
        createdat: new Date(),
      },
      req.stationId
    );

    const entry = await Queue.create(entryData);

    // Enrich response with game info
    const response = {
      ...entry,
      Game: game,
      position: waitingCount + 1,
    };

    res.status(201).json(response);
  } catch (err) {
    console.error("Error adding to queue:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   GET SINGLE QUEUE ENTRY
   ===================================================== */
router.get("/:id", auth, stationContext, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const entry = await Queue.findByPk(id);

    if (!entry) {
      return res.status(404).json({ error: "Queue entry not found" });
    }

    // Check station access
    if (req.stationId && entry.stationid !== req.stationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Enrich with game and table info
    const result = { ...entry };
    if (entry.gameid) {
      const game = await Game.findByPk(entry.gameid);
      if (game) {
        result.Game = game;
      }
    }
    if (entry.preferredtableid) {
      const table = await TableAsset.findByPk(entry.preferredtableid);
      if (table) {
        result.PreferredTable = table;
      }
    }

    res.json(result);
  } catch (err) {
    console.error("Error fetching queue entry:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   ASSIGN TABLE TO QUEUE ENTRY (Start game)
   Transitions: waiting -> seated (playing)
   ===================================================== */
router.post(
  "/:id/assign",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { tableid } = req.body;

      if (!tableid) {
        return res.status(400).json({ error: "Table ID is required" });
      }

      // Find queue entry
      const entry = await Queue.findByPk(id);
      if (!entry) {
        return res.status(404).json({ error: "Queue entry not found" });
      }

      // Check station access
      if (req.stationId && entry.stationid !== req.stationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify entry is in waiting status
      if (entry.status !== "waiting") {
        return res.status(400).json({ error: `Cannot assign table. Current status: ${entry.status}` });
      }

      // Find table
      const tableWhere = addStationFilter({ id: parseInt(tableid) }, req.stationId);
      const table = await TableAsset.findOne({ where: tableWhere });
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      // Check table is available
      if (table.status !== "available") {
        return res.status(400).json({ error: `Table is not available. Current status: ${table.status}` });
      }

      // Check table is for the correct game
      if (table.gameid !== entry.gameid) {
        return res.status(400).json({ error: "Table is not for this game type" });
      }

      // Update queue entry - assign table and mark as seated (playing)
      await Queue.update(
        {
          preferredtableid: parseInt(tableid),
          status: "seated",
        },
        { where: { id } }
      );

      // Update table status to occupied
      await TableAsset.update({ status: "occupied" }, { where: { id: parseInt(tableid) } });

      // Fetch updated entry
      const updatedEntry = await Queue.findByPk(id);

      res.json({
        success: true,
        message: "Table assigned successfully. Game started!",
        entry: updatedEntry,
        table,
      });
    } catch (err) {
      console.error("Error assigning table:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   SEAT NEXT IN QUEUE (Auto-assign)
   Finds first waiting entry for a game and assigns available table
   ===================================================== */
router.post(
  "/next",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { gameid } = req.body;

      // Build filter for waiting entries
      const where = { status: "waiting" };
      if (req.stationId) {
        where.stationid = req.stationId;
      }
      if (gameid) {
        where.gameid = parseInt(gameid);
      }

      // Get all waiting entries, filter in JS
      const allWaiting = await Queue.findAll({
        where: req.stationId ? { stationid: req.stationId } : {},
        order: [["createdat", "ASC"]],
      });

      let waitingFiltered = allWaiting.filter((e) => e.status === "waiting");
      if (gameid) {
        waitingFiltered = waitingFiltered.filter((e) => e.gameid === parseInt(gameid));
      }

      if (waitingFiltered.length === 0) {
        return res.status(400).json({ error: "No one in queue" });
      }

      const nextEntry = waitingFiltered[0];

      // Find available table for this game
      const allTables = await TableAsset.findAll({
        where: req.stationId ? { stationid: req.stationId } : {},
      });

      const availableTable = allTables.find(
        (t) => t.status === "available" && t.gameid === nextEntry.gameid
      );

      if (!availableTable) {
        return res.status(400).json({
          error: "No available table for this game",
          nextInQueue: nextEntry,
        });
      }

      // Assign table to queue entry
      await Queue.update(
        {
          preferredtableid: availableTable.id,
          status: "seated",
        },
        { where: { id: nextEntry.id } }
      );

      // Mark table as occupied
      await TableAsset.update({ status: "occupied" }, { where: { id: availableTable.id } });

      // Fetch updated entry
      const updatedEntry = await Queue.findByPk(nextEntry.id);

      res.json({
        success: true,
        message: `${nextEntry.customername} has been seated at ${availableTable.name || `Table ${availableTable.id}`}`,
        entry: updatedEntry,
        table: availableTable,
      });
    } catch (err) {
      console.error("Error seating next in queue:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   COMPLETE GAME (End session)
   Transitions: seated -> served
   Frees up the table
   ===================================================== */
router.post(
  "/:id/complete",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Find queue entry
      const entry = await Queue.findByPk(id);
      if (!entry) {
        return res.status(404).json({ error: "Queue entry not found" });
      }

      // Check station access
      if (req.stationId && entry.stationid !== req.stationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify entry is in seated (playing) status
      if (entry.status !== "seated") {
        return res.status(400).json({ error: `Cannot complete. Current status: ${entry.status}` });
      }

      // Free up the table
      if (entry.preferredtableid) {
        await TableAsset.update({ status: "available" }, { where: { id: entry.preferredtableid } });
      }

      // Mark as served (completed)
      await Queue.update({ status: "served" }, { where: { id } });

      res.json({
        success: true,
        message: "Game completed. Table is now available.",
      });
    } catch (err) {
      console.error("Error completing game:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   MARK AS SERVED (alias for complete)
   ===================================================== */
router.post(
  "/:id/served",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    // Redirect to complete endpoint
    req.params.id = req.params.id;
    return router.handle(req, res);
  }
);

/* =====================================================
   CANCEL QUEUE ENTRY
   Can cancel waiting or seated entries
   ===================================================== */
router.post(
  "/:id/cancel",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Find queue entry
      const entry = await Queue.findByPk(id);
      if (!entry) {
        return res.status(404).json({ error: "Queue entry not found" });
      }

      // Check station access
      if (req.stationId && entry.stationid !== req.stationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // If entry was seated (playing), free up the table
      if (entry.status === "seated" && entry.preferredtableid) {
        await TableAsset.update({ status: "available" }, { where: { id: entry.preferredtableid } });
      }

      // Mark as cancelled
      await Queue.update({ status: "cancelled" }, { where: { id } });

      res.json({
        success: true,
        message: "Queue entry cancelled",
      });
    } catch (err) {
      console.error("Error cancelling queue entry:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   NO-SHOW - Mark customer as no-show
   Similar to cancel but tracks reason
   ===================================================== */
router.post(
  "/:id/noshow",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Find queue entry
      const entry = await Queue.findByPk(id);
      if (!entry) {
        return res.status(404).json({ error: "Queue entry not found" });
      }

      // Check station access
      if (req.stationId && entry.stationid !== req.stationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Mark as cancelled (no-show)
      await Queue.update({ status: "cancelled" }, { where: { id } });

      res.json({
        success: true,
        message: "Marked as no-show",
      });
    } catch (err) {
      console.error("Error marking no-show:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   CLEAR QUEUE - Cancel all waiting entries
   ===================================================== */
router.post(
  "/clear",
  auth,
  stationContext,
  authorize("owner", "admin"),
  async (req, res) => {
    try {
      // Get all waiting entries for this station
      const allEntries = await Queue.findAll({
        where: req.stationId ? { stationid: req.stationId } : {},
      });

      const waitingEntries = allEntries.filter((e) => e.status === "waiting");

      // Cancel each one
      for (const entry of waitingEntries) {
        await Queue.update({ status: "cancelled" }, { where: { id: entry.id } });
      }

      res.json({
        success: true,
        message: `Cleared ${waitingEntries.length} entries from queue`,
        count: waitingEntries.length,
      });
    } catch (err) {
      console.error("Error clearing queue:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   GET AVAILABLE TABLES FOR A GAME
   Helper endpoint for table selection
   ===================================================== */
router.get("/tables/:gameid", auth, stationContext, async (req, res) => {
  try {
    const gameid = parseInt(req.params.gameid);

    // Get all tables for this game
    const allTables = await TableAsset.findAll({
      where: req.stationId ? { stationid: req.stationId } : {},
    });

    const gameTables = allTables.filter((t) => t.gameid === gameid);
    const availableTables = gameTables.filter((t) => t.status === "available");

    res.json({
      total: gameTables.length,
      available: availableTables.length,
      tables: gameTables.map((t) => ({
        ...t,
        isAvailable: t.status === "available",
      })),
    });
  } catch (err) {
    console.error("Error fetching tables:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
