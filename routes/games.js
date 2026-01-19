import express from "express";
import { Game, TableAsset, ActiveTable, Bill, Queue } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

// List games (filtered by station for multi-tenancy)
router.get("/", auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({}, req.stationId);
    const list = await Game.findAll({ where });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single game
router.get("/:id", auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({ game_id: req.params.id }, req.stationId);
    // Note: The database likely uses gameid not game_id based on patterns
    // fixing filter key for future but assuming findOne below might mismatch if model def isn't updated?
    // Actually the model wrapper passes the filter directly.
    // Let's assume the DB column is probably gamename, gameid etc.
    // game_id in URL param is just a variable name.
    
    // BUT the filter passed to findAll/findOne must match DB columns.
    // The previous code used { game_id: ... }. Supabase ignores extra filters? No.
    // If the column is gameid, we must query gameid.
    const dbFilter = {};
    if (req.params.id) dbFilter.gameid = req.params.id;
    
    const finalWhere = addStationFilter(dbFilter, req.stationId);
    const g = await Game.findOne({ where: finalWhere });
    if (!g) return res.status(404).json({ error: "Game not found" });
    res.json(g);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create game (owner/admin)
router.post(
  "/",
  auth,
  stationContext,
  requireStation,
  authorize("owner", "admin"),
  async (req, res) => {
    try {
      const gameName = req.body.game_name?.trim();

      if (!gameName) {
        return res.status(400).json({ error: "Game name is required" });
      }

      // Check for duplicate game name within same station
      const existingWhere = addStationFilter(
        { gamename: gameName },
        req.stationId
      );
      const existing = await Game.findOne({ where: existingWhere });

      if (existing) {
        return res
          .status(400)
          .json({ error: "A game with this name already exists" });
      }

      const payload = addStationToData(
        {
          gamename: gameName,
          imagekey: req.body.image_key || null,
          gamecreatedon: new Date(),
          createdby: req.user.email || req.user.name || req.user.id,
        },
        req.stationId
      );

      const newG = await Game.create(payload);
      res.status(201).json(newG);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Bad request", details: err.message });
    }
  }
);

// Update game (owner/admin)
router.put(
  "/:id",
  auth,
  stationContext,
  authorize("owner", "admin"),
  async (req, res) => {
    try {
      const dbFilter = {};
      if (req.params.id) dbFilter.gameid = req.params.id;
      const where = addStationFilter(dbFilter, req.stationId);
      const g = await Game.findOne({ where });
      if (!g) return res.status(404).json({ error: "Game not found" });

      const gameName = req.body.game_name?.trim() || g.gamename;

      // Check for duplicate game name within same station (exclude current game)
      if (req.body.game_name && req.body.game_name !== g.gamename) {
        const existingWhere = addStationFilter(
          { gamename: gameName },
          req.stationId
        );
        const existing = await Game.findOne({ where: existingWhere });

        if (existing) {
          return res
            .status(400)
            .json({ error: "A game with this name already exists" });
        }
      }

      const updateData = {
        gamename: gameName,
        gamemodify: new Date().toISOString(),
        modifiedby: req.user.email || req.user.name || req.user.id,
      };

      // Only update image_key if provided in request
      if (req.body.image_key !== undefined) {
        updateData.imagekey = req.body.image_key;
      }

      await Game.update(updateData, { where: { gameid: req.params.id } });
      const updatedGame = await Game.findByPk(req.params.id);
      res.json(g);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Bad request", details: err.message });
    }
  }
);

// Delete game (owner/admin)
router.delete(
  "/:id",
  auth,
  stationContext,
  authorize("owner", "admin"),
  async (req, res) => {
    try {
      const gameId = req.params.id;

      // Validate gameId
      if (!gameId || gameId === 'undefined' || gameId === 'null') {
        return res.status(400).json({ error: "Valid Game ID is required" });
      }

      const dbFilter = { gameid: parseInt(gameId) };
      const where = addStationFilter(dbFilter, req.stationId);

      const g = await Game.findOne({ where });
      if (!g) return res.status(404).json({ error: "Game not found" });

      // Check for tables using this game
      const tables = await TableAsset.findAll({
        where: addStationFilter({ gameid: parseInt(gameId) }, req.stationId),
      });

      // Check for active sessions using this game
      const activeSessions = await ActiveTable.findAll({
        where: addStationFilter({ gameid: parseInt(gameId), status: "active" }, req.stationId),
      });

      if (activeSessions.length > 0) {
        return res.status(400).json({
          error: "Cannot delete game with active sessions",
          message: "Please end all active sessions for this game before deleting.",
        });
      }

      // Delete all related data in correct order to avoid FK constraints

      // 1. Delete bills referencing sessions for this game
      const allSessions = await ActiveTable.findAll({
        where: addStationFilter({ gameid: parseInt(gameId) }, req.stationId),
      });

      for (const session of allSessions) {
        // Session from Supabase returns plain object with 'activeid' field
        const sessionId = session.activeid;
        if (sessionId) {
          await Bill.destroy({ where: { sessionid: sessionId } });
        }
      }

      // 2. Delete all sessions for this game
      await ActiveTable.destroy({
        where: addStationFilter({ gameid: parseInt(gameId) }, req.stationId),
      });

      // 3. Delete queue entries for this game
      await Queue.destroy({
        where: addStationFilter({ gameid: parseInt(gameId) }, req.stationId),
      });

      // 4. Delete all tables for this game
      for (const table of tables) {
        if (table.id) {
          await TableAsset.destroy({ where: { id: table.id } });
        }
      }

      // 5. Finally delete the game
      await Game.destroy({ where: { gameid: parseInt(gameId) } });

      res.json({
        success: true,
        message: `Game deleted successfully along with ${tables.length} table(s)`
      });
    } catch (err) {
      console.error("Game delete error:", err);
      res.status(500).json({ error: "Server error", details: err.message });
    }
  }
);

export default router;
