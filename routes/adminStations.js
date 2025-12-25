const express = require("express");
const router = express.Router();
const {
  Station,
  StationPayment,
  StationIssue,
} = require("../models");
const { auth, authorize } = require("../middleware/auth");

/**
 * CREATE new station
 */
router.post(
  "/create",
  auth,
  authorize("admin"),
  async (req, res) => {
    try {
      const {
        station_name,
        subscription_type = "free",
        location_city,
        location_state,
        owner_name,
        owner_phone,
        station_photo_url,
        description,
      } = req.body;

      // Basic validation
      if (
        !station_name ||
        !location_city ||
        !location_state ||
        !owner_name ||
        !owner_phone
      ) {
        return res.status(400).json({
          error: "Missing required fields",
        });
      }

      // Create station
      const station = await Station.create({
        station_name,
        subscription_type,
        subscription_status: "active",
        location_city,
        location_state,
        owner_name,
        owner_phone,
        station_photo_url,
        description,
        onboarding_date: new Date(),
        status: "active",
      });

      res.status(201).json({
        success: true,
        message: "Station onboarded successfully",
        station: {
          id: station.id,
          station_name: station.station_name,
          subscription_type: station.subscription_type,
          location_city: station.location_city,
          location_state: station.location_state,
          owner_name: station.owner_name,
          owner_phone: station.owner_phone,
          onboarding_date: station.onboarding_date,
        },
      });
    } catch (err) {
      console.error("Error creating station:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /admin/stations
 * Filters: subscription_type, city
 */
router.get(
  "/",
  auth,
  authorize("admin"),
  async (req, res) => {
    try {
      const { subscription_type, city } = req.query;

      const where = {};
      if (subscription_type) where.subscription_type = subscription_type;
      if (city) where.location_city = city;

      const stations = await Station.findAll({
        where,
        include: [
          { model: StationPayment },
          { model: StationIssue },
        ],
        order: [["createdAt", "DESC"]],
      });

      res.json(stations);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET station details
 */
router.get(
  "/:id",
  auth,
  authorize("admin"),
  async (req, res) => {
    try {
      const station = await Station.findByPk(req.params.id, {
        include: [StationPayment, StationIssue],
      });

      if (!station)
        return res.status(404).json({ error: "Station not found" });

      res.json(station);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * Pause subscription
 */
router.post(
  "/:id/pause-subscription",
  auth,
  authorize("admin"),
  async (req, res) => {
    const station = await Station.findByPk(req.params.id);
    if (!station) return res.status(404).json({ error: "Station not found" });

    station.subscription_status = "paused";
    await station.save();

    res.json({ success: true, message: "Subscription paused" });
  }
);

/**
 * Upgrade subscription
 */
router.post(
  "/:id/upgrade-subscription",
  auth,
  authorize("admin"),
  async (req, res) => {
    const { subscription_type, amount } = req.body;

    const station = await Station.findByPk(req.params.id);
    if (!station) return res.status(404).json({ error: "Station not found" });

    station.subscription_type = subscription_type;
    station.subscription_status = "active";
    await station.save();

    await StationPayment.create({
      station_id: station.id,
      amount,
      subscription_type,
      status: "success",
    });

    res.json({ success: true, message: "Subscription upgraded" });
  }
);

/**
 * Remove station (soft delete)
 */
router.delete(
  "/:id/remove",
  auth,
  authorize("admin"),
  async (req, res) => {
    const station = await Station.findByPk(req.params.id);
    if (!station) return res.status(404).json({ error: "Station not found" });

    station.status = "removed";
    await station.save();

    res.json({ success: true, message: "Station removed" });
  }
);

module.exports = router;
