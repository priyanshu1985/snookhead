const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
require("dotenv").config();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: "User exists" });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash, phone });
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid creds" });
    const ok = await user.checkPassword(password);
    if (!ok) return res.status(400).json({ error: "Invalid creds" });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
