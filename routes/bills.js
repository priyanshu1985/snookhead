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

// Create new bill with comprehensive pricing calculation
router.post(
  "/create",
  auth,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const {
        customer_name = "Walk-in Customer",
        customer_phone,
        table_id,
        session_id,
        selected_menu_items = [],
        session_duration = 0,
        booking_time,
        table_price_per_min,
        frame_charges = 0,
      } = req.body;

      // 1. Calculate table charges
      let table_charges = 0;
      if (table_id && session_duration > 0) {
        const table = await TableAsset.findByPk(table_id);
        if (!table) {
          return res.status(404).json({ error: "Table not found" });
        }

        // Convert price per hour to price per minute if needed
        let pricePerMin = table_price_per_min || table.pricePerMin || 0;

        // Debug logging
        console.log("Table pricing debug:", {
          table_id,
          session_duration,
          table_price_per_min,
          table_pricePerMin: table.pricePerMin,
          calculated_pricePerMin: pricePerMin,
        });

        // If the price seems too high (>100), assume it's per hour and convert to per minute
        if (pricePerMin > 100) {
          pricePerMin = pricePerMin / 60;
          console.log("Converted hourly rate to per minute:", pricePerMin);
        }

        table_charges =
          session_duration * pricePerMin +
          (frame_charges || table.frameCharge || 0);

        console.log("Calculated table charges:", {
          session_duration,
          pricePerMin,
          frame_charges: frame_charges || table.frameCharge || 0,
          total_table_charges: table_charges,
        });
      }

      // 2. Calculate menu charges
      let menu_charges = 0;
      let bill_items = [];

      if (selected_menu_items.length > 0) {
        for (const item of selected_menu_items) {
          const menuItem = await MenuItem.findByPk(item.menu_item_id);
          if (!menuItem) {
            return res.status(404).json({
              error: `Menu item with id ${item.menu_item_id} not found`,
            });
          }

          const quantity = item.quantity || 1;
          const itemTotal = parseFloat(menuItem.price) * quantity;
          menu_charges += itemTotal;

          bill_items.push({
            menu_item_id: menuItem.id,
            name: menuItem.name,
            price: parseFloat(menuItem.price),
            quantity: quantity,
            total: itemTotal,
            category: menuItem.category,
            unit: menuItem.unit,
          });
        }
      }

      // 3. Calculate total amount
      const total_amount = table_charges + menu_charges;

      if (total_amount <= 0) {
        return res.status(400).json({
          error: "Total amount must be greater than 0",
        });
      }

      // 4. Generate unique bill number
      const bill_number = `BILL-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;

      // 5. Create items summary
      const items_summary =
        [
          table_id ? `Table charges (${session_duration} min)` : null,
          ...bill_items.map((item) => `${item.name} x${item.quantity}`),
        ]
          .filter(Boolean)
          .join(", ") || "Service charges";

      // 6. Create the bill
      const bill = await Bill.create({
        bill_number,
        customer_name,
        customer_phone,
        table_id,
        session_id,
        table_charges,
        menu_charges,
        total_amount,
        status: "pending",
        bill_items,
        items_summary,
        session_duration,
        details: JSON.stringify({
          booking_time,
          table_price_per_min,
          frame_charges,
          calculation_breakdown: {
            table_charges,
            menu_charges,
            total_amount,
          },
        }),
      });

      res.status(201).json({
        success: true,
        message: "Bill created successfully",
        bill: {
          id: bill.id,
          bill_number: bill.bill_number,
          customer_name: bill.customer_name,
          customer_phone: bill.customer_phone,
          table_charges: bill.table_charges,
          menu_charges: bill.menu_charges,
          total_amount: bill.total_amount,
          status: bill.status,
          bill_items: bill.bill_items,
          items_summary: bill.items_summary,
          session_duration: bill.session_duration,
          created_at: bill.createdAt,
        },
        breakdown: {
          table_charges,
          menu_charges,
          total_amount,
          items_count: bill_items.length,
        },
      });
    } catch (err) {
      console.error("Error creating bill:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Get pricing information for table and menu items before booking
router.post("/calculate-pricing", auth, async (req, res) => {
  try {
    const {
      table_id,
      selected_menu_items = [],
      session_duration = 0,
      frame_charges = 0,
    } = req.body;

    let pricing = {
      table_charges: 0,
      menu_charges: 0,
      total_amount: 0,
      breakdown: {
        table_info: null,
        menu_items: [],
        error: null,
      },
    };

    // Calculate table charges
    if (table_id) {
      const table = await TableAsset.findByPk(table_id);
      if (table) {
        const pricePerMin = parseFloat(table.pricePerMin || 0);
        const frameCharge = parseFloat(table.frameCharge || 0);
        pricing.table_charges = session_duration * pricePerMin + frame_charges;
        pricing.breakdown.table_info = {
          name: table.name,
          price_per_min: pricePerMin,
          frame_charge: frameCharge,
          duration_minutes: session_duration,
          total: pricing.table_charges,
        };
      } else {
        pricing.breakdown.error = "Table not found";
      }
    }

    // Calculate menu charges
    if (selected_menu_items.length > 0) {
      for (const item of selected_menu_items) {
        const menuItem = await MenuItem.findByPk(item.menu_item_id);
        if (menuItem && menuItem.is_available) {
          const quantity = item.quantity || 1;
          const itemTotal = parseFloat(menuItem.price) * quantity;
          pricing.menu_charges += itemTotal;

          pricing.breakdown.menu_items.push({
            id: menuItem.id,
            name: menuItem.name,
            price: parseFloat(menuItem.price),
            quantity: quantity,
            total: itemTotal,
            category: menuItem.category,
            unit: menuItem.unit,
          });
        }
      }
    }

    pricing.total_amount = pricing.table_charges + pricing.menu_charges;

    res.json({
      success: true,
      pricing,
    });
  } catch (err) {
    console.error("Error calculating pricing:", err);
    res.status(500).json({ error: err.message });
  }
});

// get all bills for a given game + table
router.get(
  "/by-game-table/:game_id/:table_id",
  auth,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { game_id, table_id } = req.params;

      const bills = await Bill.findAll({
        where: {
          table_id: table_id,
        },
        order: [["createdAt", "DESC"]],
      });

      res.json(bills);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
