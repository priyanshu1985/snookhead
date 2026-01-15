import express from "express";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import { Wallet, Customer } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

/* =====================================================
   GET Wallet by Customer ID - filtered by station
   ===================================================== */
router.get("/customer/:customer_id", auth, stationContext, async (req, res) => {
  try {
    const { customer_id } = req.params;

    const where = addStationFilter({ customerid: customer_id }, req.stationId);
    const wallet = await Wallet.findOne({
      where,
      include: [{ model: Customer }],
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json(wallet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   CREATE Wallet + Generate QR - with station_id
   ===================================================== */
router.post(
  "/create",
  auth,
  stationContext,
  requireStation,
  authorize("admin", "owner"),
  async (req, res) => {
    try {
      const { customer_id, phone_no, currency } = req.body;

      if (!customer_id) {
        return res.status(400).json({ error: "customer_id is required" });
      }

      // Check customer exists and belongs to this station
      const customerWhere = addStationFilter(
        { id: customer_id },
        req.stationId
      );
      const customer = await Customer.findOne({ where: customerWhere });
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const existsWhere = addStationFilter({ customerid: customer_id }, req.stationId);
      const exists = await Wallet.findOne({ where: existsWhere });
      if (exists) {
        return res
          .status(400)
          .json({ error: "Wallet already exists for this customer" });
      }

      const walletId = uuidv4();
      const qrId = `WALLET-${walletId.slice(0, 8)}`;

      // QR payload (safe, no PII)
      const qrPayload = JSON.stringify({
        type: "WALLET",
        wallet_id: walletId,
        customer_id,
      });

      const qrBase64 = await QRCode.toDataURL(qrPayload);

      const walletData = addStationToData(
        {
          id: walletId,
          customerid: customer_id,
          phoneno: phone_no,
          qrid: qrId,
          qrcode: Buffer.from(qrBase64.split(",")[1], "base64"),
          currency: currency || "INR",
          balance: 0,
          creditlimit: 0,
          reservedamount: 0,
        },
        req.stationId
      );

      const wallet = await Wallet.create(walletData);

      res.status(201).json({
        message: "Wallet created",
        wallet_id: wallet.id,
        qr_id: wallet.qrid,
        qr_code: qrBase64,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   ADD Money - filtered by station
   ===================================================== */
router.post(
  "/add-money",
  auth,
  stationContext,
  authorize("staff", "admin", "owner"),
  async (req, res) => {
    try {
      const { customer_id, amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const where = addStationFilter({ customerid: customer_id }, req.stationId);
      const wallet = await Wallet.findOne({ where });
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      const newBalance = Number(wallet.balance) + Number(amount);
      await Wallet.update({
        balance: newBalance,
        lasttransactionat: new Date()
      }, { where: { id: wallet.id } });
      
      // Update local object for response
      wallet.balance = newBalance;

      res.json({
        message: "Amount added",
        new_balance: wallet.balance,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   ADD Money by Wallet ID - filtered by station
   ===================================================== */
router.post(
  "/:wallet_id/add",
  auth,
  stationContext,
  authorize("staff", "admin", "owner"),
  async (req, res) => {
    try {
      const { wallet_id } = req.params;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const where = addStationFilter({ id: wallet_id }, req.stationId);
      const wallet = await Wallet.findOne({ where });
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      const newBalance = Number(wallet.balance) + Number(amount);
      await Wallet.update({
        balance: newBalance,
        lasttransactionat: new Date()
      }, { where: { id: wallet.id } });

      // Update local object for response
      wallet.balance = newBalance;

      res.json({
        message: "Amount added",
        new_balance: wallet.balance,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   DEDUCT Money - filtered by station
   ===================================================== */
router.post(
  "/deduct-money",
  auth,
  stationContext,
  authorize("staff", "admin", "owner"),
  async (req, res) => {
    try {
      const { customer_id, amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const where = addStationFilter({ customerid: customer_id }, req.stationId);
      const wallet = await Wallet.findOne({ where });
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      const available = Number(wallet.balance) + Number(wallet.creditlimit);

      if (available < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      const newBalance = Number(wallet.balance) - Number(amount);
      await Wallet.update({
        balance: newBalance,
        lasttransactionat: new Date()
      }, { where: { id: wallet.id } });

      // Update local object for response
      wallet.balance = newBalance;

      res.json({
        message: "Amount deducted",
        new_balance: wallet.balance,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   SCAN QR → Get Customer + Wallet - filtered by station
   ===================================================== */
router.post(
  "/scan",
  auth,
  stationContext,
  authorize("staff", "admin", "owner"),
  async (req, res) => {
    try {
      const { qr_data } = req.body;

      if (!qr_data) {
        return res.status(400).json({ error: "qr_data required" });
      }

      let decoded;
      try {
        decoded = JSON.parse(qr_data);
      } catch {
        return res.status(400).json({ error: "Invalid QR data" });
      }

      if (decoded.type !== "WALLET") {
        return res.status(400).json({ error: "Invalid QR type" });
      }

      const where = addStationFilter({ id: decoded.wallet_id }, req.stationId);
      const wallet = await Wallet.findOne({
        where,
        include: [
          {
            model: Customer,
            attributes: ["id", "name", "phone", "email", "is_active"],
          },
        ],
      });

      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      res.json({
        wallet: {
          id: wallet.id,
          balance: wallet.balance,
          currency: wallet.currency,
        },
        customer: wallet.Customer,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   ADMIN/OWNER: Get all wallets - filtered by station
   ===================================================== */
router.get(
  "/",
  auth,
  stationContext,
  authorize("admin", "owner"),
  async (req, res) => {
    try {
      const where = addStationFilter({}, req.stationId);
      const wallets = await Wallet.findAll({
        where,
        include: [{ model: Customer }],
      });
      res.json(wallets);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
