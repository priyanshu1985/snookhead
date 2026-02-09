import express from "express";
import bcrypt from "bcrypt";
import { auth, authorize } from "../middleware/auth.js";

const router = express.Router();

// Get models
let models;
const getModels = async () => {
  if (!models) {
    models = await import("../models/index.js");
  }
  return models;
};

// POST /api/owner/check-setup-status - Check if user has set up owner panel password
router.post("/check-setup-status", auth, async (req, res) => {
  try {
    const { User } = await getModels();
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      needsSetup: !user.ownerpanelsetup,
      message: user.ownerpanelsetup
        ? "Owner panel password is already set up"
        : "Owner panel password needs to be set up",
    });
  } catch (error) {
    console.error("Error checking setup status:", error);
    res.status(500).json({ error: "Server error checking setup status" });
  }
});

// POST /api/owner/setup-password - Set up owner panel password for first time
router.post("/setup-password", auth, async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const userId = req.user.id;

    // Validation
    if (!password || !confirmPassword) {
      return res.status(400).json({
        error: "Password and confirm password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match",
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        error: "Password must be at least 4 characters long",
      });
    }

    const { User } = await getModels();
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has already set up password
    if (user.ownerpanelsetup) {
      return res.status(400).json({
        error: "Owner panel password has already been set up",
      });
    }

    // Hash the password and save
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.update(
      {
        ownerpanelpassword: hashedPassword,
        ownerpanelsetup: true,
        updatedAt: new Date(),
      },
      { where: { id: userId } }
    );

    res.json({
      success: true,
      message: "Owner panel password set up successfully",
    });
  } catch (error) {
    console.error("Error setting up password:", error);
    res.status(500).json({ error: "Server error setting up password" });
  }
});

// POST /api/owner/verify-password - Verify owner panel password for access
router.post("/verify-password", auth, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const { User } = await getModels();
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has set up password
    if (!user.ownerpanelsetup || !user.ownerpanelpassword) {
      return res.status(400).json({
        error: "Owner panel password not set up. Please set up first.",
        needsSetup: true,
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.ownerpanelpassword);

    if (isValid) {
      return res.json({
        success: true,
        message: "Password verified successfully",
      });
    } else {
      return res.status(401).json({
        success: false,
        error: "Incorrect password",
      });
    }
  } catch (error) {
    console.error("Error verifying password:", error);
    res.status(500).json({ error: "Server error verifying password" });
  }
});

// POST /api/owner/change-password - Change owner panel password
router.post("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.user.id;

    // Validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        error:
          "Current password, new password, and confirm password are required",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        error: "New passwords do not match",
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        error: "New password must be at least 4 characters long",
      });
    }

    const { User } = await getModels();
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has set up password
    if (!user.owner_panel_setup || !user.owner_panel_password) {
      return res.status(400).json({
        error: "Owner panel password not set up. Please set up first.",
        needsSetup: true,
      });
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(
      currentPassword,
      user.ownerpanelpassword
    );

    if (!isCurrentValid) {
      return res.status(401).json({
        error: "Current password is incorrect",
      });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update(
      {
        ownerpanelpassword: hashedPassword,
        updatedAt: new Date(),
      },
      { where: { id: userId } }
    );

    res.json({
      success: true,
      message: "Owner panel password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Server error changing password" });
  }
});

// POST /api/owner/reset-password - Reset user's owner panel password (admin only)
router.post("/reset-password", auth, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (!targetUserId) {
      return res.status(400).json({ error: "Target user ID is required" });
    }

    const { User } = await getModels();
    const targetUser = await User.findByPk(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    // Reset owner panel password setup
    await User.update(
      {
        ownerpanelpassword: null,
        ownerpanelsetup: false,
        updatedAt: new Date(),
      },
      { where: { id: targetUserId } }
    );

    res.json({
      success: true,
      message: `Owner panel password reset for user ${targetUser.name}. They will need to set up a new password.`,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Server error resetting password" });
  }
});

export default router;
