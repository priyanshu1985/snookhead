// Simple in-memory token store for refresh tokens and password resets.
// Note: This is volatile (memory) and for development only.
// In production, use Redis or database storage.
const refreshTokens = new Map(); // userId -> { token, expiresAt, createdAt }
const resetTokens = new Map(); // token -> { userId, expiresAt }

const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds - users stay logged in until manual logout

function setRefreshToken(userId, token) {
  const expiresAt = Date.now() + REFRESH_TOKEN_EXPIRY;
  refreshTokens.set(userId.toString(), {
    token,
    expiresAt,
    createdAt: Date.now(),
  });
}

function getRefreshToken(userId) {
  const tokenData = refreshTokens.get(userId.toString());
  if (!tokenData) return null;

  // Check if token has expired
  if (tokenData.expiresAt < Date.now()) {
    refreshTokens.delete(userId.toString());
    return null;
  }

  return tokenData.token;
}

function findUserByRefreshToken(token) {
  for (const [userId, tokenData] of refreshTokens.entries()) {
    if (tokenData.token === token) {
      // Check if token has expired
      if (tokenData.expiresAt < Date.now()) {
        refreshTokens.delete(userId);
        return null;
      }
      return userId;
    }
  }
  return null;
}

function revokeRefreshToken(userId) {
  refreshTokens.delete(userId.toString());
}

function revokeAllRefreshTokens() {
  refreshTokens.clear();
}

function cleanupExpiredRefreshTokens() {
  const now = Date.now();
  for (const [userId, tokenData] of refreshTokens.entries()) {
    if (tokenData.expiresAt < now) {
      refreshTokens.delete(userId);
    }
  }
}

function setResetToken(token, info) {
  resetTokens.set(token, info);
}

function getResetToken(token) {
  const info = resetTokens.get(token);
  if (!info) return null;
  if (info.expiresAt && info.expiresAt < Date.now()) {
    resetTokens.delete(token);
    return null;
  }
  return info;
}

function revokeResetToken(token) {
  resetTokens.delete(token);
}

// Cleanup expired tokens every hour
setInterval(cleanupExpiredRefreshTokens, 60 * 60 * 1000);

module.exports = {
  refreshTokens,
  setRefreshToken,
  getRefreshToken,
  findUserByRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  cleanupExpiredRefreshTokens,
  setResetToken,
  getResetToken,
  revokeResetToken,
};
