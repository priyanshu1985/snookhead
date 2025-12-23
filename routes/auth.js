const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const tokenStore = require('../utils/tokenStore');
const { validateRequired, validateEmailFormat, validatePasswordStrength } = require('../middleware/validation');
const { rateLimit } = require('../middleware/rateLimiter');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'change_this_secret') {
  console.error('WARNING: Using default JWT secret. Change JWT_SECRET in .env for production!');
}
const JWT_EXP = process.env.JWT_EXP || '15m'; // access token expiry
const REFRESH_EXP = 7 * 24 * 3600 * 1000; // 7 days in ms

function makeAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXP });
}
function makeRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

// register
router.post('/register', 
  validateRequired(['name', 'email', 'password']),
  validateEmailFormat,
  validatePasswordStrength,
  async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Debug logging
    console.log('=== REGISTRATION DEBUG ===');
    console.log('Full request body:', JSON.stringify(req.body));
    console.log('Extracted role:', role);

    // Prevent admin role creation during registration
    if (role === 'admin') {
      return res.status(403).json({ error: 'Cannot register as admin' });
    }

    // Use the provided role, default to 'customer' only if role is undefined/null/empty
    const validRoles = ['staff', 'owner', 'customer'];
    let userRole = 'customer';
    if (role && typeof role === 'string' && validRoles.includes(role.toLowerCase())) {
      userRole = role.toLowerCase();
    }
    console.log('Final role to save:', userRole);

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash, phone, role: userRole });

    console.log('User created with role:', user.role);

    // Generate tokens so user is logged in after registration
    const access = makeAccessToken(user);
    const refresh = makeRefreshToken();
    tokenStore.setRefreshToken(user.id, refresh);

    res.status(201).json({
      accessToken: access,
      refreshToken: refresh,
      expiresIn: JWT_EXP,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// login -> returns access token + refresh token
router.post('/login', 
  rateLimit(5, 15 * 60 * 1000),
  validateRequired(['email', 'password']),
  validateEmailFormat,
  async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid creds' });
    const ok = await user.checkPassword(password);
    if (!ok) return res.status(400).json({ error: 'Invalid creds' });
    const access = makeAccessToken(user);
    const refresh = makeRefreshToken();
    tokenStore.setRefreshToken(user.id, refresh);
    res.json({
      accessToken: access,
      refreshToken: refresh,
      expiresIn: JWT_EXP,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'No refresh token' });
    // find userId by token (reverse lookup)
    const userId = [...tokenStore.refreshTokens || []].find(([k,v]) => v === refreshToken);
    let foundUserId = null;
    if (userId && userId.length) foundUserId = userId[0];
    // fallback: search map
    if (!foundUserId) {
      for (const [k,v] of tokenStore.refreshTokens ? tokenStore.refreshTokens.entries() : []) {
        if (v === refreshToken) { foundUserId = k; break; }
      }
    }
    if (!foundUserId) return res.status(401).json({ error: 'Invalid refresh token' });
    const user = await User.findByPk(foundUserId);
    if (!user) return res.status(401).json({ error: 'Invalid refresh token' });
    const access = makeAccessToken(user);
    res.json({ accessToken: access, expiresIn: JWT_EXP });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// logout (revoke refresh)
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'No refresh token' });
    // remove it
    for (const [k,v] of tokenStore.refreshTokens ? tokenStore.refreshTokens.entries() : []) {
      if (v === refreshToken) { tokenStore.revokeRefreshToken(k); break; }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// request password reset -> returns reset token (in prod you'd email it)
router.post('/request-reset', 
  rateLimit(3, 15 * 60 * 1000),
  validateRequired(['email']),
  validateEmailFormat,
  async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Unknown email' });
    const token = crypto.randomBytes(20).toString('hex');
    tokenStore.setResetToken(token, { userId: user.id, expiresAt: Date.now() + 3600 * 1000 }); // 1 hour
    // In real app: send email. Here we return token for dev/testing.
    res.json({ resetToken: token, expiresIn: 3600 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// perform password reset
router.post('/reset-password', 
  validateRequired(['token', 'newPassword']),
  validatePasswordStrength,
  async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and newPassword required' });
    const info = tokenStore.getResetToken(token);
    if (!info) return res.status(400).json({ error: 'Invalid or expired token' });
    const user = await User.findByPk(info.userId);
    if (!user) return res.status(400).json({ error: 'User not found' });
    const hash = await bcrypt.hash(newPassword, 10);
    await user.update({ passwordHash: hash });
    tokenStore.revokeResetToken(token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
