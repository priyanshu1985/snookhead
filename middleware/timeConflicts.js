// Time Conflict Middleware
// Automatically checks for booking conflicts in all booking endpoints

import TimeConflictResolver from "../utils/timeConflictResolver.js";

/**
 * Middleware to check time conflicts before processing booking requests
 * Attaches conflict information to req.conflicts for route handlers to use
 */
const checkTimeConflicts = async (req, res, next) => {
  try {
    const { body, params } = req;

    // Extract booking details from different route patterns
    const bookingRequest = {
      tableId:
        body.table_id ||
        body.tableId ||
        body.tableid ||
        params.tableId ||
        params.table_id,
      startTime:
        (body.start_time || body.startTime || body.fromTime)
          ? new Date(body.start_time || body.startTime || body.fromTime)
          : new Date(),
      endTime: body.end_time || body.endTime || body.toTime,
      durationMinutes:
        body.duration_minutes || body.durationMinutes || body.duration,
      type: body.booking_type || body.bookingType || body.type || "timer",
      stationId: req.stationId || body.station_id || body.stationId,
      // Map reservationId to excludeId so we don't conflict with ourselves
      excludeId: body.exclude_id || body.excludeId || params.id || body.reservationId,
    };

    // Skip if essential data is missing
    if (!bookingRequest.tableId) {
      return next();
    }

    // Check conflicts
    const conflicts =
      await TimeConflictResolver.checkTimeConflicts(bookingRequest);

    // Attach to request for route handler
    req.conflicts = conflicts;
    req.conflictSummary = TimeConflictResolver.getConflictSummary(conflicts);

    // Auto-block if severe conflicts found (unless force flag is set)
    if (conflicts.severity === "error" && !body.force_booking) {
      const suggestions = await TimeConflictResolver.suggestAlternatives(
        bookingRequest.tableId,
        bookingRequest.startTime,
        bookingRequest.durationMinutes || 60,
        bookingRequest.stationId,
      );

      return res.status(409).json({
        success: false,
        error: "BOOKING_CONFLICT",
        message: req.conflictSummary.message,
        conflicts: conflicts.conflicts,
        suggestions: suggestions,
        canForce: false, // Don't allow forcing over active sessions
        details: {
          title: req.conflictSummary.title,
          severity: conflicts.severity,
          conflictCount: conflicts.conflicts.length,
        },
      });
    }

    // Warn but continue if less severe conflicts
    if (conflicts.hasConflicts && !body.acknowledge_conflicts) {
      const suggestions = await TimeConflictResolver.suggestAlternatives(
        bookingRequest.tableId,
        bookingRequest.startTime,
        bookingRequest.durationMinutes || 60,
        bookingRequest.stationId,
      );

      return res.status(409).json({
        success: false,
        error: "BOOKING_WARNING",
        message: req.conflictSummary.message,
        conflicts: conflicts.conflicts,
        suggestions: suggestions,
        canForce: true,
        details: {
          title: req.conflictSummary.title,
          severity: conflicts.severity,
          question:
            req.conflictSummary.question || "Do you want to proceed anyway?",
          conflictCount: conflicts.conflicts.length,
        },
      });
    }

    next();
  } catch (error) {
    console.error("Time conflict middleware error:", error);
    // Don't block the request on middleware errors, just log and continue
    req.conflicts = {
      hasConflicts: false,
      conflicts: [],
      severity: "none",
      error: error.message,
    };
    next();
  }
};

/**
 * Simplified conflict check for quick validations
 * Returns boolean result without detailed conflict analysis
 */
const hasTimeConflicts = async (
  tableId,
  startTime,
  durationMinutes,
  stationId,
) => {
  try {
    const conflicts = await TimeConflictResolver.checkTimeConflicts({
      tableId,
      startTime,
      durationMinutes,
      stationId,
    });
    return conflicts.hasConflicts;
  } catch (error) {
    console.error("Quick conflict check error:", error);
    return false; // Default to no conflicts on error
  }
};

/**
 * Get available time slots for a table
 */
const getAvailableSlots = async (tableId, date, stationId) => {
  const slots = [];
  const startOfDay = new Date(date);
  startOfDay.setHours(8, 0, 0, 0); // Start from 8 AM

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 0, 0, 0); // End at 11 PM

  // Check 1-hour slots throughout the day
  for (
    let time = new Date(startOfDay);
    time < endOfDay;
    time.setHours(time.getHours() + 1)
  ) {
    const slotStart = new Date(time);
    const slotEnd = new Date(time.getTime() + 60 * 60000); // 1 hour duration

    const conflicts = await TimeConflictResolver.checkTimeConflicts({
      tableId,
      startTime: slotStart,
      endTime: slotEnd,
      durationMinutes: 60,
      stationId,
    });

    if (!conflicts.hasConflicts) {
      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        available: true,
        label: `${slotStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${slotEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      });
    } else {
      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        available: false,
        conflicts: conflicts.conflicts.length,
        reason: conflicts.conflicts[0]?.message || "Occupied",
      });
    }
  }

  return slots;
};

export {
  checkTimeConflicts,
  hasTimeConflicts,
  getAvailableSlots,
  TimeConflictResolver,
};
