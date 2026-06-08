// ============================================================
//  REWA KRIPA TRAVELS — Auth Routes
//  src/routes/auth.js
//
//  POST /api/auth/login   — check admin password → JWT
//  POST /api/auth/logout  — client clears token
//  GET  /api/auth/verify  — check if token is still valid
// ============================================================

const router        = require('express').Router();
const { signAdminToken, requireAuth } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Swift@8606';

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      throw createError(400, 'Password is required');
    }

    if (password !== ADMIN_PASSWORD) {
      throw createError(401, 'Incorrect password');
    }

    const expiresIn = 60 * 60 * 8; // 8 hours
    const token     = signAdminToken(expiresIn);

    res.json({
      success: true,
      data: {
        token,
        expiresIn,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout ────────────────────────────────────
// Token is stateless (JWT), so logout is handled client-side.
// This endpoint just confirms the action cleanly.
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

// ── GET /api/auth/verify ─────────────────────────────────────
router.get('/verify', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: { valid: true, admin: req.admin },
  });
});

module.exports = router;
