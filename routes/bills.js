const express = require("express");
const router = express.Router();
const {
  Bill,
  Order,
  ActiveTable,
  OrderItem,
  MenuItem,
  TableAsset,
  Game,
} = require("../models");
const { auth, authorize } = require("../middleware/auth");

// list bills
router.get(
  "/",
  auth,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const list = await Bill.findAll({
        include: [
          {
            model: Order,
            include: [
              {
                model: OrderItem,
                include: [
                  {
                    model: MenuItem,
                  },
                ],
              },
              {
                model: ActiveTable,
                include: [
                  {
                    model: TableAsset,
                  },
                  {
                    model: Game,
                  },
                ],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      // Transform the data to match frontend expectations
      const transformedBills = list.map((bill) => {
        const order = bill.Order || {};
        const activeTable = order.ActiveTable || {};
        const table = activeTable.TableAsset || {};
        const game = activeTable.Game || {};
        const orderItems = order.OrderItems || [];

        return {
          id: bill.id,
          bill_number: bill.bill_number || `B${bill.id}`,
          total_amount: bill.total_amount || bill.amount || 0,
          status: bill.status,
          customer_name: bill.customer_name || "Unknown Customer",
          customer_phone: bill.customer_phone || "+91 XXXXXXXXXX",
          items_summary:
            orderItems
              .map((item) => {
                const menuItem = item.MenuItem || {};
                return menuItem.name || "Item";
              })
              .join(", ") || "Items",
          order_items: orderItems.map((item) => {
            const menuItem = item.MenuItem || {};
            return {
              name: menuItem.name || "Item",
              quantity: `${item.quantity || 1} ${menuItem.unit || "unit"}`,
              price: item.price || menuItem.price || 0,
              item_name: menuItem.name,
              qty: item.quantity,
              amount: item.price || menuItem.price || 0,
            };
          }),
          table_info: {
            name: table.name || "Unknown Table",
            game_name: game.name || game.gamename || "Unknown Game",
          },
          wallet_amount: bill.wallet_amount || 0,
          order_amount: bill.total_amount || 0,
          createdAt: bill.createdAt,
          updatedAt: bill.updatedAt,
        };
      });

      res.json(transformedBills);
    } catch (err) {
      console.error("Error fetching bills:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// get specific bill details
router.get(
  "/:id",
  auth,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const bill = await Bill.findByPk(req.params.id, {
        include: [
          {
            model: Order,
            include: [
              {
                model: OrderItem,
                include: [
                  {
                    model: MenuItem,
                  },
                ],
              },
              {
                model: ActiveTable,
                include: [
                  {
                    model: TableAsset,
                  },
                  {
                    model: Game,
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!bill) return res.status(404).json({ error: "Bill not found" });

      // Transform the data similar to the list endpoint
      const order = bill.Order || {};
      const activeTable = order.ActiveTable || {};
      const table = activeTable.TableAsset || {};
      const game = activeTable.Game || {};
      const orderItems = order.OrderItems || [];

      const transformedBill = {
        id: bill.id,
        bill_number: bill.bill_number || `B${bill.id}`,
        total_amount: bill.total_amount || bill.amount || 0,
        status: bill.status,
        customer_name: bill.customer_name || "Unknown Customer",
        customer_phone: bill.customer_phone || "+91 XXXXXXXXXX",
        items_summary:
          orderItems
            .map((item) => {
              const menuItem = item.MenuItem || {};
              return menuItem.name || "Item";
            })
            .join(", ") || "Items",
        order_items: orderItems.map((item) => {
          const menuItem = item.MenuItem || {};
          return {
            name: menuItem.name || "Item",
            quantity: `${item.quantity || 1} ${menuItem.unit || "unit"}`,
            price: item.price || menuItem.price || 0,
            item_name: menuItem.name,
            qty: item.quantity,
            amount: item.price || menuItem.price || 0,
          };
        }),
        table_info: {
          name: table.name || "Unknown Table",
          game_name: game.name || game.gamename || "Unknown Game",
        },
        wallet_amount: bill.wallet_amount || 0,
        order_amount: bill.total_amount || 0,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
      };

      res.json(transformedBill);
    } catch (err) {
      console.error("Error fetching bill details:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// pay bill
router.post(
  "/:id/pay",
  auth,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const bill = await Bill.findByPk(req.params.id);
      if (!bill) return res.status(404).json({ error: "Bill not found" });

      if (bill.status === "paid") {
        return res.status(400).json({ error: "Bill is already paid" });
      }

      bill.status = "paid";
      bill.paid_at = new Date();
      await bill.save();

      console.log(`Bill ${bill.id} marked as paid`);
      res.json({
        success: true,
        message: "Bill paid successfully",
        bill: {
          id: bill.id,
          status: bill.status,
          total_amount: bill.total_amount,
          paid_at: bill.paid_at,
        },
      });
    } catch (err) {
      console.error("Error paying bill:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// get all bills for a given game + table
router.get(
  "/by-game-table/:game_id/:table_id",
  auth,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { game_id, table_id } = req.params;

      const bills = await Bill.findAll({
        include: [
          {
            model: Order,
            include: [
              {
                model: ActiveTable,
                where: {
                  game_id: Number(game_id),
                  table_id: String(table_id),
                },
              },
            ],
          },
        ],
      });

      res.json(bills);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
