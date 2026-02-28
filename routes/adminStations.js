import express from "express";
import { Station, StationPayment, StationIssue, User } from "../models/index.js";
import { auth, authorize } from "../middleware/auth.js";

const router = express.Router();

/**
 * CREATE new station
 */
router.post("/create", auth, authorize("admin"), async (req, res) => {
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
      stationname: station_name,
      subscriptiontype: subscription_type,
      subscriptionstatus: "active",
      locationcity: location_city,
      locationstate: location_state,
      ownername: owner_name,
      ownerphone: owner_phone,
      stationphotourl: station_photo_url,
      description,
      onboardingdate: new Date(), // onboarding_date -> onboardingdate
      status: "active",
    });

    res.status(201).json({
      success: true,
      message: "Station onboarded successfully",
      station: {
        id: station.id,
        station_name: station.stationname,
        subscription_type: station.subscriptiontype,
        location_city: station.locationcity,
        location_state: station.locationstate,
        owner_name: station.ownername,
        owner_phone: station.ownerphone,
        onboarding_date: station.onboardingdate,
      },
    });
  } catch (err) {
    console.error("Error creating station:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/stations
 * Filters: subscription_type, city
 */
router.get("/", auth, authorize("admin"), async (req, res) => {
  try {
    const { subscription_type, city } = req.query;

    const where = {};
    if (subscription_type) where.subscriptiontype = subscription_type;
    if (city) where.locationcity = city;

    // Fetch stations
    let stations = await Station.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    // Fetch associated data manually since our current find helper doesn't support complex includes
    const stationIds = stations.map(s => s.id);
    const ownerUserIds = stations.map(s => s.owneruserid).filter(id => id);

    const [payments, issues, users] = await Promise.all([
      stationIds.length ? StationPayment.findAll({ where: { stationid: stationIds } }) : [],
      stationIds.length ? StationIssue.findAll({ where: { stationid: stationIds } }) : [],
      ownerUserIds.length ? User.findAll({ where: { id: ownerUserIds } }) : []
    ]);

    // Map and enrich data for frontend (underscored format)
    const enrichedStations = stations.map(station => {
      const owner = users.find(u => u.id === station.owneruserid);
      const stationPayments = payments.filter(p => p.stationid === station.id);
      const stationIssues = issues.filter(i => i.stationid === station.id);

      return {
        id: station.id,
        station_name: station.stationname,
        subscription_type: station.subscriptiontype,
        subscription_status: station.subscriptionstatus,
        location_city: station.locationcity,
        location_state: station.locationstate,
        // Priority: Auth User Profile > Station Manual Entry > Default
        owner_name: owner?.name || station.ownername || "Unknown",
        owner_phone: owner?.phone || station.ownerphone || "N/A",
        onboarding_date: station.onboardingdate,
        station_photo_url: station.stationphotourl,
        status: station.status,
        StationPayments: stationPayments,
        StationIssues: stationIssues
      };
    });

    res.json(enrichedStations);
  } catch (err) {
    console.error("Error fetching admin stations:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET station details
 */
router.get("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const station = await Station.findByPk(req.params.id);

    if (!station) return res.status(404).json({ error: "Station not found" });

    const [payments, issues, owner] = await Promise.all([
      StationPayment.findAll({ where: { stationid: station.id } }),
      StationIssue.findAll({ where: { stationid: station.id } }),
      station.owneruserid ? User.findByPk(station.owneruserid) : null
    ]);

    const enrichedStation = {
      id: station.id,
      station_name: station.stationname,
      subscription_type: station.subscriptiontype,
      subscription_status: station.subscriptionstatus,
      location_city: station.locationcity,
      location_state: station.locationstate,
      owner_name: owner?.name || station.ownername || "Unknown",
      owner_phone: owner?.phone || station.ownerphone || "N/A",
      onboarding_date: station.onboardingdate,
      station_photo_url: station.stationphotourl,
      status: station.status,
      StationPayments: payments,
      StationIssues: issues
    };

    res.json(enrichedStation);
  } catch (err) {
    console.error("Error fetching station details:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Pause subscription
 */
router.post(
  "/:id/pause-subscription",
  auth,
  authorize("admin"),
  async (req, res) => {
    try {
      const station = await Station.findByPk(req.params.id);
      if (!station) return res.status(404).json({ error: "Station not found" });

      await Station.update({ subscriptionstatus: "paused" }, { where: { id: station.id } });

      res.json({ success: true, message: "Subscription paused" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * Approve subscription
 */
router.post(
  "/:id/approve-subscription",
  auth,
  authorize("admin"),
  async (req, res) => {
    try {
      const station = await Station.findByPk(req.params.id);
      if (!station) return res.status(404).json({ error: "Station not found" });

      await Station.update({ subscriptionstatus: "active" }, { where: { id: station.id } });

      res.json({ success: true, message: "Subscription approved" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
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
    try {
      const { subscription_type, amount } = req.body;

      const station = await Station.findByPk(req.params.id);
      if (!station) return res.status(404).json({ error: "Station not found" });

      await Station.update({ 
        subscriptiontype: subscription_type,
        subscriptionstatus: "active" 
      }, { where: { id: station.id } });

      await StationPayment.create({
        stationid: station.id,
        amount,
        subscriptiontype: subscription_type,
        status: "success",
      });

      res.json({ success: true, message: "Subscription upgraded" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * Remove station (soft delete)
 */
router.delete("/:id/remove", auth, authorize("admin"), async (req, res) => {
  try {
    const station = await Station.findByPk(req.params.id);
    if (!station) return res.status(404).json({ error: "Station not found" });

    await Station.update({ status: "removed" }, { where: { id: station.id } });

    res.json({ success: true, message: "Station removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Add manual payment
 */
router.post(
  "/:id/add-payment",
  auth,
  authorize("admin"),
  async (req, res) => {
    try {
      const { amount, months } = req.body;
      const station = await Station.findByPk(req.params.id);
      if (!station) return res.status(404).json({ error: "Station not found" });

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      await StationPayment.create({
        stationid: station.id,
        amount: parseFloat(amount),
        subscriptiontype: station.subscriptiontype || 'basic', // MUST be a valid enum value
        paymentmethod: `Manual (${months || 0} Months)`,
        status: "success",
        paymentdate: new Date()
      });

      res.json({ success: true, message: "Payment added successfully" });
    } catch (err) {
      console.error("Error adding manual payment:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
