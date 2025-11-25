const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateRequired = (fields) => (req, res, next) => {
  const missing = fields.filter(field => !req.body[field]);
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }
  next();
};

const validateEmailFormat = (req, res, next) => {
  if (req.body.email && !validateEmail(req.body.email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  next();
};

const validatePasswordStrength = (req, res, next) => {
  const password = req.body.password || req.body.newPassword;
  if (password && !validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  next();
};

module.exports = {
  validateRequired,
  validateEmailFormat,
  validatePasswordStrength
};