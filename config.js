// ============================================================
//  REWA KRIPA TRAVELS — Config Routes
//  src/routes/config.js
//
//  GET /api/config      — fetch site config (public)
//  PUT /api/config      — save site config  (admin only)
// ============================================================

const router          = require('express').Router();
const { supabase }    = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

// ── GET /api/config ──────────────────────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_json, updated_at')
      .eq('id', 1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = row not found — return null so frontend uses defaults
      throw createError(500, error.message);
    }

    res.json({
      success: true,
      data   : data ? data.config_json : null,
      updatedAt: data ? data.updated_at : null,
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/config ──────────────────────────────────────────
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const configJson = req.body;

    if (!configJson || typeof configJson !== 'object') {
      throw createError(400, 'Request body must be a config JSON object');
    }

    const { data, error } = await supabase
      .from('site_config')
      .upsert(
        { id: 1, config_json: configJson, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) throw createError(500, error.message);

    res.json({ success: true, data: data.config_json });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
