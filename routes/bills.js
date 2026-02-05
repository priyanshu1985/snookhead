import express from "express";
import {
  Bill,
  Order,
  ActiveTable,
  OrderItem,
  MenuItem,
  TableAsset,
  Game,
} from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

const router = express.Router();

// list bills
router.get(
  "/",
  auth,
  stationContext,
  authorize("staff", "owner", "admin", "manager"),
  async (req, res) => {
    try {
      const where = addStationFilter({}, req.stationId);
      const bills = await Bill.findAll({
        where,
        order: [["createdAt", "DESC"]],
      });

      // Manually fetch related data (Tables, Games) since custom ORM lacks 'include'
      // 1. Get unique Table IDs and Session IDs
      const tableIds = [...new Set(bills.map((b) => b.tableid).filter(Boolean))];
      const sessionIds = [...new Set(bills.map((b) => b.sessionid).filter(Boolean))];

      // 2. Fetch all Tables
      let tablesMap = {};
      if (tableIds.length > 0) {
        // Since ORM findAll doesn't support IN clause easily (or requires loop), we'll hack it or just fetch all Tables for station?
        // Fetching all tables for station is safer/easier if not too many.
        // Or loop findByPk.
        // Let's try fetching all tables for the station.
        const allTables = await TableAsset.findAll({ where: addStationFilter({}, req.stationId) });
        allTables.forEach(t => tablesMap[t.id] = t);
      }

      // 3. Fetch specific sessions and their games
      let sessionsMap = {}; // sessionId -> { ...session, game: {...} }
      let gameIds = new Set();
      
      // We need sessions to get game_id.
      // But bills usually have 'details' with game information if we updated them.
      // Legacy bills might rely on session.
      // Let's fetch sessions by ID. Since no IN clause in efficient wrapper, Promise.all might be heavy if many bills.
      // Optimization: Fetch all ActiveTables for station? Might be huge.
      // Optimization: For now, we will live with Promise.all for unique session lookup or fetch all 'completed' sessions?
      // Actually, if we just want Game Name...
      // Let's rely on Table -> Game mapping? No, Table can change games.
      
      // Alternative: Verify if Bill.details usually has game_id?
      // If not, we SHOULD fetch session.
      // Let's do a simplified approach: Fetch ALL Games. Games are few.
      const games = await Game.findAll();
      const gamesMap = {}; 
      games.forEach(g => gamesMap[g.gameid] = g);

      // We still need to know WHICH game a session was.
      // If `sessionid` is present, we can look it up.
      // Optimization: For the List View, maybe we don't need accurate historical Game Name if it's too expensive?
      // BUT user complained "Unknown Game".
      // Let's use `Promise.all` to fetch sessions for the displayed bills (or all).
      // Given pagination isn't implemented (limit/offset manually handled?), we are fetching ALL bills?
      // Step 1850 showed manual limit/offset support. Current route does findAll without limit.
      // If bills are many, this is slow. 
      // Proceeding with Promise.all for sessions of *fetched* bills.
      
      const distinctSessionIds = sessionIds;
      const sessionPromises = distinctSessionIds.map(id => ActiveTable.findByPk(id));
      const sessions = await Promise.all(sessionPromises);
      sessions.forEach(s => {
          if(s) sessionsMap[s.activeid || s.active_id] = s;
      });

      // Transform
      const transformedBills = bills.map((bill) => {
        const table = tablesMap[bill.tableid] || {};
        const session = sessionsMap[bill.sessionid] || {};
        const gameId = session.gameid || session.game_id;
        const game = gamesMap[gameId] || {};
        const details = typeof bill.details === 'string' ? JSON.parse(bill.details) : (bill.details || {});

        // Prefer Game Name from details (if we start saving it there) or resolved via session
        // If we don't have session (deleted?), we fallback to "Unknown Game" or maybe details has it?
        
        const gameName = game.name || game.gamename || "Unknown Game";
        
        let itemsSummary = bill.itemssummary;
        const billItems = bill.billitems || [];
        
        if (!itemsSummary) {
           if (billItems.length > 0) {
             itemsSummary = billItems.map((item) => `${item.name} x${item.quantity}`).join(", ");
           } else {
             itemsSummary = "Table charges";
           }
        }

        // Order Items formatting
        const orderItemsFormatted = billItems.map((item) => ({
             name: item.name || "Item",
             quantity: `${item.quantity || 1} unit`,
             price: item.price || 0,
             item_name: item.name,
             qty: item.quantity || 1,
             amount: item.total || item.price || 0,
        }));

        return {
          id: bill.id,
          bill_number: bill.billnumber || `B${bill.id}`,
          total_amount: bill.totalamount || bill.amount || 0,
          table_charges: bill.tablecharges || 0,
          menu_charges: bill.menucharges || 0,
          session_duration: bill.sessionduration || 0,
          status: bill.status,
          customer_name: bill.customername || "Unknown Customer",
          customer_phone: bill.customerphone || "+91 XXXXXXXXXX",
          items_summary: itemsSummary,
          order_items: orderItemsFormatted,
          table_info: {
            name: table.name || "Unknown Table",
            game_name: gameName,
          },
          wallet_amount: bill.wallet_amount || 0,
          order_amount: bill.totalamount || 0,
          advance_payment: details.advance_payment || 0, // Expose advance payment
          createdAt: bill.createdAt,
          updatedAt: bill.updatedAt,
        };
      });

      res.json(transformedBills);
    } catch (err) {
      console.error(err); // Log error
      res.status(500).json({ error: err.message });
    }
  }
);

// get specific bill details
router.get(
  "/:id",
  auth,
  stationContext,
  authorize("staff", "owner", "admin", "manager"),
  async (req, res) => {
    try {
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const bill = await Bill.findOne({ where });

      if (!bill) return res.status(404).json({ error: "Bill not found" });

      // Fetch related data manually
      const table = bill.tableid ? await TableAsset.findByPk(bill.tableid) : {};
      const session = bill.sessionid ? await ActiveTable.findByPk(bill.sessionid) : {};
      const gameId = session ? (session.gameid || session.game_id) : null;
      const game = gameId ? await Game.findByPk(gameId) : {};

      const gameName = game ? (game.name || game.gamename) : "Unknown Game";
      
      // Parse details/items
      const details = typeof bill.details === 'string' ? JSON.parse(bill.details) : (bill.details || {});
      const billItems = bill.billitems || [];
      
      let itemsSummary = bill.itemssummary;
      if (!itemsSummary) {
           if (billItems.length > 0) {
             itemsSummary = billItems.map((item) => `${item.name} x${item.quantity}`).join(", ");
           } else {
             itemsSummary = "Table charges";
           }
      }

      const orderItemsFormatted = billItems.map((item) => ({
           name: item.name || "Item",
           quantity: `${item.quantity || 1} unit`,
           price: item.price || 0,
           item_name: item.name,
           qty: item.quantity || 1,
           amount: item.total || item.price || 0,
      }));

      const transformedBill = {
        id: bill.id,
        bill_number: bill.billnumber || `B${bill.id}`,
        total_amount: bill.totalamount || bill.amount || 0,
        table_charges: bill.tablecharges || 0,
        menu_charges: bill.menucharges || 0,
        session_duration: bill.sessionduration || 0,
        status: bill.status,
        customer_name: bill.customername || "Unknown Customer",
        customer_phone: bill.customerphone || "+91 XXXXXXXXXX",
        items_summary: itemsSummary,
        order_items: orderItemsFormatted,
        table_info: {
          name: table ? table.name : "Unknown Table",
          game_name: gameName,
        },
        wallet_amount: bill.wallet_amount || 0,
        order_amount: bill.totalamount || 0,
        advance_payment: details.advance_payment || 0, // Expose advance payment
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
  authorize("staff", "owner", "admin", "manager"),
  async (req, res) => {
    try {
      const where = addStationFilter({ id: req.params.id }, req.stationId);
      const bill = await Bill.findOne({ where });
      if (!bill) return res.status(404).json({ error: "Bill not found" });

      if (bill.status === "paid") {
        return res.status(400).json({ error: "Bill is already paid" });
      }

      const { paymentMethod } = req.body;

      await Bill.update(
        { 
            status: "paid", 
            paidat: new Date(),
            paymentmethod: paymentMethod || "cash"
        },
        { where: { id: bill.id } }
      );

      res.json({
        success: true,
        message: "Bill paid successfully",
        bill: {
          id: bill.id,
          status: bill.status,
          total_amount: bill.totalamount,
          paid_at: bill.paidat,
        },
        // ...
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
  authorize("staff", "owner", "admin", "manager"),
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

      console.log("DEBUG: Bill Create Body:", JSON.stringify(req.body, null, 2));
      console.log("DEBUG: Selected Menu Items:", selected_menu_items);

      // 1. Calculate table charges
      let table_charges = 0;
      let actualPricePerMin = 0;
      let actualFrameCharges = 0;

      if (table_id && (session_duration > 0 || frame_charges > 0)) {
        const tableWhere = addStationFilter({ id: table_id }, req.stationId);
        const table = await TableAsset.findOne({ where: tableWhere });
        if (!table) {
          return res.status(404).json({ error: "Table not found" });
        }

        // Use provided price per min, or fallback to table's price
        actualPricePerMin =
          table_price_per_min !== undefined
            ? Number(table_price_per_min)
            : Number(table.pricePerMin || 0);

        // Only use frame charges if explicitly provided (not from table defaults)
        // frame_charges of 0 means no frame charges, don't fallback to table.frameCharge
        actualFrameCharges =
          frame_charges !== undefined ? Number(frame_charges) : 0;

        table_charges =
          session_duration * actualPricePerMin + actualFrameCharges;
        
        // Ensure table charges reflect frame mode correctly if session_duration is 0 but we have frame charges
        // (The formula above works if duration is 0, but good to be explicit about logging)
        
        console.log("DEBUG: Table Charges Calc:", {
            session_duration,
            actualPricePerMin,
            actualFrameCharges,
            table_charges
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
          console.log(`DEBUG: Item ${menuItem.name}, Price: ${menuItem.price}, Qty: ${quantity}, Total: ${itemTotal}`);

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
      // Check if it's frame mode (implied by frame_charges > 0 and duration near 0, or explicit booking_type logic if we had it)
      // Since we don't have explicit booking_type in body here, we infer.
      const isFrameMode = frame_charges > 0 && session_duration === 0;
      const tableChargeLabel = isFrameMode 
          ? `Table charges (${req.body.frame_count || '?'} frames)`
          : `Table charges (${session_duration} min)`;

      const items_summary =
        [
          table_id ? tableChargeLabel : null,
          ...bill_items.map((item) => `${item.name} x${item.quantity}`),
        ]
          .filter(Boolean)
          .join(", ") || "Service charges";


      // Fetch session data for accurate revenue tracking (source/type)
      let bookingSource = 'dashboard';
      let bookingType = 'timer';
      if (session_id) {
          try {
             // Retrieve session from DB if possible using model helper (or raw Supabase if needed)
             // Using defined model:
             const session = await ActiveTable.findByPk(session_id);
             if (session) {
                 bookingSource = session.bookingsource; 
                 bookingType = session.bookingtype || 'timer';

                 // Fallback: Check Linked Order if source missing in ActiveTable
                 if (!bookingSource) {
                     const linkedOrder = await Order.findOne({ where: { active_id: session_id } }); // Note: Order uses active_id fk usually, but check schema
                     // Schema says: `active_id` int in Orders table.
                     if (linkedOrder && linkedOrder.order_source) {
                         bookingSource = linkedOrder.order_source;
                     }
                 }
                 // Final default
                 bookingSource = bookingSource || 'dashboard';
             }
          } catch (e) {
             console.log("Error fetching session for bill details:", e);
          }
      }

      // 6. Create the bill with station_id
      const billData = addStationToData(
        {
          billnumber: bill_number, // Mapped to lowercase schema
          customername: customer_name,
          customerphone: customer_phone,
          tableid: table_id,
          sessionid: session_id,
          tablecharges: table_charges,
          menucharges: menu_charges,
          totalamount: total_amount,
          status: "pending",
          billitems: bill_items,
          itemssummary: items_summary,
          sessionduration: session_duration,
          details: JSON.stringify({
            booking_time,
            table_price_per_min: actualPricePerMin,
            frame_charges: actualFrameCharges,
            advance_payment: req.body.advance_payment || 0,
            booking_source: bookingSource, // Tracked!
            booking_type: bookingType, // Tracked!
            calculation_breakdown: {
              table_charges,
              menu_charges,
              total_amount,
              session_duration,
            },
          }),
        },
        req.stationId
      );

      // Add created_by manually before creation (not part of helper)
      billData.created_by = req.user.id;

      // Check if fully paid via advance payment
      const advancePayment = Number(req.body.advance_payment || 0);
      if (advancePayment >= total_amount && total_amount > 0) {
          billData.status = 'paid';
          billData.paidat = new Date();
      }

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
        if (menuItem && menuItem.isavailable) {
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

export default router;
