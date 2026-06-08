// ============================================================
//  REWA KRIPA TRAVELS — Bus Routes Routes
//  src/routes/routes.js
//
//  GET    /api/routes        — list all routes (public)
//  GET    /api/routes/:id    — single route    (public)
//  POST   /api/routes        — create route    (admin)
//  PUT    /api/routes/:id    — update route    (admin)
//  DELETE /api/routes/:id    — delete route    (admin)
// ============================================================

const router          = require('express').Router();
const { supabase }    = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

// ── Shared config helpers ─────────────────────────────────────
async function loadConfig() {
  const { data, error } = await supabase
    .from('site_config')
    .select('config_json')
    .eq('id', 1)
    .single();
  if (error && error.code !== 'PGRST116') throw createError(500, error.message);
  return data ? data.config_json : null;
}

async function saveConfig(config) {
  const { error } = await supabase
    .from('site_config')
    .upsert(
      { id: 1, config_json: config, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (error) throw createError(500, error.message);
}

// ── GET /api/routes ───────────────────────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const config = await loadConfig();
    res.json({ success: true, data: config ? config.routes : [] });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/routes/:id ───────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const config = await loadConfig();
    const route  = config ? config.routes.find((r) => r.id === req.params.id) : null;
    if (!route) throw createError(404, `Route "${req.params.id}" not found`);
    res.json({ success: true, data: route });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/routes ──────────────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const newRoute = req.body;
    if (!newRoute.id || !newRoute.from || !newRoute.to) {
      throw createError(400, 'id, from and to are required');
    }

    const config = await loadConfig();
    if (!config) throw createError(500, 'Site config not found');

    if (config.routes.find((r) => r.id === newRoute.id)) {
      throw createError(409, `Route id "${newRoute.id}" already exists`);
    }

    config.routes.push(newRoute);
    await saveConfig(config);

    res.status(201).json({ success: true, data: newRoute });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/routes/:id ───────────────────────────────────────
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const config = await loadConfig();
    if (!config) throw createError(500, 'Site config not found');

    const idx = config.routes.findIndex((r) => r.id === req.params.id);
    if (idx === -1) throw createError(404, `Route "${req.params.id}" not found`);

    config.routes[idx] = { ...config.routes[idx], ...req.body, id: req.params.id };
    await saveConfig(config);

    res.json({ success: true, data: config.routes[idx] });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/routes/:id ────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const config = await loadConfig();
    if (!config) throw createError(500, 'Site config not found');

    const before   = config.routes.length;
    config.routes  = config.routes.filter((r) => r.id !== req.params.id);

    if (config.routes.length === before) {
      throw createError(404, `Route "${req.params.id}" not found`);
    }

    await saveConfig(config);
    res.json({ success: true, message: `Route ${req.params.id} deleted` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
