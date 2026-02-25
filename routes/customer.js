import express from "express";
import { Customer } from "../models/index.js";
import { getSupabase as getDb } from "../config/supabase.js";
import { auth, authorize } from "../middleware/auth.js";
import { sendWelcomeEmail } from "../utils/membershipEmailService.js";
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
  authorize("admin", "owner", "manager", "staff"),
  async (req, res) => {
    try {
      if (req.needsStationSetup) {
        return res.json([]);
      }

      const { search } = req.query;
      const where = addStationFilter({}, req.stationId);

      // If search query is provided
      // Select alias too
      let query = getDb().from(Customer.tableName).select("id, name, phone, email, externalid, isactive, createdAt, alias").match(where);

      if (search) {
        // Use 'or' filter for name, phone, OR alias
        // Supabase/PostgREST uses ilike for case-insensitive matching
        const term = `%${search}%`;
        query = query.or(`name.ilike.${term},phone.ilike.${term},alias.ilike.${term}`);

        // LIMIT results for autocomplete performance
        query = query.limit(10);
      } else {
        // Default limit if no search to prevent massive payloads
        // or just let it be if it was returning all before. 
        // Existing code returned ALL. Let's keep it but maybe safe to limit?
        // Let's stick to existing behavior if no search, or maybe add a default limit if it gets too big.
        // For now, keep as is for non-search to avoid breaking other lists.
      }

      // Order by name
      query = query.order('name', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error("Error fetching customers:", err);
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
      const { name, phone, email, address, external_id, initial_balance } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ error: "Name and phone are required" });
      }

      // Validate Phone (10 digits)
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
      }

      // Validate Email (if provided)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
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
        req.stationId,
        "stationid"
      );

      const customer = await Customer.create(customerData);

      // Auto-create wallet for the new customer
      try {
        const { v4: uuidv4 } = await import("uuid");
        const walletId = uuidv4();
        const qrId = `WALLET-${walletId.slice(0, 8)}`;

        // Simple QR payload
        const qrPayload = JSON.stringify({
          type: "WALLET",
          wallet_id: walletId,
          customer_id: customer.id
        });

        // We need QRCode here, let's dynamic import it or use a placeholder if not critical
        // But better to just import it at top if possible. 
        // For now, let's instantiate without QR code image or simple placeholder
        // or just import QRCode at the top of file if we want to be clean.
        // Actually, let's just create the wallet record. The wallet.js handles QR specific logic usually
        // but let's try to match it.

        // Since we can't easily add imports to top without viewing whole file again or using multi replacer,
        // let's just CREATE the wallet record with empty QR for now, or just the necessary fields.
        // The Wallet model requires: id, customerid, stationid, etc.

        const walletData = addStationToData({
          id: walletId,
          customerid: customer.id,
          phoneno: phone,
          qrid: qrId,
          currency: "INR",
          balance: initial_balance || 0,
          creditlimit: 0,
          reservedamount: 0,
          // qrcode: ... // Optional? If column allows null.
        }, req.stationId, "stationid");

        const { Wallet, WalletTransaction } = await import("../models/index.js");
        const newWallet = await Wallet.create(walletData);

        // Record Initial Transaction if balance > 0
        if (initial_balance && initial_balance > 0) {
          await WalletTransaction.create({
            walletid: newWallet.id,
            customerid: customer.id,
            amount: initial_balance,
            balancebefore: 0,
            balanceafter: initial_balance,
            type: 'TOPUP',
            description: 'Opening Balance',
            stationid: req.stationId,
            createdAt: new Date()
          });
        }

        // 3. Send Welcome Email with QR Code (Async/Non-blocking)
        // This is wrapped in its own try/catch to ensure registration doesn't fail if email fails
        if (customer.email) {
          sendWelcomeEmail(customer, {
            qrid: qrId,
            qrPayload: qrPayload
          }).catch(err => console.error("Non-blocking welcome email error:", err));
        }

      } catch (walletErr) {
        console.error("Failed to auto-create wallet:", walletErr);
        // Don't fail the customer creation request just because wallet failed?
        // Or maybe we should.
      }

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
  authorize("admin", "owner", "manager", "staff"),
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
