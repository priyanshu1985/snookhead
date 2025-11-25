// Simple in-memory token store for refresh tokens and password resets.
// Note: This is volatile (memory) and for development only.
const refreshTokens = new Map(); // userId -> refreshToken
const resetTokens = new Map(); // token -> { userId, expiresAt }

function setRefreshToken(userId, token) {
  refreshTokens.set(userId.toString(), token);
}
function getRefreshToken(userId) {
  return refreshTokens.get(userId.toString());
}
function revokeRefreshToken(userId) {
  refreshTokens.delete(userId.toString());
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

module.exports = {
  refreshTokens,
  setRefreshToken, getRefreshToken, revokeRefreshToken,
  setResetToken, getResetToken, revokeResetToken
};
