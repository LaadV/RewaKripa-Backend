// ============================================================
//  REWA KRIPA TRAVELS — Site Config Routes
//  GET  /api/config      → get saved site config
//  POST /api/config      → save site config (admin)
// ============================================================

const express        = require('express');
const { supabase }   = require('../config/supabase');
const { requireAuth }  = require('../middleware/auth');
const { createError }  = require('../middleware/errorHandler');

const router = express.Router();

// ── GET config ───────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  const { data, error } = await supabase
    .from('site_config')
    .select('config_json, updated_at')
    .eq('id', 1)
    .single();

  if (error && error.code === 'PGRST116') {
    // No config saved yet — return null
    return res.json({ success: true, data: null });
  }
  if (error) return next(error);
  res.json({ success: true, data: data.config_json, updatedAt: data.updated_at });
});

// ── POST / save config (admin) ───────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  const config = req.body;
  if (!config || typeof config !== 'object') {
    return next(createError(400, 'Config object required'));
  }

  const { data, error } = await supabase
    .from('site_config')
    .upsert({ id: 1, config_json: config, updated_at: new Date().toISOString() })
    .select();

  if (error) return next(error);
  res.json({ success: true, data });
});

module.exports = router;
