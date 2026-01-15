import express from "express";
import { User } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import bcrypt from "bcrypt";

const router = express.Router();

// get all users (admin)
router.get("/", auth, authorize("admin"), async (req, res) => {
  try {
    const list = await User.findAll({
      attributes: ["id", "name", "email", "phone", "role", "createdAt"],
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get single user (self or admin)
router.get("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (req.user.role !== "admin" && req.user.id !== id)
      return res.status(403).json({ error: "Forbidden" });
    const u = await User.findByPk(id, {
      attributes: ["id", "name", "email", "phone", "role", "createdAt"],
    });
    if (!u) return res.status(404).json({ error: "Not found" });
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// update user (self or admin)
router.put("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (req.user.role !== "admin" && req.user.id !== id)
      return res.status(403).json({ error: "Forbidden" });
    const u = await User.findByPk(id);
    if (!u) return res.status(404).json({ error: "Not found" });
    const { name, phone } = req.body;
    await User.update({ name: name || u.name, phone: phone || u.phone }, { where: { id: id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// change role (admin only)
router.post("/:id/role", auth, authorize("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    if (!["staff", "owner", "admin", "customer"].includes(role))
      return res.status(400).json({ error: "Invalid role" });

    // Prevent creating new admin users
    if (role === "admin") {
      return res
        .status(403)
        .json({
          error: "Cannot create new admin users. Only one admin allowed.",
        });
    }

    const u = await User.findByPk(id);
    if (!u) return res.status(404).json({ error: "Not found" });
    await User.update({ role }, { where: { id: id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// delete user (admin)
router.delete("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const u = await User.findByPk(id);
    if (!u) return res.status(404).json({ error: "Not found" });

    // Prevent deleting other admin users only
    if (u.role === "admin") {
      return res.status(403).json({ error: "Cannot delete admin users" });
    }

    await User.destroy({ where: { id: id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
