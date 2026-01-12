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
const { stationContext, requireStation, addStationFilter, addStationToData } = require("../middleware/stationContext");

// list bills
router.get(
  "/",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const where = addStationFilter({}, req.stationId);
      const list = await Bill.findAll({
        where,
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

        // Handle bills created via auto-release (no Order, has bill_items JSON)
        const hasOrder = bill.orderId && orderItems.length > 0;
        const billItemsFromJson = bill.bill_items || [];

        // Generate items summary - prefer stored summary, then from Order, then from bill_items
        let itemsSummary = bill.items_summary;
        if (!itemsSummary) {
          if (hasOrder) {
            itemsSummary = orderItems
              .map((item) => (item.MenuItem || {}).name || "Item")
              .join(", ") || "Items";
          } else if (billItemsFromJson.length > 0) {
            itemsSummary = billItemsFromJson
              .map((item) => `${item.name} x${item.quantity}`)
              .join(", ");
          } else {
            itemsSummary = "Table charges";
          }
        }

        // Generate order_items array from Order or bill_items JSON
        let orderItemsFormatted;
        if (hasOrder) {
          orderItemsFormatted = orderItems.map((item) => {
            const menuItem = item.MenuItem || {};
            return {
              name: menuItem.name || "Item",
              quantity: `${item.quantity || 1} ${menuItem.unit || "unit"}`,
              price: item.price || menuItem.price || 0,
              item_name: menuItem.name,
              qty: item.quantity,
              amount: item.price || menuItem.price || 0,
            };
          });
        } else {
          orderItemsFormatted = billItemsFromJson.map((item) => ({
            name: item.name || "Item",
            quantity: `${item.quantity || 1} unit`,
            price: item.price || 0,
            item_name: item.name,
            qty: item.quantity || 1,
            amount: item.total || item.price || 0,
          }));
        }

        return {
          id: bill.id,
          bill_number: bill.bill_number || `B${bill.id}`,
          total_amount: bill.total_amount || bill.amount || bill.total || 0,
          table_charges: bill.table_charges || 0,
          menu_charges: bill.menu_charges || 0,
          session_duration: bill.session_duration || 0,
          status: bill.status,
          customer_name: bill.customer_name || "Unknown Customer",
          customer_phone: bill.customer_phone || "+91 XXXXXXXXXX",
          items_summary: itemsSummary,
          order_items: orderItemsFormatted,
          table_info: {
            name: table.name || "Unknown Table",
            game_name: game.name || game.gamename || "Unknown Game",
          },
          wallet_amount: bill.wallet_amount || 0,
          order_amount: bill.total_amount || bill.total || 0,
          createdAt: bill.createdAt,
          updatedAt: bill.updatedAt,
        };
      });

      res.json(transformedBills);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// get specific bill details
router.get(
  "/:id",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const bill = await Bill.findOne({
        where,
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

      // Handle bills created via auto-release (no Order, has bill_items JSON)
      const hasOrder = bill.orderId && orderItems.length > 0;
      const billItemsFromJson = bill.bill_items || [];

      // Generate items summary - prefer stored summary, then from Order, then from bill_items
      let itemsSummary = bill.items_summary;
      if (!itemsSummary) {
        if (hasOrder) {
          itemsSummary = orderItems
            .map((item) => (item.MenuItem || {}).name || "Item")
            .join(", ") || "Items";
        } else if (billItemsFromJson.length > 0) {
          itemsSummary = billItemsFromJson
            .map((item) => `${item.name} x${item.quantity}`)
            .join(", ");
        } else {
          itemsSummary = "Table charges";
        }
      }

      // Generate order_items array from Order or bill_items JSON
      let orderItemsFormatted;
      if (hasOrder) {
        orderItemsFormatted = orderItems.map((item) => {
          const menuItem = item.MenuItem || {};
          return {
            name: menuItem.name || "Item",
            quantity: `${item.quantity || 1} ${menuItem.unit || "unit"}`,
            price: item.price || menuItem.price || 0,
            item_name: menuItem.name,
            qty: item.quantity,
            amount: item.price || menuItem.price || 0,
          };
        });
      } else {
        orderItemsFormatted = billItemsFromJson.map((item) => ({
          name: item.name || "Item",
          quantity: `${item.quantity || 1} unit`,
          price: item.price || 0,
          item_name: item.name,
          qty: item.quantity || 1,
          amount: item.total || item.price || 0,
        }));
      }

      const transformedBill = {
        id: bill.id,
        bill_number: bill.bill_number || `B${bill.id}`,
        total_amount: bill.total_amount || bill.amount || bill.total || 0,
        table_charges: bill.table_charges || 0,
        menu_charges: bill.menu_charges || 0,
        session_duration: bill.session_duration || 0,
        status: bill.status,
        customer_name: bill.customer_name || "Unknown Customer",
        customer_phone: bill.customer_phone || "+91 XXXXXXXXXX",
        items_summary: itemsSummary,
        order_items: orderItemsFormatted,
        table_info: {
          name: table.name || "Unknown Table",
          game_name: game.name || game.gamename || "Unknown Game",
        },
        wallet_amount: bill.wallet_amount || 0,
        order_amount: bill.total_amount || bill.total || 0,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
      };

      res.json(transformedBill);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// pay bill
router.post(
  "/:id/pay",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const bill = await Bill.findOne({ where });
      if (!bill) return res.status(404).json({ error: "Bill not found" });

      if (bill.status === "paid") {
        return res.status(400).json({ error: "Bill is already paid" });
      }

      bill.status = "paid";
      bill.paid_at = new Date();
      await bill.save();

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
      res.status(500).json({ error: err.message });
    }
  }
);

// Create new bill with comprehensive pricing calculation
router.post(
  "/create",
  auth,
  stationContext,
  requireStation,
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
      let actualPricePerMin = 0;
      let actualFrameCharges = 0;

      if (table_id && session_duration > 0) {
        const tableWhere = addStationFilter({ id: table_id }, req.stationId);
        const table = await TableAsset.findOne({ where: tableWhere });
        if (!table) {
          return res.status(404).json({ error: "Table not found" });
        }

        // Use provided price per min, or fallback to table's price
        actualPricePerMin = table_price_per_min !== undefined ? Number(table_price_per_min) : Number(table.pricePerMin || 0);

        // Only use frame charges if explicitly provided (not from table defaults)
        // frame_charges of 0 means no frame charges, don't fallback to table.frameCharge
        actualFrameCharges = frame_charges !== undefined ? Number(frame_charges) : 0;

        table_charges = session_duration * actualPricePerMin + actualFrameCharges;
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

      // Allow zero amount bills (e.g., complimentary sessions)
      if (total_amount < 0) {
        return res.status(400).json({
          error: "Total amount cannot be negative",
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

      // 6. Create the bill with station_id
      const billData = addStationToData({
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
          table_price_per_min: actualPricePerMin,
          frame_charges: actualFrameCharges,
          calculation_breakdown: {
            table_charges,
            menu_charges,
            total_amount,
            session_duration,
          },
        }),
      }, req.stationId);
      const bill = await Bill.create(billData);

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
      res.status(500).json({ error: err.message });
    }
  }
);

// Get pricing information for table and menu items before booking
router.post("/calculate-pricing", auth, stationContext, async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// get all bills for a given game + table
router.get(
  "/by-game-table/:game_id/:table_id",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { game_id, table_id } = req.params;

      const where = addStationFilter({ table_id: table_id }, req.stationId);
      const bills = await Bill.findAll({
        where,
        order: [["createdAt", "DESC"]],
      });

      res.json(bills);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
