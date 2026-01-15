import express from "express";
import { Customer } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

/**
 * GET all customers
 * Admin / Owner only - filtered by station
 */
router.get(
  "/",
  auth,
  stationContext,
  authorize("admin", "owner"),
  async (req, res) => {
    try {
      const where = addStationFilter({}, req.stationId);
      const list = await Customer.findAll({
        where,
        attributes: [
          "id",
          "name",
          "phone",
          "email",
          "email",
          "externalid",
          "isactive",
          "createdAt",
        ],
      });
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET single customer
 * Admin / Owner / Staff - filtered by station
 */
router.get(
  "/:id",
  auth,
  stationContext,
  authorize("admin", "owner", "staff"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const where = addStationFilter({ id }, req.stationId);

      const customer = await Customer.findOne({
        where,
        attributes: [
          "id",
          "name",
          "phone",
          "email",
          "email",
          "externalid",
          "address",
          "isactive",
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
  }
);

/**
 * CREATE customer
 * Admin / Owner / Staff - with station_id
 */
router.post(
  "/",
  auth,
  stationContext,
  requireStation,
  authorize("admin", "owner", "staff"),
  async (req, res) => {
    try {
      const { name, phone, email, address, external_id } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ error: "Name and phone are required" });
      }

      const customerData = addStationToData(
        {
          name,
          phone,
          email,
          address,
          externalid: external_id,
          createdby: req.user.id,
        },
        req.stationId
      );

      const customer = await Customer.create(customerData);

      res.status(201).json(customer);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

/**
 * UPDATE customer
 * Admin / Owner / Staff - filtered by station
 */
router.put(
  "/:id",
  auth,
  stationContext,
  authorize("admin", "owner", "staff"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const where = addStationFilter({ id }, req.stationId);
      const customer = await Customer.findOne({ where });

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const { name, phone, email, address, external_id, is_active } = req.body;

      await Customer.update({
        name: name ?? customer.name,
        phone: phone ?? customer.phone,
        email: email ?? customer.email,
        address: address ?? customer.address,
        externalid: external_id ?? customer.externalid,
        isactive: is_active ?? customer.isactive,
      }, { where: { id: customer.id } });

      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

/**
 * SOFT DELETE (Deactivate customer)
 * Admin / Owner only - filtered by station
 */
router.delete(
  "/:id",
  auth,
  stationContext,
  authorize("admin", "owner"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const where = addStationFilter({ id }, req.stationId);
      const customer = await Customer.findOne({ where });

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      await Customer.update({ isactive: false }, { where: { id: customer.id } });

      res.json({ success: true, message: "Customer deactivated" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * ACTIVATE customer
 * Admin / Owner / Staff - filtered by station
 */
router.patch(
  "/:id/activate",
  auth,
  stationContext,
  authorize("admin", "owner", "staff"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const where = addStationFilter({ id }, req.stationId);
      const customer = await Customer.findOne({ where });

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      await Customer.update({ isactive: true }, { where: { id: customer.id } });

      res.json({
        success: true,
        message: "Customer activated",
        isactive: true,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * DEACTIVATE customer
 * Admin / Owner / Staff - filtered by station
 */
router.patch(
  "/:id/deactivate",
  auth,
  stationContext,
  authorize("admin", "owner", "staff"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const where = addStationFilter({ id }, req.stationId);
      const customer = await Customer.findOne({ where });

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      await Customer.update({ isactive: false }, { where: { id: customer.id } });

      res.json({
        success: true,
        message: "Customer deactivated",
        isactive: false,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
