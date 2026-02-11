// Time Conflict Resolution Service
// Prevents booking collisions across all three entry points:
// 1. Direct table booking
// 2. Queue assignments
// 3. Advance reservations

import { ActiveTable, Reservation, Queue } from "../models/index.js";

class TimeConflictResolver {
  /**
   * Check for time conflicts across all booking sources
   * @param {Object} bookingRequest - The new booking request
   * @param {number} bookingRequest.tableId - Table ID
   * @param {Date} bookingRequest.startTime - Start time (defaults to now)
   * @param {number} bookingRequest.durationMinutes - Duration in minutes (required for timed bookings)
   * @param {Date} bookingRequest.endTime - End time (optional, calculated if duration provided)
   * @param {string} bookingRequest.type - Booking type ('timer', 'set', 'frame', 'reservation', 'queue')
   * @param {number} bookingRequest.stationId - Station ID for multi-tenant filtering
   * @param {number} bookingRequest.excludeId - ID to exclude (for updates)
   * @returns {Object} - Conflict result with details
   */
  static async checkTimeConflicts(bookingRequest) {
    const {
      tableId,
      startTime = new Date(),
      durationMinutes,
      endTime: providedEndTime,
      type = "timer",
      stationId,
      excludeId = null,
    } = bookingRequest;

    // Calculate end time if duration provided
    let endTime = providedEndTime;
    if (durationMinutes && !endTime) {
      endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    }

    const conflicts = {
      hasConflicts: false,
      conflicts: [],
      warnings: [],
      canProceed: true,
      severity: "none", // none, warning, error
    };

    try {
      // 1. Check Active Sessions
      await this._checkActiveSessionConflicts(
        conflicts,
        tableId,
        startTime,
        endTime,
        stationId,
        excludeId,
      );

      // 2. Check Reservations
      await this._checkReservationConflicts(
        conflicts,
        tableId,
        startTime,
        endTime,
        stationId,
        excludeId,
      );

      // 3. Check Queue Assignments (if table has active queue member)
      await this._checkQueueConflicts(
        conflicts,
        tableId,
        startTime,
        endTime,
        stationId,
        excludeId,
      );

      // Determine overall severity
      if (conflicts.conflicts.length > 0) {
        conflicts.hasConflicts = true;
        conflicts.severity = conflicts.conflicts.some(
          (c) => c.severity === "error",
        )
          ? "error"
          : "warning";
        conflicts.canProceed = conflicts.severity !== "error";
      } else if (conflicts.warnings.length > 0) {
        conflicts.severity = "warning";
      }
    } catch (error) {
      console.error("Error checking time conflicts:", error);
      conflicts.hasConflicts = true;
      conflicts.severity = "error";
      conflicts.canProceed = false;
      conflicts.conflicts.push({
        type: "system_error",
        severity: "error",
        message: "Unable to verify booking conflicts. Please try again.",
        details: error.message,
      });
    }

    return conflicts;
  }

  /**
   * Check conflicts with active table sessions
   */
  static async _checkActiveSessionConflicts(
    conflicts,
    tableId,
    startTime,
    endTime,
    stationId,
    excludeId,
  ) {
    const whereClause = {
      tableid: tableId,
      status: "active",
    };

    if (stationId) whereClause.stationid = stationId;

    let activeSessions = await ActiveTable.findAll({
      where: whereClause,
    });

    // Filter out excluded ID if provided
    if (excludeId) {
      // Exclude active session if ID matches (for session updates)
      activeSessions = activeSessions.filter((s) => String(s.activeid) !== String(excludeId));
    }

    for (const session of activeSessions) {
      const sessionStart = new Date(session.starttime);
      const sessionEnd = session.bookingendtime
        ? new Date(session.bookingendtime)
        : session.durationminutes
          ? new Date(sessionStart.getTime() + session.durationminutes * 60000)
          : null;

      // Check for overlap
      if (this._hasTimeOverlap(startTime, endTime, sessionStart, sessionEnd)) {
        const conflictType = sessionEnd ? "exact_overlap" : "open_session";

        conflicts.conflicts.push({
          type: "active_session",
          severity: "error",
          source: "Active Table Session",
          customer: session.customer_name || "Unknown Customer",
          conflictStart: sessionStart,
          conflictEnd: sessionEnd,
          message: sessionEnd
            ? `Table is occupied until ${sessionEnd.toLocaleTimeString()}`
            : "Table is currently in an active session",
          details: {
            sessionId: session.activeid,
            bookingType: session.bookingtype,
            duration: session.durationminutes,
          },
        });
      }
    }
  }

  /**
   * Check conflicts with reservations
   */
  static async _checkReservationConflicts(
    conflicts,
    tableId,
    startTime,
    endTime,
    stationId,
    excludeId,
  ) {
    // For Supabase, we need to query each status separately since it doesn't support array filtering
    const pendingReservations = await Reservation.findAll({
      where: {
        tableId: tableId, // Reverted to camelCase per error hint
        status: "pending",
        ...(stationId ? { stationid: stationId } : {}),
      },
    });

    const activeReservations = await Reservation.findAll({
      where: {
        tableId: tableId, // Reverted to camelCase per error hint
        status: "active",
        ...(stationId ? { stationid: stationId } : {}),
      },
    });

    let reservations = [...pendingReservations, ...activeReservations];

    // Filter out excluded ID if provided
    if (excludeId) {
      reservations = reservations.filter(
        (reservation) => String(reservation.id) !== String(excludeId),
      );
    }

    for (const reservation of reservations) {
      const resStart = new Date(reservation.fromTime);
      const resEnd = reservation.toTime ? new Date(reservation.toTime) : null;

      if (this._hasTimeOverlap(startTime, endTime, resStart, resEnd)) {
        const severity = reservation.status === "active" ? "error" : "warning";

        conflicts.conflicts.push({
          type: "reservation",
          severity,
          source: "Advance Reservation",
          customer: reservation.customerName || "Reserved Customer",
          conflictStart: resStart,
          conflictEnd: resEnd,
          message: resEnd
            ? `Reserved from ${resStart.toLocaleTimeString()} to ${resEnd.toLocaleTimeString()}`
            : `Reserved starting at ${resStart.toLocaleTimeString()}`,
          details: {
            reservationId: reservation.id,
            phone: reservation.customerPhone,
            notes: reservation.notes,
          },
        });
      }
    }
  }

  /**
   * Check conflicts with queue assignments
   */
  static async _checkQueueConflicts(
    conflicts,
    tableId,
    startTime,
    endTime,
    stationId,
    excludeId,
  ) {
    // Query both statuses separately for Supabase compatibility
    const assignedQueue = await Queue.findAll({
      where: {
        preferredtableid: tableId,
        status: "assigned",
        ...(stationId ? { stationid: stationId } : {}),
      },
    });

    const seatedQueue = await Queue.findAll({
      where: {
        preferredtableid: tableId,
        status: "seated",
        ...(stationId ? { stationid: stationId } : {}),
      },
    });

    let queueMembers = [...assignedQueue, ...seatedQueue];

    // Filter out excluded ID if provided
    if (excludeId) {
      queueMembers = queueMembers.filter((member) => String(member.id) !== String(excludeId));
    }

    for (const queueMember of queueMembers) {
      // Queue members create immediate conflict as they're expecting the table
      conflicts.conflicts.push({
        type: "queue_assignment",
        severity: "warning",
        source: "Queue Assignment",
        customer: queueMember.customername,
        conflictStart: startTime,
        conflictEnd: null,
        message: `Table is assigned to queue member: ${queueMember.customername}`,
        details: {
          queueId: queueMember.id,
          phone: queueMember.phone,
          members: queueMember.members,
          waitTime: queueMember.estimated_wait_minutes,
        },
      });
    }
  }

  /**
   * Check if two time ranges overlap
   */
  static _hasTimeOverlap(start1, end1, start2, end2) {
    // Handle open-ended sessions (no end time)
    if (!end1 || !end2) {
      // If either session is open-ended, check if starts overlap
      return (
        (start1 <= start2 && (!end1 || start2 < end1)) ||
        (start2 <= start1 && (!end2 || start1 < end2))
      );
    }

    // Both have end times - standard overlap check
    return start1 < end2 && end1 > start2;
  }

  /**
   * Get user-friendly conflict message
   */
  static getConflictSummary(conflicts) {
    if (!conflicts.hasConflicts) {
      return {
        title: "No Conflicts",
        message: "Table is available for booking.",
        canProceed: true,
      };
    }

    const errorConflicts = conflicts.conflicts.filter(
      (c) => c.severity === "error",
    );
    const warningConflicts = conflicts.conflicts.filter(
      (c) => c.severity === "warning",
    );

    if (errorConflicts.length > 0) {
      const primaryConflict = errorConflicts[0];
      return {
        title: "Booking Conflict",
        message: `Cannot book: ${primaryConflict.message}`,
        details: errorConflicts.map((c) => c.message),
        canProceed: false,
        severity: "error",
      };
    }

    if (warningConflicts.length > 0) {
      const primaryConflict = warningConflicts[0];
      return {
        title: "Booking Warning",
        message: `Potential conflict: ${primaryConflict.message}`,
        details: warningConflicts.map((c) => c.message),
        canProceed: true,
        severity: "warning",
        question: "Do you want to proceed anyway?",
      };
    }

    return {
      title: "Table Available",
      message: "No conflicts detected.",
      canProceed: true,
    };
  }

  /**
   * Suggest alternative time slots
   */
  static async suggestAlternatives(
    tableId,
    requestedStart,
    durationMinutes,
    stationId,
  ) {
    const suggestions = [];
    const now = new Date();
    const searchStart = new Date(
      Math.max(now.getTime(), requestedStart.getTime()),
    );

    // Look for slots in next 3 hours
    for (let i = 0; i < 6; i++) {
      // 30-min intervals
      const slotStart = new Date(searchStart.getTime() + i * 30 * 60000);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      const conflicts = await this.checkTimeConflicts({
        tableId,
        startTime: slotStart,
        endTime: slotEnd,
        durationMinutes,
        stationId,
      });

      if (!conflicts.hasConflicts) {
        suggestions.push({
          startTime: slotStart,
          endTime: slotEnd,
          label: `${slotStart.toLocaleTimeString()} - ${slotEnd.toLocaleTimeString()}`,
        });

        if (suggestions.length >= 3) break; // Max 3 suggestions
      }
    }

    return suggestions;
  }
}

export default TimeConflictResolver;
