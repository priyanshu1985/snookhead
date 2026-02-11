import {
  ActiveTable,
  TableAsset,
  Order,
  Queue,
  Reservation,
} from "../models/index.js";
import {
  addStationFilter,
  addStationToData,
} from "../middleware/stationContext.js";

// Helper function to check queue and auto-assign next person when table is freed
export async function checkQueueAndAssign(tableId, gameId, stationId) {
  try {
    // Fallback: If gameId is missing, fetch it from the table asset
    if (!gameId) {
      try {
        const table = await TableAsset.findByPk(tableId);
        if (table && table.game_id) {
          gameId = table.game_id;
          console.log(`[QueueManager] Resolved gameId ${gameId} from Table ${tableId}`);
        }
      } catch (e) {
        console.error("[QueueManager] Failed to fetch table for game fallback:", e);
      }
    }

    if (!gameId) {
        console.warn(`[QueueManager] Missing gameId for Table ${tableId}, cannot check queue.`);
        return { assigned: false, message: "Missing game ID" };
    }

    // Get all waiting queue entries for this game in this station
    console.log(
      `[QueueManager] Checking queue for Table ${tableId}, Game ${gameId}`,
    );
    const allQueueEntries = await Queue.findAll({
      where: stationId ? { stationid: stationId } : {},
      order: [["createdat", "ASC"]],
    });
    console.log(
      `[QueueManager] Found ${allQueueEntries.length} total queue entries`,
    );

    // Filter waiting entries for this specific game
    const waitingForGame = allQueueEntries.filter(
      (entry) =>
        entry.status === "waiting" && String(entry.gameid) === String(gameId),
    );
    console.log(
      `[QueueManager] ${waitingForGame.length} entries waiting for Game ${gameId}`,
    );

    // Check if someone specifically requested this table
    const preferredEntry = waitingForGame.find(
      (entry) =>
        entry.preferredtableid &&
        String(entry.preferredtableid) === String(tableId),
    );
    if (preferredEntry) {
      console.log(
        `[QueueManager] Found preferred entry: ${preferredEntry.customername} (ID: ${preferredEntry.id})`,
      );
    }

    // Get first in queue (either preferred table match or first waiting)
    const nextInQueue = preferredEntry || waitingForGame[0];
    console.log(
      `[QueueManager] Next in queue: ${nextInQueue ? nextInQueue.customername : "None"}`,
    );

    // Check if there is an imminent reservation for this table
    const tableReservations = await Reservation.findAll({
      where: addStationFilter(
        { tableId: tableId, status: "pending" },
        stationId,
      ),
    });

    const now = new Date();
    // Check for any reservation starting in the next 60 minutes
    // If so, do not auto-assign from queue to avoid conflict
    const conflict = tableReservations.find((r) => {
      const rTime = new Date(
        r.reservationtime || r.reservation_time || r.fromTime,
      );
      const diff = (rTime - now) / 60000;
      return diff > -15 && diff < 60; // Valid overlap window
    });

    if (conflict) {
      console.log(
        `[QueueManager] Skipping queue assignment for Table ${tableId} due to reservation at ${new Date(conflict.fromTime || conflict.reservationtime).toLocaleTimeString()}`,
      );
      return { assigned: false, message: "Table has upcoming reservation" };
    }

    if (nextInQueue) {
      // Start the session automatically
      const currentTimestamp = new Date();
      const bookingType = nextInQueue.booking_type || "timer";
      const durationMinutes = nextInQueue.duration_minutes || null;
      let endTime = null;

      // Calculate end time based on booking type if applicable
      if (bookingType === "timer" && durationMinutes) {
        endTime = new Date(
          currentTimestamp.getTime() + durationMinutes * 60000,
        );
      } else if (bookingType === "set") {
        // If set time is provided (e.g. "14:00"), calculate date object
        if (nextInQueue.set_time) {
          const [hours, minutes] = nextInQueue.set_time.split(":");
          const targetTime = new Date();
          targetTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          // If target is in past, add a day
          if (targetTime < currentTimestamp) {
            targetTime.setDate(targetTime.getDate() + 1);
          }
          endTime = targetTime;
        }
        // If no set_time, it's a stopwatch - no end time
      }
      // frame mode usually has no fixed end time, just frame count.

      const sessionData = addStationToData(
        {
          tableid: tableId,
          starttime: currentTimestamp,
          bookingendtime: endTime,
          durationminutes: durationMinutes,
          customer_name: nextInQueue.customername,
          gameid: gameId,
          bookingtype: bookingType,
          framecount: nextInQueue.frame_count || null,
          status: "active",
          // bookingsource removed
        },
        stationId,
      );

      // Create active session
      const newSession = await ActiveTable.create(sessionData);
      console.log(
        `[QueueManager] Created session ${newSession.activeid} for ${nextInQueue.customername}`,
      );

      // Check for existing pending order linked to this queue entry
      try {
        const existingOrder = await Order.findOne({
          where: { queue_id: nextInQueue.id, status: "pending" },
        });

        if (existingOrder) {
          // Link existing order to new session
          await Order.update(
            {
              session_id: newSession.activeid || newSession.active_id,
              order_source: "queue",
              // detailed items are already in OrderItems
            },
            { where: { id: existingOrder.id } },
          );
          console.log(
            `[QueueManager] Linked existing order ${existingOrder.id} to session ${newSession.activeid}`,
          );
        } else {
          // Create linked order for the new session if none exists
          const orderData = addStationToData(
            {
              userId: null,
              personName: nextInQueue.customername || "Queue Customer",
              total: 0,
              status: "pending",
              session_id: newSession.activeid || newSession.active_id,
              order_source: "queue", 
            },
            stationId,
          );
          await Order.create(orderData);
        }
      } catch (orderErr) {
        console.error("[QueueManager] Failed to create/link order for queue assignment (Non-fatal):", orderErr);
      }

      // Mark queue entry as served (session started)
      try {
          const updateResult = await Queue.update(
            {
              preferredtableid: tableId,
              status: "seated",
            },
            { where: { id: nextInQueue.id } },
          );
          console.log(`[QueueManager] Queue entry ${nextInQueue.id} update result:`, updateResult);
      } catch (qUpdateErr) {
          console.error(`[QueueManager] CRITICAL: Failed to update queue status for ${nextInQueue.id}:`, qUpdateErr);
      }
      
      console.log(
        `[QueueManager] Queue entry ${nextInQueue.id} marked as seated`,
      );

      // Mark table as reserved (consistent with /start route)
      await TableAsset.update(
        { status: "reserved" },
        { where: { id: tableId } },
      );

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
