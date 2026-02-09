// Token store implementation using database via Supabase client helper (models)
import { Token } from "../models/index.js";

const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

async function setRefreshToken(userId, token) {
  try {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY).toISOString();
    
    // First remove any existing refresh tokens for this user to keep it clean (optional strictly, but good for security)
    // Or allow multiple sessions? Let's allow multiple sessions but store them.
    // The previous implementation used a Map which only allowed ONE token per user (userId -> tokenData).
    // To match that behavior, we should delete old tokens for this user first if we want single session,
    // or just insert if we want multi-device.
    // Given the Map implementation keys off userId, it implies one active session per user.
    await revokeRefreshToken(userId);

    await Token.create({
      user_id: userId,
      token,
      type: 'refresh',
      expires_at: expiresAt
    });
  } catch (err) {
    console.error("Failed to set refresh token:", err);
  }
}

async function getRefreshToken(userId) {
  try {
    // Find valid refresh token for user
    const tokenRecord = await Token.findOne({
      where: {
        user_id: userId,
        type: 'refresh'
      }
    });

    if (!tokenRecord) return null;

    // Check expiry
    if (new Date(tokenRecord.expires_at) < new Date()) {
      await Token.destroy({ where: { id: tokenRecord.id } });
      return null;
    }

    return tokenRecord.token;
  } catch (err) {
    console.error("Failed to get refresh token:", err);
    return null;
  }
}

async function findUserByRefreshToken(token) {
  try {
    const tokenRecord = await Token.findOne({
      where: {
        token,
        type: 'refresh'
      }
    });

    if (!tokenRecord) return null;

    // Check expiry
    if (new Date(tokenRecord.expires_at) < new Date()) {
      await Token.destroy({ where: { id: tokenRecord.id } });
      return null;
    }

    return tokenRecord.user_id;
  } catch (err) {
    console.error("Error finding user by refresh token:", err);
    return null;
  }
}

async function revokeRefreshToken(userId) {
  try {
    await Token.destroy({
      where: {
        user_id: userId,
        type: 'refresh'
      }
    });
  } catch (err) {
      console.error("Error revoking refresh token:", err);
  }
}

async function revokeAllRefreshTokens() {
  try {
    await Token.destroy({ where: { type: 'refresh' } });
  } catch (err) {
    console.error("Error revoking all tokens:", err);
  }
}

async function cleanupExpiredRefreshTokens() {
  try {
    await Token.destroyExpired();
  } catch (err) {
    console.error("Error cleaning up expired tokens:", err);
  }
}

async function setResetToken(token, info) {
  try {
    // Info contains { userId, expiresAt }
    // We map 'info.userId' to 'user_id' column
    // and 'info.expiresAt' to 'expires_at' column
    
    // Ensure we convert expiry to ISO string if it's a number/date
    const expiresAt = new Date(info.expiresAt).toISOString();

    await Token.create({
      token,
      user_id: info.userId,
      type: 'reset',
      expires_at: expiresAt
    });
  } catch (err) {
     console.error("Error setting reset token:", err);
  }
}

async function getResetToken(token) {
  try {
    const tokenRecord = await Token.findOne({
      where: {
        token,
        type: 'reset'
      }
    });

    if (!tokenRecord) return null;

    if (new Date(tokenRecord.expires_at) < new Date()) {
      await Token.destroy({ where: { id: tokenRecord.id } });
      return null;
    }

    // Return format expected by consumers: { userId, expiresAt }
    return {
      userId: tokenRecord.user_id,
      expiresAt: new Date(tokenRecord.expires_at).getTime()
    };
  } catch (err) {
    console.error("Error getting reset token:", err);
    return null;
  }
}

async function revokeResetToken(token) {
  try {
    await Token.destroy({
      where: {
        token,
        type: 'reset'
      }
    });
  } catch (err) {
      console.error("Error revoking reset token:", err);
  }
}

// Cleanup expired tokens every hour
// Note: In serverless options this might not run reliably, but for kept-alive server it works.
setInterval(cleanupExpiredRefreshTokens, 60 * 60 * 1000);

export default {
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
