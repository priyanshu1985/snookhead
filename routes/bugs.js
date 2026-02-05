import express from "express";
import { Bug, User } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

// Get all bugs - filtered by station
router.get("/", auth, stationContext, async (req, res) => {
  try {
    const { status, category, priority } = req.query;

    const whereClause = addStationFilter({}, req.stationId);
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;
    if (priority) whereClause.priority = priority;

    const bugs = await Bug.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "reporter",
          attributes: ["id", "name", "email"],
        },
        {
          model: User,
          as: "assignee",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(bugs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bug by ID - filtered by station
router.get("/:id", auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({ id: req.params.id }, req.stationId);
    const bug = await Bug.findOne({
      where,
      include: [
        {
          model: User,
          as: "reporter",
          attributes: ["id", "name", "email"],
        },
        {
          model: User,
          as: "assignee",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!bug) {
      return res.status(404).json({ error: "Bug not found" });
    }

    res.json(bug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new bug report - with station_id
router.post("/", auth, stationContext, requireStation, async (req, res) => {
  try {
    const {
      title,
      description,
      category = "App Issue",
      priority = "medium",
      image_url,
      audio_url,
    } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Title is required" });
    }

    const bugData = addStationToData(
      {
        title: title.trim(),
        description: description?.trim() || null,
        category,
        priority,
        imageurl: image_url,
        audiourl: audio_url,
        reportedby: req.user?.id || null,
        status: "pending",
      },
      req.stationId
    );

    const bug = await Bug.create(bugData);

    res.status(201).json({
      success: true,
      message: "Bug reported successfully",
      bug,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update bug - filtered by station
router.put(
  "/:id",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const bug = await Bug.findOne({ where });

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      const {
        title,
        description,
        category,
        status,
        priority,
        assigned_to,
        image_url,
        audio_url,
      } = req.body;

      // Update resolved_at if status changes to resolved
      // Using lowercase resolvedat to match DB column assumption
      let resolvedat = bug.resolvedat;
      if (status === "resolved" && bug.status !== "resolved") {
        resolvedat = new Date();
      } else if (status !== "resolved") {
        resolvedat = null;
      }

      // Use static update method instead of instance method
      // Use lowercase column names (imageurl, audiourl, assignedto, resolvedat)
      await Bug.update(
        {
          title: title || bug.title,
          description: description !== undefined ? description : bug.description,
          category: category || bug.category,
          status: status || bug.status,
          priority: priority || bug.priority,
          assignedto: assigned_to !== undefined ? assigned_to : bug.assignedto,
          imageurl: image_url !== undefined ? image_url : bug.imageurl,
          audiourl: audio_url !== undefined ? audio_url : bug.audiourl,
          resolvedat: resolvedat,
        },
        { where } // Pass the where clause to identify the record
      );

      res.json({
        success: true,
        message: "Bug updated successfully",
        bug: { ...bug, status, resolvedat }, // Return updated data
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Update bug status - filtered by station
router.patch(
  "/:id/status",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const bug = await Bug.findOne({ where });

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      const { status } = req.body;

      if (!["pending", "in_progress", "resolved", "closed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      let resolvedat = bug.resolvedat;
      if (status === "resolved" && bug.status !== "resolved") {
        resolvedat = new Date();
      } else if (status !== "resolved") {
        resolvedat = null;
      }

      // Use static update method and lowercase resolvedat
      await Bug.update(
        { status, resolvedat },
        { where }
      );

      res.json({
        success: true,
        message: "Bug status updated",
        bug: { ...bug, status, resolvedat },
      });
    } catch (err) {
       console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Delete bug - filtered by station
router.delete(
  "/:id",
  auth,
  stationContext,
  authorize("owner", "admin"),
  async (req, res) => {
    try {
      // For delete, we construct a filter object that matches what destroy expects
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      
      // Check existence first
      const bug = await Bug.findOne({ where });
      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      // Pass the filter object (containing where) to destroy
      await Bug.destroy({ where });

      res.json({
        success: true,
        message: "Bug deleted successfully",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get bug statistics - filtered by station
router.get(
  "/stats/summary",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { Op } = require("sequelize");
      const baseWhere = addStationFilter({}, req.stationId);

      const total = await Bug.count({ where: baseWhere });
      const pending = await Bug.count({
        where: addStationFilter({ status: "pending" }, req.stationId),
      });
      const inProgress = await Bug.count({
        where: addStationFilter({ status: "in_progress" }, req.stationId),
      });
      const resolved = await Bug.count({
        where: addStationFilter({ status: "resolved" }, req.stationId),
      });
      const closed = await Bug.count({
        where: addStationFilter({ status: "closed" }, req.stationId),
      });

      const byCategory = await Bug.findAll({
        attributes: [
          "category",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        where: baseWhere,
        group: ["category"],
      });

      const byPriority = await Bug.findAll({
        attributes: [
          "priority",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        where: baseWhere,
        group: ["priority"],
      });

      res.json({
        total,
        byStatus: {
          pending,
          in_progress: inProgress,
          resolved,
          closed,
        },
        byCategory: byCategory.reduce((acc, item) => {
          acc[item.category] = parseInt(item.get("count"));
          return acc;
        }, {}),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item.priority] = parseInt(item.get("count"));
          return acc;
        }, {}),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
