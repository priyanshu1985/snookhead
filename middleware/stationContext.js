/**
 * Station Context Middleware for Multi-Tenancy
 *
 * This middleware extracts the station_id from the authenticated user
 * and makes it available to all routes for data filtering.
 *
 * Flow:
 * 1. User logs in -> JWT contains user info including station_id
 * 2. This middleware runs after auth middleware
 * 3. Extracts station_id and attaches to req.stationId
 * 4. Routes use req.stationId to filter queries
 */

import { User, Station } from "../models/index.js";

/**
 * Middleware to extract station context from authenticated user
 * Must be used AFTER auth middleware
 */
const stationContext = async (req, res, next) => {
  try {
    // If no user (not authenticated), skip station context
    if (!req.user) {
      req.stationId = null;
      return next();
    }

    // Admin users can see all data (no station filter)
    if (req.user.role === "admin") {
      req.stationId = null; // null means no filter (see all)
      req.isAdmin = true;
      return next();
    }

    // For owner/staff/manager roles, get station_id from user record
    if (["owner", "staff", "manager"].includes(req.user.role)) {
      // First check if station_id is already in JWT payload
      if (req.user.station_id) {
        req.stationId = req.user.station_id;
        return next();
      }

      // Otherwise fetch from database
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // For owners without a station_id, auto-create one (Self-Healing)
      if (req.user.role === "owner" && !user.stationid) {
        try {
          console.log(
            `MW: Owner ${user.email} has no station. Auto-creating...`,
          );
          const newStation = await Station.create({
            stationname: `${user.name}'s Club`,
            ownername: user.name,
            ownerphone: user.phone || "Not provided",
            locationcity: "Unknown City",
            locationstate: "Unknown State",
            onboardingdate: new Date(),
            status: "active",
            subscriptiontype: "free",
          });

          await User.update(
            { stationid: newStation.id },
            { where: { id: user.id } },
          );

          req.stationId = newStation.id;
          // req.needsStationSetup = false; // logic flow continues successfully
        } catch (err) {
          console.error("MW: Failed to auto-create station:", err);
          // Fallback to blocking if auto-create fails
          req.stationId = null;
          req.needsStationSetup = true;
        }
        return next();
      }

      // Staff/Manager must have a station_id
      if (
        (req.user.role === "staff" || req.user.role === "manager") &&
        !user.stationid
      ) {
        return res.status(403).json({
          error: "Staff/Manager not assigned to any station",
          code: "NO_STATION_ASSIGNED",
        });
      }

      req.stationId = user.stationid;
      return next();
    }

    // Customer role - no station filter needed for customer-facing endpoints
    req.stationId = null;
    req.isCustomer = true;
    next();
  } catch (error) {
    console.error("Station context error:", error);
    res.status(500).json({ error: "Error loading station context" });
  }
};

/**
 * Middleware to require station context (for routes that need it)
 * Use after stationContext middleware
 */
const requireStation = (req, res, next) => {
  // Admin can access without station
  if (req.isAdmin) {
    return next();
  }

  if (!req.stationId) {
    if (req.needsStationSetup) {
      return res.status(403).json({
        error: "Please set up your station first",
        code: "STATION_SETUP_REQUIRED",
      });
    }
    return res.status(403).json({
      error: "Station context required",
      code: "NO_STATION_CONTEXT",
    });
  }

  next();
};

/**
 * Helper function to add station filter to Sequelize where clause
 * @param {Object} where - Existing where clause
 * @param {Number|null} stationId - Station ID from req.stationId
 * @param {String} [columnName='stationid'] - Column name for station ID (default: stationid)
 * @returns {Object} - Updated where clause with station filter
 */
const addStationFilter = (where = {}, stationId, columnName = "stationid") => {
  // If stationId is null (admin), don't add filter
  if (stationId === null || stationId === undefined) {
    return where;
  }

  return {
    ...where,
    [columnName]: stationId,
  };
};

/**
 * Helper function to add station_id to create data
 * @param {Object} data - Data to be created
 * @param {Number|null} stationId - Station ID from req.stationId
 * @param {String} [columnName='stationid'] - Column name for station ID (default: stationid)
 * @returns {Object} - Updated data with station_id
 */
const addStationToData = (data = {}, stationId, columnName = "stationid") => {
  if (stationId === null || stationId === undefined) {
    return data;
  }

  return {
    ...data,
    [columnName]: stationId,
  };
};

export { stationContext, requireStation, addStationFilter, addStationToData };
