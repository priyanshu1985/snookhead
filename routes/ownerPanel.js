const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { auth, authorize } = require("../middleware/auth");

// We'll get the model from the models index after it's registered
let OwnerSettings;
const getModel = () => {
  if (!OwnerSettings) {
    const models = require("../models");
    OwnerSettings = models.OwnerSettings;
  }
  return OwnerSettings;
};

// Default passcode (hashed version of '1234')
const DEFAULT_PASSCODE = "1234";

// Helper: Get or create passcode setting
async function getPasscodeSetting() {
  const Model = getModel();
  let setting = await Model.findOne({
    where: { setting_key: "owner_passcode" },
  });

  if (!setting) {
    // Create default passcode
    const hashedPasscode = await bcrypt.hash(DEFAULT_PASSCODE, 10);
    setting = await Model.create({
      setting_key: "owner_passcode",
      setting_value: hashedPasscode,
    });
  }

  return setting;
}

// POST /api/owner/verify-passcode - Verify owner passcode (no auth required)
router.post("/verify-passcode", async (req, res) => {
  try {
    const { passcode } = req.body;

    if (!passcode) {
      return res.status(400).json({ error: "Passcode is required" });
    }

    const setting = await getPasscodeSetting();
    const isValid = await bcrypt.compare(passcode, setting.setting_value);

    if (isValid) {
      return res.json({
        success: true,
        message: "Passcode verified successfully",
      });
    } else {
      return res.status(401).json({
        success: false,
        error: "Incorrect passcode",
      });
    }
  } catch (error) {
    console.error("Error verifying passcode:", error);
    res.status(500).json({ error: "Server error verifying passcode" });
  }
});

// POST /api/owner/change-passcode - Change owner passcode
router.post("/change-passcode", auth, async (req, res) => {
  try {
    const { currentPasscode, newPasscode } = req.body;

    if (!currentPasscode || !newPasscode) {
      return res.status(400).json({
        error: "Current passcode and new passcode are required",
      });
    }

    if (newPasscode.length !== 4 || !/^\d{4}$/.test(newPasscode)) {
      return res.status(400).json({
        error: "New passcode must be exactly 4 digits",
      });
    }

    const Model = getModel();
    const setting = await getPasscodeSetting();

    // Verify current passcode
    const isValid = await bcrypt.compare(
      currentPasscode,
      setting.setting_value
    );
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Current passcode is incorrect",
      });
    }

    // Hash and save new passcode
    const hashedPasscode = await bcrypt.hash(newPasscode, 10);
    await Model.update(
      {
        setting_value: hashedPasscode,
        updated_at: new Date(),
      },
      { where: { setting_key: "owner_passcode" } }
    );

    res.json({
      success: true,
      message: "Passcode changed successfully",
    });
  } catch (error) {
    console.error("Error changing passcode:", error);
    res.status(500).json({ error: "Server error changing passcode" });
  }
});

// POST /api/owner/reset-passcode - Reset to default (admin only)
router.post("/reset-passcode", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const Model = getModel();
    const hashedPasscode = await bcrypt.hash(DEFAULT_PASSCODE, 10);

    await Model.update(
      {
        setting_value: hashedPasscode,
        updated_at: new Date(),
      },
      { where: { setting_key: "owner_passcode" } }
    );

    res.json({
      success: true,
      message: "Passcode reset to default (1234)",
    });
  } catch (error) {
    console.error("Error resetting passcode:", error);
    res.status(500).json({ error: "Server error resetting passcode" });
  }
});

module.exports = router;
