const express = require("express");
const router = express.Router();
const { Wallet, Customer } = require("../models");
const { auth, authorize } = require("../middleware/auth");

// --------------------------------------
// GET Wallet by Customer ID
// --------------------------------------
router.get("/:customer_id", auth, async (req, res) => {
  try {
    const { customer_id } = req.params;

    const wallet = await Wallet.findOne({ where: { customer_id } });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json(wallet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------
// CREATE Wallet
// (Admins or system only)
// --------------------------------------
router.post(
  "/create",
  auth,
  authorize("admin", "owner"),
  async (req, res) => {
    try {
      const { id, customer_id, phone_no, custmer, qr_id, currency } = req.body;

      const exists = await Wallet.findOne({ where: { customer_id } });
      if (exists) {
        return res
          .status(400)
          .json({ error: "Wallet already exists for this customer" });
      }

      const wallet = await Wallet.create({
        id,
        customer_id,
        phone_no,
        custmer,
        qr_id,
        currency: currency || "INR",
        balance: 0,
        credit_limit: 0,
        reserved_amount: 0,
      });

      res.status(201).json({
        message: "Wallet created",
        wallet,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// --------------------------------------
// ADD Money to Wallet
// --------------------------------------
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

      if (!wallet) return res.status(404).json({ error: "Wallet not found" });

      wallet.balance = Number(wallet.balance) + Number(amount);
      wallet.last_transaction_at = new Date();
      await wallet.save();

      res.json({
        message: "Amount added",
        new_balance: wallet.balance,
        wallet,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// --------------------------------------
// DEDUCT Money from Wallet
// --------------------------------------
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

      if (!wallet) return res.status(404).json({ error: "Wallet not found" });

      const availableAmount =
        Number(wallet.balance) + Number(wallet.credit_limit);

      if (availableAmount < amount) {
        return res
          .status(400)
          .json({ error: "Insufficient wallet balance + credit limit" });
      }

      wallet.balance = Number(wallet.balance) - Number(amount);
      wallet.last_transaction_at = new Date();
      await wallet.save();

      res.json({
        message: "Amount deducted",
        new_balance: wallet.balance,
        wallet,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// --------------------------------------
// ADMIN: Get all wallets
// --------------------------------------
router.get(
  "/",
  auth,
  authorize("admin", "owner"),
  async (req, res) => {
    try {
      const wallets = await Wallet.findAll();
      res.json(wallets);
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
