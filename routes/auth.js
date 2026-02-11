import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { User, Station, Game, TableAsset } from "../models/index.js";
import tokenStore from "../utils/tokenStore.js";
import { auth, validateRefreshToken } from "../middleware/auth.js";
import { sendOTP, verifyOTP } from "../utils/otpService.js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret"; // Fallback for dev
const ACCESS_TOKEN_EXPIRY = "7d"; // 7 days

// Helper: Generate Access Token
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      station_id: user.stationid,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide email and password" });
    }

    // Check for user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        error: "Please verify your email address first",
        emailNotVerified: true,
        email: user.email,
      });
    }

    // Fetch fresh user data to get latest station_id
    // Fetch fresh user data to get latest station_id
    let freshUser = await User.findByPk(user.id);
    if (!freshUser) {
      return res.status(401).json({ error: "User not found" });
    }

    // Self-healing: Auto-create station for owners if missing
    if (freshUser.role === "owner" && !freshUser.stationid) {
      try {
        console.log(
          `⚠️ Owner ${freshUser.email} has no station. Auto-creating...`,
        );
        const newStation = await Station.create({
          stationname: `${freshUser.name}'s Club`,
          ownername: freshUser.name,
          ownerphone: freshUser.phone || "Not provided",
          locationcity: "Unknown City",
          locationstate: "Unknown State",
          onboardingdate: new Date(),
          status: "active",
          subscriptiontype: "free",
        });

        await User.update(
          { stationid: newStation.id },
          { where: { id: freshUser.id } },
        );

        // Refresh user data with new station_id
        freshUser = await User.findByPk(user.id);
        console.log(
          `✅ Auto-created station ${newStation.id} for user ${freshUser.email}`,
        );
      } catch (stationErr) {
        console.error("❌ Failed to auto-create station on login:", stationErr);
        // Continue login, user will see "Setup Station" errors but at least can login
      }
    }

    // Generate tokens with fresh user data
    const accessToken = generateAccessToken(freshUser);
    const refreshToken = crypto.randomBytes(40).toString("hex");

    // Save refresh token
    await tokenStore.setRefreshToken(freshUser.id, refreshToken);

    // Return user info (exclude sensitive data)
    const { passwordHash: _, ...userWithoutPassword } = freshUser;

    res.json({
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/auth/register
// @desc    Register new user (sends OTP to email)
// @access  Public
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide name, email, and password" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User already exists with this email" });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with pending status (default role is 'owner' for new registrations)
    await User.create({
      name,
      email,
      passwordHash: hashedPassword,
      phone: phone || null,
      role: role || "owner", // Default to owner for new registrations
      email_verified: false, // User must verify email first
    });

    // Send OTP to email
    await sendOTP(email);

    res.status(201).json({
      message:
        "Registration initiated. Please check your email for verification code.",
      email,
    });
  } catch (err) {
    console.error("Register error:", err);

    // Handle specific OTP service errors
    if (
      err.message.includes("Database error") ||
      err.message.includes("Email error")
    ) {
      return res.status(500).json({ error: err.message });
    }

    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and complete registration
// @access  Public
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body;

    // Validation
    if (!email || !code) {
      return res
        .status(400)
        .json({ error: "Please provide email and verification code" });
    }

    // Verify OTP
    const otpResult = await verifyOTP(email, code);
    if (!otpResult.valid) {
      return res
        .status(400)
        .json({ error: otpResult.message || "Invalid verification code" });
    }

    // Find user and mark as verified
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user already has a station (avoid duplicates)
    let userStation = null;
    if (!user.stationid) {
      try {
        // Try to create a minimal station for this user (isolated workspace)
        userStation = await Station.create({
          stationname: `${user.name}'s Club`,
          ownername: user.name,
          ownerphone: user.phone || "Not provided",
          locationcity: "Unknown City",
          locationstate: "Unknown State",
        });

        console.log(`✅ Created station for ${user.email}:`, {
          station_id: userStation.id,
          station_name: userStation.stationname,
        });

        // Update user with station_id and mark as verified
        const updateResult = await User.update(
          {
            email_verified: true,
            stationid: userStation.id,
          },
          { where: { email } },
        );

        console.log(`✅ Updated user ${email} with station_id:`, updateResult);

        // Fetch fresh user data to ensure we have latest info
        const updatedUser = await User.findOne({ where: { email } });
        if (updatedUser) {
          user.stationid = updatedUser.stationid;
          user.email_verified = updatedUser.email_verified;
        }
      } catch (stationError) {
        console.log(
          "❌ Station creation failed, continuing with user verification:",
          stationError.message,
        );
        // If station creation fails, just mark user as verified without station
        await User.update({ email_verified: true }, { where: { email } });
      }
    } else {
      console.log(
        `✅ User ${user.email} already has station_id: ${user.stationid}`,
      );
      // User already has a station, just mark as verified
      await User.update({ email_verified: true }, { where: { email } });

      // Fetch fresh user data
      const updatedUser = await User.findOne({ where: { email } });
      if (updatedUser) {
        user.email_verified = updatedUser.email_verified;
      }
    }

    // Generate tokens for the verified user (use fresh user data)
    const freshUserForToken = await User.findOne({ where: { email } });
    if (!freshUserForToken) {
      return res.status(404).json({ error: "User not found after update" });
    }

    console.log(
      `🔑 Generating JWT for user ${email} with station_id: ${freshUserForToken.stationid}`,
    );

    const accessToken = generateAccessToken(freshUserForToken);
    const refreshToken = crypto.randomBytes(40).toString("hex");

    // Save refresh token
    await tokenStore.setRefreshToken(freshUserForToken.id, refreshToken);

    // Return user info (exclude sensitive data)
    const { passwordHash: _, ...userWithoutPassword } = freshUserForToken;

    res.json({
      message: "Email verified successfully. Welcome!",
      accessToken,
      refreshToken,
      user: {
        ...userWithoutPassword,
        email_verified: true,
        station_id: freshUserForToken.stationid,
      },
      debugInfo: {
        station_created: userStation ? userStation.id : "existing",
        station_name: userStation ? userStation.stationname : "N/A",
      },
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP to email
// @access  Public
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ error: "Please provide email" });
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is already verified
    if (user.email_verified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Send new OTP
    await sendOTP(email);

    res.json({ message: "Verification code resent to your email" });
  } catch (err) {
    console.error("Resend OTP error:", err);

    // Handle specific OTP service errors
    if (
      err.message.includes("Database error") ||
      err.message.includes("Email error")
    ) {
      return res.status(500).json({ error: err.message });
    }

    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Get new access token using refresh token
// @access  Public (validated by middleware)
router.post("/refresh-token", validateRefreshToken, async (req, res) => {
  try {
    const userId = req.refreshTokenUserId;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (revoke refresh token)
// @access  Private
router.post("/logout", auth, async (req, res) => {
  try {
    await tokenStore.revokeRefreshToken(req.user.id);
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Also get station info if user has one
    let stationInfo = null;
    if (user.stationid) {
      stationInfo = await Station.findByPk(user.stationid);
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      station: stationInfo,
      debugInfo: {
        jwt_station_id: req.user.station_id,
        user_station_id: user.stationid,
        jwt_role: req.user.role,
        user_role: user.role,
      },
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/auth/create-station
// @desc    Create station for existing user (if they don't have one)
// @access  Private
router.post("/create-station", auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user already has a station
    if (user.stationid) {
      const existingStation = await Station.findByPk(user.stationid);
      return res.json({
        message: "User already has a station",
        station: existingStation,
      });
    }

    // Create new station for user
    const newStation = await Station.create({
      stationname: `${user.name}'s Club`,
      ownername: user.name,
      ownerphone: user.phone || "Not provided",
      locationcity: "Unknown City",
      locationstate: "Unknown State",
    });

    // Update user with station_id
    await User.update(
      {
        stationid: newStation.id,
      },
      { where: { id: user.id } },
    );

    res.json({
      message: "Station created successfully!",
      station: newStation,
    });
  } catch (err) {
    console.error("Create station error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// @route   GET /api/auth/debug-station
// @desc    Debug station context and data filtering
// @access  Private
router.get("/debug-station", auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    // Get user's station
    let userStation = null;
    if (user?.stationid) {
      userStation = await Station.findByPk(user.stationid);
    }

    // Get all stations (to see what exists)
    const allStations = await Station.findAll();

    // Check tables and games data for debugging
    const allTables = await TableAsset.findAll();
    const allGames = await Game.findAll();

    res.json({
      jwt_payload: req.user,
      user_from_db: user
        ? {
            id: user.id,
            email: user.email,
            role: user.role,
            station_id: user.stationid,
            email_verified: user.email_verified,
          }
        : null,
      user_station: userStation,
      all_stations: allStations.map((s) => ({
        id: s.id,
        station_name: s.stationname,
        owner_name: s.ownername,
      })),
      station_count: allStations.length,
      debug_data: {
        total_tables: allTables.length,
        total_games: allGames.length,
        sample_table: allTables[0] || null,
        sample_game: allGames[0] || null,
      },
    });
  } catch (err) {
    console.error("Debug station error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset link to user's email
// @access  Public
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ error: "Please provide email address" });
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ error: "No user found with this email address" });
    }

    // Generate a secure reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    console.log("🔍 Forgot password - Generating token:", {
      email,
      tokenGenerated: resetToken.substring(0, 10) + "...",
      expiryTime: resetTokenExpiry.toISOString(),
    });

    // Store the reset token in the user record
    const updateResult = await User.update(
      {
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
      },
      { where: { email } },
    );

    console.log("🔍 Token update result:", {
      rowsAffected: updateResult[0],
      wasSuccessful: updateResult[0] > 0,
    });

    // Verify the token was saved
    const verifyUser = await User.findOne({ where: { email } });
    console.log("🔍 Token verification:", {
      tokenInDB: verifyUser.reset_token?.substring(0, 10) + "...",
      expiryInDB: verifyUser.reset_token_expiry,
      tokensMatch: verifyUser.reset_token === resetToken,
    });

    // Create reset link
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email with reset link
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Your Snookhead Password",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #F08626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">${resetLink}</p>
          <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated message from Snookhead. Please do not reply to this email.</p>
        </div>
      `,
      text: `Hello ${user.name},\n\nYou requested to reset your password. Click the link below to set a new password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this password reset, please ignore this email.`,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Password reset link sent to ${email}`);

    res.json({
      success: true,
      message: "Password reset link has been sent to your email address",
    });
  } catch (err) {
    console.error("Forgot password error:", err);

    // Check for email-specific errors
    if (err.message && err.message.includes("Email")) {
      return res
        .status(500)
        .json({ error: "Failed to send email. Please try again later." });
    }

    res
      .status(500)
      .json({ error: "Server error occurred. Please try again later." });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using token from email link
// @access  Public
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    console.log("🔍 Reset password attempt:", {
      tokenReceived: !!token,
      tokenLength: token?.length,
      passwordReceived: !!newPassword,
    });

    // Validation
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Find user with this token
    const user = await User.findOne({ where: { reset_token: token } });

    console.log("🔍 User lookup result:", {
      userFound: !!user,
      userId: user?.id,
      hasResetToken: !!user?.reset_token,
      hasExpiry: !!user?.reset_token_expiry,
    });

    if (!user) {
      console.log("❌ No user found with this reset token");
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Check if reset_token_expiry exists and token has expired
    if (!user.reset_token_expiry) {
      console.log("❌ User has no reset_token_expiry");
      return res
        .status(400)
        .json({ error: "Invalid reset token. Please request a new one." });
    }

    const now = new Date();
    const expiry = new Date(user.reset_token_expiry);

    console.log("🔍 Token expiry check:", {
      now: now.toISOString(),
      expiry: expiry.toISOString(),
      isExpired: now > expiry,
    });

    if (now > expiry) {
      console.log("❌ Token has expired");
      return res
        .status(400)
        .json({ error: "Reset token has expired. Please request a new one." });
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password and clear reset token
    await User.update(
      {
        passwordHash: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      },
      { where: { id: user.id } },
    );

    console.log(`✅ Password reset successful for ${user.email}`);

    res.json({
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res
      .status(500)
      .json({ error: "Server error occurred. Please try again later." });
  }
});

export default router;
