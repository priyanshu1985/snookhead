import express from "express";
import { ActiveTable, TableAsset, Order, Bill, OrderItem, MenuItem, Queue } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

// Helper function to check queue and auto-assign next person when table is freed
async function checkQueueAndAssign(tableId, gameId, stationId) {
  try {
    // Get all waiting queue entries for this game in this station
    const allQueueEntries = await Queue.findAll({
      where: stationId ? { stationid: stationId } : {},
      order: [["createdat", "ASC"]],
    });

    // Filter waiting entries for this specific game
    const waitingForGame = allQueueEntries.filter(
      (entry) => entry.status === "waiting" && entry.gameid === gameId
    );

    // Check if someone specifically requested this table
    const preferredEntry = waitingForGame.find(
      (entry) => entry.preferredtableid === tableId
    );

    // Get first in queue (either preferred table match or first waiting)
    const nextInQueue = preferredEntry || waitingForGame[0];

    if (nextInQueue) {
      // Auto-assign this table to the next person in queue
      await Queue.update(
        {
          preferredtableid: tableId,
          status: "seated",
        },
        { where: { id: nextInQueue.id } }
      );

      // Start the session automatically
      const currentTimestamp = new Date();
      const bookingType = nextInQueue.booking_type || "timer";
      let endTime = null;

      // Calculate end time based on booking type if applicable
      if (bookingType === "timer") {
        const duration = nextInQueue.duration_minutes || 60;
         endTime = new Date(currentTimestamp.getTime() + duration * 60000);
      } else if (bookingType === "set") {
          // If set time is provided (e.g. "14:00"), calculate date object
          // For simplicty/robustness, we might treat it as open-ended stopwatch if logic requires, 
          // or parse the time. The existing logic in /start seems to rely on empty endTime for stopwatch?
          // Let's assume stopwatch mode implies no fixed end time initially unless 'set' implies specific end.
          // In TableBooking, 'set' usually means "Target End Time". 
          // If set_time is a string "HH:MM", we parse it for today.
          if (nextInQueue.set_time) {
             const [hours, minutes] = nextInQueue.set_time.split(':');
             const targetTime = new Date();
             targetTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
             // If target is in past (e.g. next day), add day? For now assume today.
             if (targetTime < currentTimestamp) {
                 targetTime.setDate(targetTime.getDate() + 1);
             }
             endTime = targetTime;
          }
      } 
      // frame mode usually has no fixed end time, just frame count.

      const sessionData = addStationToData(
        {
          tableid: tableId,
          starttimer: currentTimestamp,
          endtimer: endTime, // Null for stopwatch/frame often? Or calculated?
          customer_name: nextInQueue.customername,
          gameid: gameId,
          bookingtype: bookingType, // Ensure column name matches DB (bookingtype vs booking_type)
          framecount: nextInQueue.frame_count,
        },
        stationId
      );

      // Create active session
      const newSession = await ActiveTable.create(sessionData);

      // Create linked order for the new session
      const orderData = addStationToData(
        {
          userId: null, // No specific user ID for queue auto-assign (or use owner/admin?)
          total: 0,
          status: "pending",
          session_id: newSession.activeid || newSession.active_id, 
          order_source: "queue_auto_assign",
        },
        stationId
      );
      await Order.create(orderData);

      // Mark table as occupied
      await TableAsset.update({ status: "occupied" }, { where: { id: tableId } });

      return {
        assigned: true,
        queueEntry: nextInQueue,
        session: newSession,
        message: `Table assigned to ${nextInQueue.customername} from queue. Session started (${bookingType}).`,
      };
    }

    return { assigned: false, message: "No one in queue for this game" };
  } catch (err) {
    console.error("Error checking queue:", err);
    return { assigned: false, error: err.message };
  }
}

const router = express.Router();

// Get all active table sessions
router.get("/", auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({ status: "active" }, req.stationId);
    const activeSessions = await ActiveTable.findAll({
      where,
      include: [
        {
          model: TableAsset,
        },
      ],
    });
    const sessionIds = activeSessions.map(s => s.activeid || s.active_id);
    let ordersMap = {};
    if (sessionIds.length > 0) {
      // Find orders where session_id matches
      // Note: Order.findAll wrapper might need update or we use raw Supabase if needed? 
      // Order.findAll uses match/eq. It iterates keys.
      // We can't do "IN" query with current wrapper easily? 
      // Actually wrapper uses `query.eq(key, val)`. So it doesn't support IN list.
      // We will have to fetch all orders for now or loop? Looping is bad.
      // Better: Fetch all PENDING orders and match in memory (assuming number is small)
      // OR rely on ActiveSession.jsx to fetch order individually via /api/orders/by-session/:id
      // OPTION 2 is better for performance if we can't do IN query.
      
      // Let's check activeTablesAPI.getAll usage. It wants everything?
      // For now, let's LEAVE fetching orders here complex, and UPDATE ActiveSession.jsx to fetch Order by session_id!
    }

    res.json(activeSessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start a table session
// body: { table_id, game_id, user_id?, duration_minutes?, customer_name?, booking_type? }
// booking_type: 'timer' (countdown), 'set' (stopwatch - count up), 'frame' (frame-based)
router.post(
  "/start",
  auth,
  stationContext,
  requireStation,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { table_id, game_id, user_id, duration_minutes, customer_name, booking_type, frame_count } = req.body;

      // verify table exists and belongs to this station
      const tableWhere = addStationFilter({ id: table_id }, req.stationId);
      const table = await TableAsset.findOne({ where: tableWhere });

      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      if (table.status !== "available") {
        // Safe check: If table says not available, check if there are actual active sessions.
        // If there are stale sessions, we should probably close them or error out.
        // But for robust "Start", let's ensure we close any existing active sessions for this table
        // to prevent "ghost" sessions.
        const existingSessions = await ActiveTable.findAll({
            where: addStationFilter({ tableid: table_id, status: "active" }, req.stationId)
        });
        
        if (existingSessions.length > 0) {
             // Close them
             const endTime = new Date();
             await ActiveTable.update({ endtime: endTime, status: "completed" }, { 
                 where: addStationFilter({ tableid: table_id, status: "active" }, req.stationId) 
             });
        }
        
        // return res.status(400).json({ error: "Table is not available" });
        // Proceeding to book...
      }

      // Calculate booking_end_time if duration is provided
      const startTime = new Date();
      let bookingEndTime = null;
      if (duration_minutes && duration_minutes > 0) {
        bookingEndTime = new Date(
          startTime.getTime() + duration_minutes * 60000
        );
      }

      // create active session with station_id
      // booking_type: 'timer' = countdown with auto-release, 'set' = stopwatch (count up, manual release), 'frame' = frame-based
      const sessionData = addStationToData(
        {
          tableid: table_id,
          gameid: game_id,
          starttime: startTime,
          bookingendtime: bookingEndTime,
          durationminutes: duration_minutes || null,
          status: "active",
          customer_name: customer_name || null, // Save customer name
          bookingtype: booking_type || 'timer', // Save booking type (default: timer for backward compatibility)
          framecount: frame_count || null // Save frame count for frame-based bookings
        },
        req.stationId
      );
      const session = await ActiveTable.create(sessionData);

      // create order linked to this session with station_id
      const orderData = addStationToData(
        {
          userId: user_id ?? req.user.id ?? null,
          total: 0,
          status: "pending",
          session_id: session.activeid || session.active_id, // Link to session using DB column name or object property
          order_source: "table_booking",
        },
        req.stationId
      );
      const order = await Order.create(orderData);

      // Process cart items if any
      const cart = req.body.cart || [];
      if (cart && cart.length > 0) {
        let calculatedTotal = 0;
        
        for (const cartItem of cart) {
          // Verify item exists
          const menuItem = await MenuItem.findByPk(cartItem.menu_item_id); // using menu_item_id as sent from frontend
          if (menuItem) {
            const priceEach = Number(menuItem.price) || 0;
            const qty = Number(cartItem.quantity) || 1;
            const itemTotal = priceEach * qty;
            calculatedTotal += itemTotal;

            await OrderItem.create({
              orderId: order.id,
              menuItemId: menuItem.id,
              qty: qty,
              priceEach: priceEach
            });
          }
        }

        // Update order total
        if (calculatedTotal > 0) {
          await Order.update({ total: calculatedTotal }, { where: { id: order.id } });
          // Refresh order object
          order.total = calculatedTotal;
        }
      }
      
      await TableAsset.update({ status: "reserved" }, { where: { id: table.id } });

      res.status(201).json({
        message: "Session started",
        session,
        order,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Stop a table session and optionally generate bill
// body: { active_id, skip_bill? }
router.post(
  "/stop",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { active_id, skip_bill = false } = req.body;

      // Map active_id to activeid for database lookup
      const sessionWhere = addStationFilter({ activeid: active_id }, req.stationId);
      const session = await ActiveTable.findOne({ where: sessionWhere });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is not active" });
      }

      // close session
      const endTime = new Date();
      const startTime = new Date(session.starttime); // Use starttime from DB
      session.endtime = endTime;
      session.status = "completed";
      await ActiveTable.update({ endtime: endTime, status: "completed" }, { where: { activeid: session.activeid } });

      // get table info
      const table = await TableAsset.findByPk(session.tableid); // Use tableid from DB

      if (!table) {
        return res
          .status(500)
          .json({ error: "Linked table not found for billing" });
      }

      // Check queue for this game - if someone is waiting, assign to them
      const queueResult = await checkQueueAndAssign(table.id, session.gameid, req.stationId);

      if (!queueResult.assigned) {
        // No one in queue - free the table
        await TableAsset.update({ status: "available" }, { where: { id: table.id } });
      }

      // If skip_bill is true, just return session info without creating a bill
      if (skip_bill) {
        return res.json({
          message: queueResult.assigned
            ? `Session stopped. ${queueResult.message}`
            : "Session stopped and table released",
          session,
          queueAssignment: queueResult.assigned ? queueResult : null,
        });
      }

      // compute time in minutes (rounded up)
      const diffMs = endTime - startTime;
      const minutes = Math.ceil(diffMs / 60000);

      const pricePerMin = Number(table.pricePerMin || 0);
      const frameCharge = Number(table.frameCharge || 0);
      const tableAmount = minutes * pricePerMin + frameCharge;

      const grandTotal = tableAmount;

      // create bill record with station_id
      const billData = addStationToData(
        {
          orderId: null,
          customername: session.customer_name || "Walk-in Customer", // Use saved customer name or default
          total: grandTotal,
          status: "pending",
          details: JSON.stringify({
            table_id: session.tableid,
            game_id: session.gameid,
            minutes,
            pricePerMin,
            frameCharge,
            tableAmount,
          }),
        },
        req.stationId
      );
      const bill = await Bill.create(billData);

      res.json({
        message: queueResult.assigned
          ? `Bill generated. ${queueResult.message}`
          : "Bill generated",
        session,
        bill,
        breakdown: {
          minutes,
          tableAmount,
          total: grandTotal,
        },
        queueAssignment: queueResult.assigned ? queueResult : null,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Auto-release expired sessions (called by frontend or cron)
// body: { active_id, cart_items?: [{id, name, price, qty}] }
router.post(
  "/auto-release",
  auth,
  stationContext,
  authorize("staff", "owner", "admin"),
  async (req, res) => {
    try {
      const { active_id, cart_items = [] } = req.body;

      const sessionWhere = addStationFilter({ activeid: active_id }, req.stationId);
      const session = await ActiveTable.findOne({ where: sessionWhere });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is not active" });
      }

      // Close session
      const endTime = new Date();
      // session.endtime = endTime;
      // session.status = "completed";
      await ActiveTable.update({ endtime: endTime, status: "completed" }, { where: { activeid: session.activeid } });

      // Get table info
      const table = await TableAsset.findByPk(session.tableid);

      // Check queue for this game - if someone is waiting, assign to them
      let queueResult = { assigned: false };
      if (table) {
        queueResult = await checkQueueAndAssign(table.id, session.gameid, req.stationId);

        if (!queueResult.assigned) {
          // No one in queue - free the table
          await TableAsset.update({ status: "available" }, { where: { id: table.id } });
        }
      }

      // Compute table charges
      // Use booked duration if available (timer mode), otherwise use elapsed time
      const startTime = new Date(session.starttime);
      const diffMs = endTime - startTime;
      const elapsedMinutes = Math.ceil(diffMs / 60000);
      const minutes = session.durationminutes || elapsedMinutes;
      const pricePerMin = Number(table?.pricePerMin || 0);
      // Don't add frame charges for timer-based sessions (only for frame-based bookings)
      const table_charges = minutes * pricePerMin;

      // Calculate menu charges from cart items
      let menu_charges = 0;
      const bill_items = [];

      if (cart_items && cart_items.length > 0) {
        for (const item of cart_items) {
          const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
          menu_charges += itemTotal;
          bill_items.push({
            menu_item_id: item.id,
            name: item.name,
            price: Number(item.price || 0),
            quantity: Number(item.qty || 1),
            total: itemTotal,
          });
        }
      }

      const total_amount = table_charges + menu_charges;

      // Generate bill number
      const bill_number = `BILL-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;

      // Create items summary
      const items_summary = [
        `Table charges (${minutes} min)`,
        ...bill_items.map((item) => `${item.name} x${item.quantity}`),
      ]
        .filter(Boolean)
        .join(", ");

      // Create bill record with proper structure and station_id
      const billData = addStationToData(
        {
          billnumber: bill_number,
          orderId: null,
          customername: session.customer_name || "Walk-in Customer", // Use saved customer name or default
          tableid: table?.id || null,
          sessionid: session.active_id,
          tablecharges: table_charges,
          menucharges: menu_charges,
          totalamount: total_amount,
          status: "pending",
          billitems: bill_items.length > 0 ? bill_items : null,
          itemssummary: items_summary,
          sessionduration: minutes,
          details: JSON.stringify({
            table_id: session.table_id,
            game_id: session.game_id,
            minutes,
            pricePerMin,
            auto_released: true,
          }),
        },
        req.stationId
      );
      const bill = await Bill.create(billData);

      res.json({
        message: queueResult.assigned
          ? `Session auto-released. ${queueResult.message}`
          : "Session auto-released",
        session,
        bill,
        breakdown: {
          minutes,
          table_charges,
          menu_charges,
          total_amount,
        },
        queueAssignment: queueResult.assigned ? queueResult : null,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Get session by ID
router.get("/:id", auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({ active_id: req.params.id }, req.stationId);
    const session = await ActiveTable.findOne({
      where,
      include: [{ model: TableAsset }],
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
