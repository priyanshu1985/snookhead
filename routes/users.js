import express from "express";
import { User } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import bcrypt from "bcrypt";

const router = express.Router();

// get all users (admin/owner)
router.get("/", auth, authorize("admin", "owner"), async (req, res) => {
  try {
    const filter = {
      attributes: ["id", "name", "email", "phone", "role", "createdAt", "salary_type", "salary_amount", "owner_id"],
      where: {}
    };

    // If owner, only show their employees
    if (req.user.role === 'owner') {
      filter.where.owner_id = req.user.id;
    }

    const list = await User.findAll(filter);
    
    // Fetch shifts for these users? maybe separate endpoint or include if model supports relation
    // For now simple list
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new user (admin/owner only)
router.post("/", auth, authorize("admin", "owner"), async (req, res) => {
  try {
    const { name, email, phone, password, role, salary_type, salary_amount, shift } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Role validation
    if (role && !["staff", "manager"].includes(role)) {
       return res.status(400).json({ error: "Invalid role. Can only create staff/manager." });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: role || "staff",
      owner_id: req.user.id, // Link to creator
      stationid: req.user.station_id, // Inherit station from owner 
      salary_type: salary_type || 'monthly',
      salary_amount: salary_amount || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Shift creation removed as per user request to simplify employee creation
    // if (shift) { ... }

    const { passwordHash: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get single user (self or admin)
router.get("/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Security check:
    // 1. Admin can see all
    // 2. Self can see self
    // 3. Owner can see ONLY their employees
    
    if (req.user.role === 'admin') {
        // allow
    } else if (req.user.id === id) {
        // allow
    } else if (req.user.role === 'owner') {
        // Check ownership
        const targetUser = await User.findByPk(id);
        if (!targetUser || targetUser.owner_id !== req.user.id) {
            return res.status(403).json({ error: "Forbidden" });
        }
    } else {
         return res.status(403).json({ error: "Forbidden" });
    }

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
    
    const u = await User.findByPk(id);
    if (!u) return res.status(404).json({ error: "Not found" });

    // Perms
    if (req.user.role === 'admin') {
        // ok
    } else if (req.user.id === id) {
        // ok (self)
    } else if (req.user.role === 'owner') {
        if (u.owner_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    } else {
        return res.status(403).json({ error: "Forbidden" });
    }

    const { name, phone, salary_type, salary_amount } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    // Only owner/admin can update salary
    if ((req.user.role === 'owner' || req.user.role === 'admin') && salary_type) updateData.salary_type = salary_type;
    if ((req.user.role === 'owner' || req.user.role === 'admin') && salary_amount) updateData.salary_amount = salary_amount;

    await User.update(updateData, { where: { id: id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// change role (admin only)
router.post("/:id/role", auth, authorize("admin", "owner"), async (req, res) => {
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
    
    // Check ownership if owner
    if (req.user.role === 'owner' && u.owner_id !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
    }

    await User.update({ role }, { where: { id: id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// delete user (admin)
router.delete("/:id", auth, authorize("admin", "owner"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const u = await User.findByPk(id);
    if (!u) return res.status(404).json({ error: "Not found" });

    // Prevent deleting other admin users only
    if (u.role === "admin") {
      return res.status(403).json({ error: "Cannot delete admin users" });
    }
    
    // Check ownership if owner
    if (req.user.role === 'owner' && u.owner_id !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
    }

    await User.destroy({ where: { id: id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
