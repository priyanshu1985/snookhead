const express = require("express");
const router = express.Router();
const { Bug, User } = require("../models");
const { auth, authorize } = require("../middleware/auth");

// Get all bugs
router.get("/", auth, async (req, res) => {
  try {
    const { status, category, priority } = req.query;

    const whereClause = {};
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

// Get bug by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const bug = await Bug.findByPk(req.params.id, {
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

// Create new bug report
router.post("/", auth, async (req, res) => {
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

    const bug = await Bug.create({
      title: title.trim(),
      description: description?.trim() || null,
      category,
      priority,
      image_url,
      audio_url,
      reported_by: req.user?.id || null,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Bug reported successfully",
      bug,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update bug
router.put(
  "/:id",
  auth,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const bug = await Bug.findByPk(req.params.id);

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
      let resolved_at = bug.resolved_at;
      if (status === "resolved" && bug.status !== "resolved") {
        resolved_at = new Date();
      } else if (status !== "resolved") {
        resolved_at = null;
      }

      await bug.update({
        title: title || bug.title,
        description: description !== undefined ? description : bug.description,
        category: category || bug.category,
        status: status || bug.status,
        priority: priority || bug.priority,
        assigned_to: assigned_to !== undefined ? assigned_to : bug.assigned_to,
        image_url: image_url !== undefined ? image_url : bug.image_url,
        audio_url: audio_url !== undefined ? audio_url : bug.audio_url,
        resolved_at,
      });

      res.json({
        success: true,
        message: "Bug updated successfully",
        bug,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Update bug status
router.patch(
  "/:id/status",
  auth,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const bug = await Bug.findByPk(req.params.id);

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      const { status } = req.body;

      if (!["pending", "in_progress", "resolved", "closed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      let resolved_at = bug.resolved_at;
      if (status === "resolved" && bug.status !== "resolved") {
        resolved_at = new Date();
      } else if (status !== "resolved") {
        resolved_at = null;
      }

      await bug.update({ status, resolved_at });

      res.json({
        success: true,
        message: "Bug status updated",
        bug,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Delete bug
router.delete(
  "/:id",
  auth,
  authorize("owner", "admin"),
  async (req, res) => {
    try {
      const bug = await Bug.findByPk(req.params.id);

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      await bug.destroy();

      res.json({
        success: true,
        message: "Bug deleted successfully",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get bug statistics
router.get(
  "/stats/summary",
  auth,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { Op } = require("sequelize");

      const total = await Bug.count();
      const pending = await Bug.count({ where: { status: "pending" } });
      const inProgress = await Bug.count({ where: { status: "in_progress" } });
      const resolved = await Bug.count({ where: { status: "resolved" } });
      const closed = await Bug.count({ where: { status: "closed" } });

      const byCategory = await Bug.findAll({
        attributes: [
          "category",
          [require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"],
        ],
        group: ["category"],
      });

      const byPriority = await Bug.findAll({
        attributes: [
          "priority",
          [require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"],
        ],
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

module.exports = router;
