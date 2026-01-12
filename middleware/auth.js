const jwt = require("jsonwebtoken");
const tokenStore = require("../utils/tokenStore");
require("dotenv").config();

const auth = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) {
    return res.status(401).json({
      error: "No token provided",
      code: "TOKEN_MISSING",
      message: "Please provide an access token.",
    });
  }

  const parts = header.split(" ");
  if (parts.length !== 2) {
    return res.status(401).json({
      error: "Invalid token format",
      code: "TOKEN_INVALID",
      message: "Token format should be: Bearer <token>",
    });
  }

  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        code: "TOKEN_EXPIRED",
        message: "Access token has expired. Please refresh your token.",
      });
    }
    // For any other JWT error (invalid signature, malformed, etc.)
    return res.status(401).json({
      error: "Invalid token",
      code: "TOKEN_INVALID",
      message: "The provided token is invalid. Please refresh your token.",
    });
  }
};

const authOptional = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) {
    req.user = null;
    return next();
  }

  const parts = header.split(" ");
  if (parts.length !== 2) {
    req.user = null;
    return next();
  }

  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
  } catch (err) {
    req.user = null;
  }

  next();
};

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };

const validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    // Check if refresh token exists in our store
    const userId = tokenStore.findUserByRefreshToken(refreshToken);
    if (!userId) {
      return res.status(401).json({
        error: "Invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    req.refreshTokenUserId = userId;
    next();
  } catch (error) {
    return res.status(500).json({ error: "Error validating refresh token" });
  }
};

module.exports = { auth, authOptional, authorize, validateRefreshToken };
