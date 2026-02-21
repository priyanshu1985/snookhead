import express from "express";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { Wallet, Customer, WalletTransaction } from "../models/index.js";
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

    if (req.needsStationSetup) {
      return res.status(404).json({ error: "Wallet/Customer not found" });
    }

    let wallet = null;

    // 1. Try finding by UUID (customer ID) directly if it looks like a uuid
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        customer_id,
      );

    if (isUuid) {
      const where = addStationFilter(
        { customerid: customer_id },
        req.stationId,
      );
      wallet = await Wallet.findOne({
        where,
        include: [{ model: Customer }],
      });
    }

    // 2. If not found by UUID, try searching Customer by member_seq, phone, or alias
    if (!wallet) {
      // Find customer first
      // We need custom filter for OR condition (member_seq OR phone OR alias)
      // Since our model helper supports basic 'where', we might need multiple attempts or advanced filter.
      // Let's try finding unique customer matching the input.

      let customer = null;

      // Try member_seq (if numeric)
      if (!isNaN(customer_id)) {
        customer = await Customer.findOne({
          where: addStationFilter(
            { member_seq: Number(customer_id) },
            req.stationId,
          ),
        });
      }

      // Try Phone
      if (!customer) {
        customer = await Customer.findOne({
          where: addStationFilter({ phone: customer_id }, req.stationId),
        });
      }

      // Try Alias
      if (!customer) {
        customer = await Customer.findOne({
          where: addStationFilter({ alias: customer_id }, req.stationId),
        });
      }

      // Try UUID on Customer ID directly if it was a UUID but no wallet yet? (handled by logic below)

      if (customer) {
        // Found customer, now get wallet
        const where = addStationFilter(
          { customerid: customer.id },
          req.stationId,
        );
        wallet = await Wallet.findOne({
          where,
          include: [{ model: Customer }],
        });

        // If wallet doesn't exist for this customer, we might want to return just customer info?
        // But existing API returns "Wallet not found".
        // The PaymentModal expects wallet data.
        // If wallet missing but customer exists, maybe Create one?
        // For now, let's stick to existing behavior: return 404 if wallet not found.
      }
    }

    if (!wallet) {
      return res.status(404).json({ error: "Wallet/Customer not found" });
    }

    // Convert Buffer QR code to base64 string for frontend
    if (wallet.qr_code && Buffer.isBuffer(wallet.qr_code)) {
      wallet.setDataValue(
        "qr_code",
        `data:image/png;base64,${wallet.qr_code.toString("base64")}`,
      );
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
        req.stationId,
      );
      const customer = await Customer.findOne({ where: customerWhere });
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const existsWhere = addStationFilter(
        { customerid: customer_id },
        req.stationId,
      );
      const exists = await Wallet.findOne({ where: existsWhere });
      if (exists) {
        return res
          .status(400)
          .json({ error: "Wallet already exists for this customer" });
      }

      const walletId = uuidv4();
      const qrId = `WALLET-${walletId.slice(0, 8)}`;

      // Create JSON payload
      const payload = {
        type: "WALLET",
        wallet_id: walletId,
        customer_id,
      };

      // Sign payload with JWT
      const secret = process.env.JWT_SECRET || "fallback_secret_for_qr";
      const qrPayload = jwt.sign(payload, secret);

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
        req.stationId,
        "station_id",
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
  },
);

/* =====================================================
   HELPER: Find Wallet by flexible Customer ID
   ===================================================== */
async function findWalletByCustomerId(customer_id, stationId) {
  if (!customer_id) return null;

  // 1. Try finding by UUID (customer ID) directly
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      customer_id,
    );

  if (isUuid) {
    const where = addStationFilter({ customerid: customer_id }, stationId);
    const wallet = await Wallet.findOne({ where });
    if (wallet) return wallet;
  }

  // 2. Lookup Customer by ID/Phone/Alias
  let customer = null;
  if (!isNaN(customer_id)) {
    customer = await Customer.findOne({
      where: addStationFilter({ member_seq: Number(customer_id) }, stationId),
    });
  }
  if (!customer) {
    customer = await Customer.findOne({
      where: addStationFilter({ phone: customer_id }, stationId),
    });
  }
  if (!customer) {
    customer = await Customer.findOne({
      where: addStationFilter({ alias: customer_id }, stationId),
    });
  }

  if (customer) {
    const where = addStationFilter({ customerid: customer.id }, stationId);
    return await Wallet.findOne({ where });
  }

  return null;
}

/* =====================================================
   LOOKUP Wallet & Customer by ID/Phone - filtered by station
   ===================================================== */
router.get(
  "/lookup",
  auth,
  stationContext,
  authorize("staff", "admin", "owner"),
  async (req, res) => {
    try {
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({ error: "Query parameter required" });
      }

      const wallet = await findWalletByCustomerId(query, req.stationId);

      if (!wallet) {
        return res
          .status(404)
          .json({ error: "Wallet not found for this customer" });
      }

      // Fetch full customer details to return
      const customer = await Customer.findOne({
        where: { id: wallet.customerid },
      });

      res.json({
        wallet: {
          id: wallet.id,
          balance: wallet.balance,
          currency: wallet.currency,
        },
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          member_seq: customer.member_seq,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
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

      const wallet = await findWalletByCustomerId(customer_id, req.stationId);
      if (!wallet) {
        return res
          .status(404)
          .json({ error: "Wallet not found for this customer" });
      }

      const newBalance = Number(wallet.balance) + Number(amount);
      await Wallet.update(
        {
          balance: newBalance,
          lasttransactionat: new Date(),
        },
        { where: { id: wallet.id } },
      );

      // Create Transaction Record
      await WalletTransaction.create({
        walletid: wallet.id,
        customerid: wallet.customerid,
        amount: amount,
        balancebefore: wallet.balance,
        balanceafter: newBalance,
        stationid: req.stationId,
        type: "TOPUP",
        description: "Money Added via Panel",
        createdAt: new Date(),
      });

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
  },
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
      await Wallet.update(
        {
          balance: newBalance,
          lasttransactionat: new Date(),
        },
        { where: { id: wallet.id } },
      );

      // Create Transaction Record
      await WalletTransaction.create({
        walletid: wallet.id,
        customerid: wallet.customerid,
        amount: amount,
        balancebefore: wallet.balance,
        balanceafter: newBalance,
        stationid: req.stationId,
        type: "TOPUP",
        description: "Money Added via Panel (ID)",
        createdAt: new Date(),
      });

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
  },
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

      const wallet = await findWalletByCustomerId(customer_id, req.stationId);
      if (!wallet) {
        return res
          .status(404)
          .json({ error: "Wallet not found matching this ID" });
      }

      // Check balance (optional, currently allowing negative)
      // const available = Number(wallet.balance) + Number(wallet.creditlimit);
      // if (available < amount) { ... }

      const newBalance = Number(wallet.balance) - Number(amount);
      await Wallet.update(
        {
          balance: newBalance,
          lasttransactionat: new Date(),
        },
        { where: { id: wallet.id } },
      );

      // Create Transaction Record
      await WalletTransaction.create({
        walletid: wallet.id,
        customerid: wallet.customerid,
        amount: amount,
        balancebefore: wallet.balance,
        balanceafter: newBalance,
        stationid: req.stationId,
        type: "DEDUCT",
        description: "Money Deducted via Panel",
        createdAt: new Date(),
      });

      // Update local object for response
      wallet.balance = newBalance;

      res.json({
        message: "Amount deducted",
        new_balance: wallet.balance,
      });
    } catch (err) {
      console.error("Wallet deduction error:", err);
      res.status(500).json({ error: err.message });
    }
  },
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

      // --- DEBUG LOGGING & FLEXIBLE QR VALIDATION ---
      // Log the raw QR data for debugging
      console.log("Received qr_data:", qr_data);
      let decoded;

      const secret = process.env.JWT_SECRET || "fallback_secret_for_qr";

      try {
        // Try decoding as JWT first
        decoded = jwt.verify(qr_data, secret);
      } catch (jwtErr) {
        // Fallback: Try parsing as plain JSON for older, unsigned QR codes
        try {
          decoded = JSON.parse(qr_data);
        } catch (e) {
          // Try parsing if double-encoded or as plain object string
          try {
            decoded = JSON.parse(JSON.parse(qr_data));
          } catch (e2) {
            return res
              .status(400)
              .json({ error: "Invalid QR data (parse failed)", debug: qr_data });
          }
        }
      }
      // Accept both string and lowercase type
      if (!decoded.type || decoded.type.toUpperCase() !== "WALLET") {
        return res
          .status(400)
          .json({ error: "Invalid QR type", debug: decoded });
      }
      if (!decoded.wallet_id) {
        return res
          .status(400)
          .json({ error: "Missing wallet_id in QR", debug: decoded });
      }
      console.log("StationId:", req.stationId, "WalletId:", decoded.wallet_id);
      const where = addStationFilter({ id: decoded.wallet_id }, req.stationId);
      const wallet = await Wallet.findOne({ where });
      console.log("Wallet found:", wallet);

      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      const customerWhere = addStationFilter({ id: wallet.customerid }, req.stationId);
      const customer = await Customer.findOne({ where: customerWhere });

      res.json({
          wallet: {
            id: wallet.id,
            wallet_id: wallet.id,
            customer_id: wallet.customerid,
            balance: wallet.balance,
            creditlimit: wallet.creditlimit,
            currency: wallet.currency,
            reservedamount: wallet.reservedamount,
            lasttransactionat: wallet.lasttransactionat,
            phoneno: wallet.phoneno,
            qrid: wallet.qrid,
            qrcode: wallet.qrcode,
            stationid: wallet.stationid,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
          },
          customer: customer,
          debug: {
            stationId: req.stationId,
            qr_data: qr_data,
          },
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
);

/* =====================================================
   SCAN & PAY: Deduct from wallet for card/credit payment
   ===================================================== */
router.post(
  "/scan-pay",
  auth,
  stationContext,
  authorize("staff", "admin", "owner"),
  async (req, res) => {
    try {
      const { qr_data, amount, mode } = req.body;
      if (!qr_data || !amount || amount <= 0) {
        return res
          .status(400)
          .json({ error: "qr_data and valid amount required" });
      }
      let decoded;
      const secret = process.env.JWT_SECRET || "fallback_secret_for_qr";

      try {
        // Try decoding as JWT first
        decoded = jwt.verify(qr_data, secret);
      } catch (jwtErr) {
        // Fallback to plain JSON
        try {
          decoded = JSON.parse(qr_data);
        } catch {
          return res.status(400).json({ error: "Invalid QR data" });
        }
      }
      if (decoded.type !== "WALLET") {
        return res.status(400).json({ error: "Invalid QR type" });
      }
      const where = addStationFilter({ id: decoded.wallet_id }, req.stationId);
      const wallet = await Wallet.findOne({ where });
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      const customerWhere = addStationFilter({ id: wallet.customerid }, req.stationId);
      const customer = await Customer.findOne({ where: customerWhere });
      // Deduct from wallet (allow negative)
      const newBalance = Number(wallet.balance) - Number(amount);
      await Wallet.update(
        { balance: newBalance, lasttransactionat: new Date() },
        { where: { id: wallet.id } }
      );
      await WalletTransaction.create({
        walletid: wallet.id,
        customerid: wallet.customerid,
        amount: amount,
        balancebefore: wallet.balance,
        balanceafter: newBalance,
        stationid: req.stationId,
        type: "DEDUCT",
        description: `Money Deducted via QR (${mode || "unknown"})`,
        createdAt: new Date(),
      });
      wallet.balance = newBalance;
      res.json({
        message: `Amount deducted via QR (${mode || "unknown"})`,
        new_balance: wallet.balance,
        customer: customer,
        mode,
      });
    } catch (err) {
      console.error("Wallet scan-pay error:", err);
      res.status(500).json({ error: err.message });
    }
  },
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
      if (req.needsStationSetup) {
        return res.json([]);
      }
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
  },
);

/* =====================================================
   GET Wallet Transactions
   ===================================================== */
router.get(
  "/:wallet_id/transactions",
  auth,
  stationContext,
  async (req, res) => {
    try {
      const { wallet_id } = req.params;

      // Transactions table uses 'walletid' and 'stationid'
      const where = {
        walletid: wallet_id,
        stationid: req.stationId,
      };

      // Use findAll from models definition
      const transactions = await WalletTransaction.findAll({
        where,
        order: [["createdAt", "DESC"]],
      });

      res.json(transactions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
