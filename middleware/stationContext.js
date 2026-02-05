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
      // First check if station_id is already in JWT payload (JWT uses station_id usually, but let's check)
      if (req.user.station_id) {
        req.stationId = req.user.station_id;
        return next();
      }

      // Otherwise fetch from database
      const user = await User.findByPk(req.user.id, {
        attributes: ["id", "stationid", "role"],
      });

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // For owners without a station_id, they might need to create one first
      if (req.user.role === "owner" && !user.stationid) {
        // Check if they have an owned station
        const ownedStation = await Station.findOne({
          where: { owneruserid: user.id },
        });

        if (ownedStation) {
          // Update user's station_id
          await User.update({ stationid: ownedStation.id }, { where: { id: user.id } });
          req.stationId = ownedStation.id;
        } else {
          // Owner needs to create a station first
          req.stationId = null;
          req.needsStationSetup = true;
        }
        return next();
      }

      // Staff/Manager must have a station_id
      if ((req.user.role === "staff" || req.user.role === "manager") && !user.stationid) {
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
 * @returns {Object} - Updated where clause with station filter
 */
const addStationFilter = (where = {}, stationId) => {
  // If stationId is null (admin), don't add filter
  if (stationId === null || stationId === undefined) {
    return where;
  }

  return {
    ...where,
    stationid: stationId,
  };
};

/**
 * Helper function to add station_id to create data
 * @param {Object} data - Data to be created
 * @param {Number|null} stationId - Station ID from req.stationId
 * @returns {Object} - Updated data with station_id
 */
const addStationToData = (data = {}, stationId) => {
  if (stationId === null || stationId === undefined) {
    return data;
  }

  return {
    ...data,
    stationid: stationId,
  };
};

export { stationContext, requireStation, addStationFilter, addStationToData };
