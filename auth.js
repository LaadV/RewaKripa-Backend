// ============================================================
//  REWA KRIPA TRAVELS — Auth Middleware
//  src/middleware/auth.js
// ============================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rewa-kripa-secret-change-in-prod';

/**
 * Protects any route that requires admin login.
 * Reads Bearer token from Authorization header.
 */
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;   // { role: 'admin', iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

/**
 * Generates a signed JWT for the admin.
 * @param {number} expiresInSeconds  default 8 hours
 */
function signAdminToken(expiresInSeconds = 60 * 60 * 8) {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: expiresInSeconds });
}

module.exports = { requireAuth, signAdminToken };
