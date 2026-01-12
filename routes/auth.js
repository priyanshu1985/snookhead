const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User, Station } = require("../models");
const tokenStore = require("../utils/tokenStore");
const { auth, validateRefreshToken } = require("../middleware/auth");
const {
  validateRequired,
  validateEmailFormat,
  validatePasswordStrength,
} = require("../middleware/validation");
const { rateLimit } = require("../middleware/rateLimiter");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXP = process.env.JWT_EXP || "15m"; // access token expiry - short lived
const REFRESH_EXP = 30 * 24 * 60 * 60 * 1000; // 30 days in ms for refresh token - users stay logged in until manual logout
const NODE_ENV = process.env.NODE_ENV || "development";

function makeAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      station_id: user.station_id || null, // Include station_id for multi-tenancy
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXP }
  );
}

function makeRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

// Set refresh token as httpOnly cookie
function setRefreshTokenCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: NODE_ENV === "production", // Only send over HTTPS in production
    sameSite: "strict",
    maxAge: REFRESH_EXP,
    path: "/api/auth/refresh",
  });
}

// Clear refresh token cookie
function clearRefreshTokenCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/refresh",
  });
}

// register
router.post(
  "/register",
  validateRequired(["name", "email", "password"]),
  validateEmailFormat,
  validatePasswordStrength,
  async (req, res) => {
    try {
      const { name, email, password, phone, role } = req.body;

      // Prevent admin role creation during registration
      if (role === "admin") {
        return res.status(403).json({ error: "Cannot register as admin" });
      }

      // Use the provided role, default to 'customer' only if role is undefined/null/empty
      const validRoles = ["staff", "owner", "customer"];
      let userRole = "customer";
      if (
        role &&
        typeof role === "string" &&
        validRoles.includes(role.toLowerCase())
      ) {
        userRole = role.toLowerCase();
      }

      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(400).json({ error: "User exists" });

      const hash = await bcrypt.hash(password, 10);

      // If registering as owner, create a station for them first
      let stationId = null;
      if (userRole === "owner") {
        const station = await Station.create({
          station_name: `${name}'s Cafe`,
          subscription_type: "free",
          subscription_status: "active",
          location_city: req.body.city || "Not Set",
          location_state: req.body.state || "Not Set",
          owner_name: name,
          owner_phone: phone || "Not Set",
          onboarding_date: new Date(),
          status: "active",
        });
        stationId = station.id;
      }

      const user = await User.create({
        name,
        email,
        passwordHash: hash,
        phone,
        role: userRole,
        station_id: stationId,
      });

      // Link station to owner user
      if (stationId) {
        await Station.update(
          { owner_user_id: user.id },
          { where: { id: stationId } }
        );
      }

      // Generate tokens so user is logged in after registration
      const access = makeAccessToken(user);
      const refresh = makeRefreshToken();
      tokenStore.setRefreshToken(user.id, refresh);

      // Set refresh token as httpOnly cookie
      setRefreshTokenCookie(res, refresh);

      res.status(201).json({
        success: true,
        accessToken: access,
        refreshToken: refresh, // Also send in body for mobile compatibility
        expiresIn: JWT_EXP,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          station_id: user.station_id || null,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// login -> returns access token + refresh token
router.post(
  "/login",
  rateLimit(5, 15 * 60 * 1000),
  validateRequired(["email", "password"]),
  validateEmailFormat,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(400).json({ error: "Invalid credentials" });

      const ok = await user.checkPassword(password);
      if (!ok) return res.status(400).json({ error: "Invalid credentials" });

      const access = makeAccessToken(user);
      const refresh = makeRefreshToken();
      tokenStore.setRefreshToken(user.id, refresh);

      // Set refresh token as httpOnly cookie
      setRefreshTokenCookie(res, refresh);

      res.json({
        success: true,
        accessToken: access,
        refreshToken: refresh, // Also send in body for mobile compatibility
        expiresIn: JWT_EXP,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          station_id: user.station_id || null,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// refresh token - enhanced with better security
router.post("/refresh", async (req, res) => {
  try {
    // Try to get refresh token from cookie first, then from body
    let refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        error: "No refresh token provided",
        code: "NO_REFRESH_TOKEN",
      });
    }

    // Find user by refresh token
    const userId = tokenStore.findUserByRefreshToken(refreshToken);
    if (!userId) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    // Get user from database
    const user = await User.findByPk(userId);
    if (!user) {
      tokenStore.revokeRefreshToken(userId);
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Generate new access token
    const newAccessToken = makeAccessToken(user);

    // Optionally generate new refresh token (token rotation)
    const rotateRefreshToken = process.env.ROTATE_REFRESH_TOKENS === "true";
    let newRefreshToken = refreshToken;

    if (rotateRefreshToken) {
      newRefreshToken = makeRefreshToken();
      tokenStore.setRefreshToken(userId, newRefreshToken);
      setRefreshTokenCookie(res, newRefreshToken);
    }

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: JWT_EXP,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        station_id: user.station_id || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// logout (revoke refresh token and clear session)
router.post("/logout", async (req, res) => {
  try {
    // Get refresh token from cookie or body
    let refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      // Find and revoke the refresh token
      const userId = tokenStore.findUserByRefreshToken(refreshToken);
      if (userId) {
        tokenStore.revokeRefreshToken(userId);
      }
    }

    // Clear the refresh token cookie
    clearRefreshTokenCookie(res);

    res.json({
      success: true,
      message: "Successfully logged out",
    });
  } catch (err) {
    // Even if there's an error, clear the cookie
    clearRefreshTokenCookie(res);
    res.status(500).json({ error: err.message });
  }
});

// Get current user info (protected route)
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        station_id: user.station_id || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// request password reset -> returns reset token (in prod you'd email it)
router.post(
  "/request-reset",
  rateLimit(3, 15 * 60 * 1000),
  validateRequired(["email"]),
  validateEmailFormat,
  async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });
      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(400).json({ error: "Unknown email" });
      const token = crypto.randomBytes(20).toString("hex");
      tokenStore.setResetToken(token, {
        userId: user.id,
        expiresAt: Date.now() + 3600 * 1000,
      }); // 1 hour
      // In real app: send email. Here we return token for dev/testing.
      res.json({ resetToken: token, expiresIn: 3600 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// perform password reset
router.post(
  "/reset-password",
  validateRequired(["token", "newPassword"]),
  validatePasswordStrength,
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword)
        return res
          .status(400)
          .json({ error: "Token and newPassword required" });
      const info = tokenStore.getResetToken(token);
      if (!info)
        return res.status(400).json({ error: "Invalid or expired token" });
      const user = await User.findByPk(info.userId);
      if (!user) return res.status(400).json({ error: "User not found" });
      const hash = await bcrypt.hash(newPassword, 10);
      await user.update({ passwordHash: hash });
      tokenStore.revokeResetToken(token);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
