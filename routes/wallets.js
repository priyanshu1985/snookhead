const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const { Wallet, Customer } = require("../models");
const { auth, authorize } = require("../middleware/auth");

/* =====================================================
   GET Wallet by Customer ID
   ===================================================== */
router.get(
  "/customer/:customer_id",
  auth,
  async (req, res) => {
    try {
      const { customer_id } = req.params;

      const wallet = await Wallet.findOne({
        where: { customer_id },
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
  }
);

/* =====================================================
   CREATE Wallet + Generate QR
   ===================================================== */
router.post(
  "/create",
  auth,
  authorize("admin", "owner"),
  async (req, res) => {
    try {
      const { customer_id, phone_no, currency } = req.body;

      if (!customer_id) {
        return res.status(400).json({ error: "customer_id is required" });
      }

      const customer = await Customer.findByPk(customer_id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const exists = await Wallet.findOne({ where: { customer_id } });
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

      const wallet = await Wallet.create({
        id: walletId,
        customer_id,
        phone_no,
        qr_id: qrId,
        qr_code: Buffer.from(qrBase64.split(",")[1], "base64"),
        currency: currency || "INR",
        balance: 0,
        credit_limit: 0,
        reserved_amount: 0,
      });

      res.status(201).json({
        message: "Wallet created",
        wallet_id: wallet.id,
        qr_id: wallet.qr_id,
        qr_code: qrBase64,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =====================================================
   ADD Money
   ===================================================== */
router.post(
  "/add-money",
  auth,
  authorize("staff", "admin", "owner"),
  async (req, res) => {
    try {
      const { customer_id, amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const wallet = await Wallet.findOne({ where: { customer_id } });
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      wallet.balance = Number(wallet.balance) + Number(amount);
      wallet.last_transaction_at = new Date();
      await wallet.save();

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
   DEDUCT Money
   ===================================================== */
router.post(
  "/deduct-money",
  auth,
  authorize("staff", "admin", "owner"),
  async (req, res) => {
    try {
      const { customer_id, amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const wallet = await Wallet.findOne({ where: { customer_id } });
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      const available =
        Number(wallet.balance) + Number(wallet.credit_limit);

      if (available < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      wallet.balance = Number(wallet.balance) - Number(amount);
      wallet.last_transaction_at = new Date();
      await wallet.save();

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
   SCAN QR → Get Customer + Wallet
   ===================================================== */
router.post(
  "/scan",
  auth,
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

      const wallet = await Wallet.findByPk(decoded.wallet_id, {
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
   ADMIN: Get all wallets
   ===================================================== */
router.get(
  "/",
  auth,
  authorize("admin", "owner"),
  async (req, res) => {
    try {
      const wallets = await Wallet.findAll({
        include: [{ model: Customer }],
      });
      res.json(wallets);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
