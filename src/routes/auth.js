// ============================================================
//  REWA KRIPA TRAVELS — Auth Routes
//  POST /api/auth/login  → returns JWT
// ============================================================

const express = require('express');
const { signAdminToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Swift@8606';

/**
 * POST /api/auth/login
 * Body: { password: string }
 * Returns: { success, token, expiresIn }
 */
router.post('/login', (req, res) => {
  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ success: false, error: 'Password required' });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Incorrect password' });
  }

  const token = signAdminToken();
  return res.json({ success: true, token, expiresIn: 60 * 60 * 8 });
});

/**
 * GET /api/auth/verify
 * Requires: Authorization: Bearer <token>
 * Returns: { success, admin }
 */
router.get('/verify', requireAuth, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

module.exports = router;
