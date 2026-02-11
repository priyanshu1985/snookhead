import express from "express";
import {
  ActiveTable,
  TableAsset,
  Order,
  Bill,
  OrderItem,
  MenuItem,
  Queue,
  Reservation,
} from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";
import {
  stationContext,
  requireStation,
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";
import { checkTimeConflicts } from "../middleware/timeConflicts.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { checkQueueAndAssign } from "../utils/queueManager.js";

const router = express.Router();

// Get all active table sessions
router.get("/", auth, stationContext, async (req, res) => {
  try {
    // Filter for active sessions only by default if no other status provided
    // This prevents fetching entire history
    const baseFilter = { status: "active" };

    // Allow overriding status via query param if needed (e.g. for reports later) but default to active
    const where = addStationFilter(
      { ...baseFilter, ...req.query },
      req.stationId,
    );

    if (req.needsStationSetup) {
      return res.json([]);
    }

    const activeSessions = await ActiveTable.findAll({
      where,
      include: [
        {
          model: TableAsset,
        },
      ],
    });
    const sessionIds = activeSessions.map((s) => s.activeid || s.active_id);
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
  authorize("staff", "owner", "admin", "manager"),
  checkTimeConflicts, // Add conflict checking middleware
  async (req, res) => {
    try {
      const {
        table_id,
        game_id,
        user_id,
        duration_minutes,
        customer_name,
        booking_type,
        frame_count,
        food_orders,
      } = req.body;

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
          where: addStationFilter(
            { tableid: table_id, status: "active" },
            req.stationId,
          ),
        });

        if (existingSessions.length > 0) {
          // Close them
          const endTime = new Date();
          await ActiveTable.update(
            { endtime: endTime, status: "completed" },
            {
              where: addStationFilter(
                { tableid: table_id, status: "active" },
                req.stationId,
              ),
            },
          );
        }
      }

      // --- CHECK FOR RESERVATION CONFLICT ---
      // Before starting, ensure this doesn't conflict with a pending reservation for THIS table
      const now = new Date();
      // Estimate end time of this NEW session
      // If duration is not provided, assume at least 30 mins to avoid immediate conflict?
      // Or just check if "now" is reserved.
      const estimatedDuration = duration_minutes || 60;
      const proposedEnd = new Date(now.getTime() + estimatedDuration * 60000);

      const tableReservations = await Reservation.findAll({
        where: addStationFilter(
          { tableId: table_id, status: "pending" },
          req.stationId,
        ),
      });

      let conflictingReservation = null;
      
      // Debug logging to file
      const logPath = path.join(__dirname, '..', 'debug_conflict.log');
      const debugData = {
          body: req.body,
          tableId: table_id,
          checkingAgainst: tableReservations.map(r => ({ id: r.id, time: r.reservationtime }))
      };
      if (fs.existsSync(path.dirname(logPath))) {
          fs.appendFileSync(logPath, JSON.stringify(debugData, null, 2) + '\n\n');
      }

      console.log(`[Start Session] Request Body:`, JSON.stringify(req.body, null, 2));

      for (const r of tableReservations) {
          // Check if this is the SAME reservation we are fulfilling
          // Use loose equality for safety or explicit string conversion
          const isSelf = req.body.reservationId && (String(r.id) === String(req.body.reservationId));
          
          if (isSelf) {
               console.log(`[Conflict Check] Skipping self (Res ID ${r.id})`);
               continue; // Valid fulfillment, ignore this reservation
          }
          
          const rTime = new Date(r.reservationtime || r.reservation_time || r.fromTime);
          if (rTime < new Date(now.getTime() - 40 * 60000)) {
            console.log(`[Conflict Check] Skipping stale reservation ${r.id} (older than 40m)`);
            continue; // Ignore stale (older than 40m)
          }

          // Conflict Logic:
          // Does this reservation start overlaps with the session we are about to start?
          // Session: Now -> Now + Duration
          // Reservation: rTime
          // If reservation starts within our proposed session window, it's a conflict
          if (rTime < proposedEnd && rTime > new Date(now.getTime() - 15 * 60000)) { // Overlap check
              console.log(`[Conflict Detected] Res ${r.id} (${rTime.toLocaleTimeString()}) overlaps with session end ${proposedEnd.toLocaleTimeString()}`);
              conflictingReservation = r; // Mark as conflicting
              break; // Found a conflict, no need to check further
          }
      }

      if (conflictingReservation) {
        const rTime = new Date(
          conflictingReservation.reservationtime ||
            conflictingReservation.reservationtime ||
            conflictingReservation.fromTime,
        );
        return res.status(409).json({
          error: "Conflict",
          message: `Cannot start session. Table is reserved at ${rTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} for ${conflictingReservation.customerName}.`,
          reservationId: conflictingReservation.id,
        });
      }
      // --------------------------------------

      // Calculate booking_end_time if duration is provided
      const startTime = new Date();
      let bookingEndTime = null;
      if (duration_minutes && duration_minutes > 0) {
        bookingEndTime = new Date(
          startTime.getTime() + duration_minutes * 60000,
        );
      }

      // Determine booking source
      let bookingSource = req.body.booking_source;
      let queueEntry = null;

      if (!bookingSource) {
        if (req.body.reservationId) {
          bookingSource = "reservation";
        } else {
          // ONLY check queue if we are not explicitly starting a session for a specific customer
          // If customer_name is provided (e.g. from Dashboard "Start Session" modal), we assume it's a direct walk-in/manual booking
          if (customer_name) {
            bookingSource = "dashboard";
          } else {
            // Fallback: Check if table was assigned via queue (status='seated')
            // This handles the "Start" button on a table that was already "seated" from the queue
            queueEntry = await Queue.findOne({
              where: addStationFilter(
                { preferredtableid: table_id, status: "seated" },
                req.stationId,
              ),
            });
            if (queueEntry) {
              bookingSource = "queue";
            } else {
              bookingSource = "dashboard";
            }
          }
        }
      }

      // create active session with station_id
      // booking_type: 'timer' = countdown with auto-release, 'set' = stopwatch (count up, manual release), 'frame' = frame-based
      const sessionData = addStationToData(
        {
          tableid: table_id,
          gameid: game_id,
          starttime: startTime,
          bookingendtime: bookingEndTime,
          durationminutes:
            duration_minutes ||
            (queueEntry ? queueEntry.duration_minutes : null),
          status: "active",
          customer_name:
            customer_name ||
            (queueEntry
              ? queueEntry.customername || queueEntry.customer_name
              : null), // Transfer queue customer name
          bookingtype:
            booking_type || (queueEntry ? queueEntry.booking_type : "timer"), // Transfer queue booking type
          framecount:
            frame_count || (queueEntry ? queueEntry.frame_count : null),
          // bookingsource removed due to schema constraint
          created_by: req.user.id, // Track who started the session
          food_orders:
            food_orders ||
            (queueEntry ? queueEntry.food_orders : []) ||
            JSON.stringify([]), // Persist initial or queue food orders
        },
        req.stationId,
      );
      const session = await ActiveTable.create(sessionData);
      
      // Update Reservation Status if applicable
      if (req.body.reservationId) {
          try {
             await Reservation.update(
                 { status: 'active' },
                 { where: { id: req.body.reservationId } }
             );
             console.log(`[Start Session] Set Reservation ${req.body.reservationId} to active`);
          } catch (resErr) {
             console.error("Failed to update reservation status:", resErr);
          }
      }

      // Check for existing pending order if coming from queue
      let existingOrder = null;
      if (queueEntry) {
        existingOrder = await Order.findOne({
          where: { queue_id: queueEntry.id, status: "pending" },
        });
      }

      let order;
      if (existingOrder) {
        // Link existing order
        await Order.update(
          {
            session_id: session.activeid || session.active_id,
            order_source: bookingSource,
            personName: customer_name || "Table Customer", // Update name if provided
          },
          { where: { id: existingOrder.id } },
        );
        order = await Order.findByPk(existingOrder.id);
      } else {
        // create order linked to this session with station_id
        const orderData = addStationToData(
          {
            userId: user_id ?? req.user.id ?? null,
            personName: customer_name || "Table Customer",
            total: 0,
            status: "pending",
            session_id: session.activeid || session.active_id, // Link to session using DB column name or object property
            order_source: bookingSource, // Persist source here
            created_by: req.user.id,
          },
          req.stationId,
        );
        order = await Order.create(orderData);
      }

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
              priceEach: priceEach,
            });

            // Decrease stock
            if (menuItem.stock !== undefined) {
              const newStock = Math.max(0, menuItem.stock - qty);
              await MenuItem.update(
                { stock: newStock },
                { where: { id: menuItem.id } },
              );
            }
          }
        }

        // Update order total
        if (calculatedTotal > 0) {
          await Order.update(
            { total: calculatedTotal },
            { where: { id: order.id } },
          );
          // Refresh order object
          order.total = calculatedTotal;
        }
      }

      await TableAsset.update(
        { status: "reserved" }, // Use 'reserved' as 'occupied' is not in ENUM
        { where: { id: table.id } },
      );

      res.status(201).json({
        message: "Session started",
        session,
        order,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
);

// Stop a table session and optionally generate bill
// body: { active_id, skip_bill? }
router.post(
  "/stop",
  auth,
  stationContext,
  authorize("staff", "owner", "admin", "manager"),
  async (req, res) => {
    try {
      const { active_id, skip_bill = false } = req.body;

      // Map active_id to activeid for database lookup
      const sessionWhere = addStationFilter(
        { activeid: active_id },
        req.stationId,
      );
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
      await ActiveTable.update(
        { endtime: endTime, status: "completed" },
        { where: { activeid: session.activeid } },
      );

      // get table info
      const table = await TableAsset.findByPk(session.tableid); // Use tableid from DB

      if (!table) {
        return res
          .status(500)
          .json({ error: "Linked table not found for billing" });
      }

      // Check queue for this game - if someone is waiting, assign to them
      const queueResult = await checkQueueAndAssign(
        table.id,
        session.gameid,
        req.stationId,
      );

      if (!queueResult.assigned) {
        // No one in queue - free the table
        await TableAsset.update(
          { status: "available" },
          { where: { id: table.id } },
        );
      }

      // --- NEW: Sync Reservation Status ---
      // Find any active/assigned/pending reservation for this table that overlaps 'now'
      // effectively closing the reservation that "caused" this session.
      const now = new Date();
      const linkedReservation = await Reservation.findOne({
        where: addStationFilter(
          {
            tableId: table.id,
            // We want reservations that are possibly blocking this table.
            // Status check matching typical flows.
          },
          req.stationId,
        ),
      });

      // Since findOne with complex OR/Time logic is hard via simple wrapper,
      // let's fetch all active/pending for this table and filter in JS (safer given helper limitations)
      const allTableRes = await Reservation.findAll({
        where: addStationFilter({ tableId: table.id }, req.stationId),
      });

      const activeRes = allTableRes.find(
        (r) =>
          (r.status === "active" ||
            r.status === "pending" ||
            r.status === "assigned") &&
          new Date(r.fromTime || r.reservationtime) <= now &&
          // end time is in future or it's currently active
          (r.toTime ? new Date(r.toTime) > now : true),
      );

      if (activeRes) {
        await Reservation.update(
          {
            status: "cancelled", // Use 'cancelled' as 'completed' is not a valid enum value
            toTime: now, // Clamp end time to actual session end
          },
          { where: { id: activeRes.id } },
        );
        console.log(
          `[SessionStop] Auto-cancelled reservation ${activeRes.id} to release table`,
        );
      }
      // ------------------------------------

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
        req.stationId,
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
  },
);

// Auto-release expired sessions (called by frontend or cron)
// body: { active_id, cart_items?: [{id, name, price, qty}] }
router.post(
  "/auto-release",
  auth,
  stationContext,
  authorize("staff", "owner", "admin", "manager"),
  async (req, res) => {
    try {
      const { active_id, cart_items = [] } = req.body;

      const sessionWhere = addStationFilter(
        { activeid: active_id },
        req.stationId,
      );
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
      await ActiveTable.update(
        { endtime: endTime, status: "completed" },
        { where: { activeid: session.activeid } },
      );

      // Get table info
      const table = await TableAsset.findByPk(session.tableid);

      // Check queue for this game - if someone is waiting, assign to them
      let queueResult = { assigned: false };
      if (table) {
        queueResult = await checkQueueAndAssign(
          table.id,
          session.gameid,
          req.stationId,
        );

        if (!queueResult.assigned) {
          // No one in queue - free the table
          await TableAsset.update(
            { status: "available" },
            { where: { id: table.id } },
          );
        }
      }

      // --- NEW: Sync Reservation Status (Auto Release) ---
      if (table) {
        const now = new Date();
        const allTableRes = await Reservation.findAll({
          where: addStationFilter({ tableId: table.id }, req.stationId),
        });

        const activeRes = allTableRes.find(
          (r) =>
            (r.status === "active" ||
              r.status === "pending" ||
              r.status === "assigned") &&
            new Date(r.fromTime || r.reservationtime) <= now &&
            (r.toTime ? new Date(r.toTime) > now : true),
        );

        if (activeRes) {
          await Reservation.update(
            {
              status: "cancelled", // Use 'cancelled' as 'completed' is not a valid enum value
              toTime: now,
            },
            { where: { id: activeRes.id } },
          );
          console.log(
            `[AutoRelease] Auto-cancelled reservation ${activeRes.id} to release table`,
          );
        }
      }
      // ---------------------------------------------------

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
          // Fetch menu item to update stock
          const menuWhere = addStationFilter({ id: item.id }, req.stationId);
          const menuItem = await MenuItem.findOne({ where: menuWhere });

          if (menuItem && menuItem.stock !== undefined) {
            const qty = Number(item.qty || 1);
            const newStock = Math.max(0, menuItem.stock - qty);
            await MenuItem.update(
              { stock: newStock },
              { where: { id: menuItem.id } },
            );
          }

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
            advance_payment: req.body.advance_payment || 0,
          }),
        },
        req.stationId,
      );

      // Check if fully paid via advance payment
      const advancePayment = Number(req.body.advance_payment || 0);
      if (advancePayment >= total_amount && total_amount > 0) {
        billData.status = "paid";
        billData.paidat = new Date();
      }

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
  },
);

// Update a session (e.g. add frames, add time)
router.put(
  "/:id",
  auth,
  stationContext,
  authorize("staff", "owner", "admin", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Map active_id to activeid for database lookup if needed
      // The frontend sends active_id, backend route uses :id

      const sessionWhere = addStationFilter({ activeid: id }, req.stationId);
      const session = await ActiveTable.findOne({ where: sessionWhere });

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Whitelist allowed updates
      const allowedUpdates = {};
      if (updates.frame_count !== undefined)
        allowedUpdates.framecount = updates.frame_count; // REVERTED
      if (updates.booking_end_time !== undefined)
        allowedUpdates.bookingendtime = updates.booking_end_time; // REVERTED
      if (updates.duration_minutes !== undefined)
        allowedUpdates.durationminutes = updates.duration_minutes; // REVERTED
      if (updates.food_orders !== undefined)
        allowedUpdates.food_orders = updates.food_orders; // New persistent cart

      if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      // Perform update
      await ActiveTable.update(allowedUpdates, { where: { activeid: id } });

      // Fetch updated session
      const updatedSession = await ActiveTable.findOne({ where: sessionWhere });

      res.json({ message: "Session updated", session: updatedSession });
    } catch (err) {
      console.error("Update session error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// Get session by ID
router.get("/:id", auth, stationContext, async (req, res) => {
  try {
    const where = addStationFilter({ activeid: req.params.id }, req.stationId);
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
