const express = require("express");
const router = express.Router();
const { Customer } = require("../models");
const { auth, authorize } = require("../middleware/auth");

/**
 * GET all customers
 * Admin / Owner only
 */
router.get("/", auth, authorize("admin", "owner"), async (req, res) => {
  try {
    const list = await Customer.findAll({
      attributes: [
        "id",
        "name",
        "phone",
        "email",
        "external_id",
        "is_active",
        "createdAt",
      ],
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET single customer
 * Admin / Owner / Staff
 */
router.get("/:id", auth, authorize("admin", "owner", "staff"), async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id, {
      attributes: [
        "id",
        "name",
        "phone",
        "email",
        "external_id",
        "address",
        "is_active",
        "createdAt",
      ],
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * CREATE customer
 * Admin / Owner / Staff
 */
router.post("/", auth, authorize("admin", "owner", "staff"), async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      address,
      external_id,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    const customer = await Customer.create({
      name,
      phone,
      email,
      address,
      external_id,
      created_by: req.user.id, // track creator
    });

    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * UPDATE customer
 * Admin / Owner / Staff
 */
router.put("/:id", auth, authorize("admin", "owner", "staff"), async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const {
      name,
      phone,
      email,
      address,
      external_id,
      is_active,
    } = req.body;

    await customer.update({
      name: name ?? customer.name,
      phone: phone ?? customer.phone,
      email: email ?? customer.email,
      address: address ?? customer.address,
      external_id: external_id ?? customer.external_id,
      is_active: is_active ?? customer.is_active,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * SOFT DELETE (Deactivate customer)
 * Admin / Owner only
 */
router.delete("/:id", auth, authorize("admin", "owner"), async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    customer.is_active = false;
    await customer.save();

    res.json({ success: true, message: "Customer deactivated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
