// ============================================================
//  REWA KRIPA TRAVELS — Buses Routes
//  src/routes/buses.js
//
//  GET    /api/buses        — list all buses (public)
//  GET    /api/buses/:id    — single bus     (public)
//  POST   /api/buses        — create bus     (admin)
//  PUT    /api/buses/:id    — update bus     (admin)
//  DELETE /api/buses/:id    — delete bus     (admin)
//
//  NOTE: Buses are stored inside the site_config JSON in Supabase.
//  These routes read/mutate that config so all pages stay in sync.
// ============================================================

const router          = require('express').Router();
const { supabase }    = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

// ── Helper: load full config ──────────────────────────────────
async function loadConfig() {
  const { data, error } = await supabase
    .from('site_config')
    .select('config_json')
    .eq('id', 1)
    .single();

  if (error && error.code !== 'PGRST116') throw createError(500, error.message);
  return data ? data.config_json : null;
}

// ── Helper: save full config ──────────────────────────────────
async function saveConfig(config) {
  const { error } = await supabase
    .from('site_config')
    .upsert(
      { id: 1, config_json: config, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (error) throw createError(500, error.message);
}

// ── GET /api/buses ────────────────────────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const config = await loadConfig();
    const buses  = config ? config.buses : [];
    res.json({ success: true, data: buses });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/buses/:id ────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const config = await loadConfig();
    const bus    = config ? config.buses.find((b) => b.id === req.params.id) : null;

    if (!bus) throw createError(404, `Bus "${req.params.id}" not found`);

    res.json({ success: true, data: bus });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/buses ───────────────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const newBus = req.body;

    if (!newBus.id || !newBus.plate || !newBus.title) {
      throw createError(400, 'id, plate and title are required');
    }

    const config = await loadConfig();
    if (!config) throw createError(500, 'Site config not found');

    // Prevent duplicate IDs
    if (config.buses.find((b) => b.id === newBus.id)) {
      throw createError(409, `Bus id "${newBus.id}" already exists`);
    }

    config.buses.push(newBus);
    await saveConfig(config);

    res.status(201).json({ success: true, data: newBus });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/buses/:id ────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const config = await loadConfig();
    if (!config) throw createError(500, 'Site config not found');

    const idx = config.buses.findIndex((b) => b.id === req.params.id);
    if (idx === -1) throw createError(404, `Bus "${req.params.id}" not found`);

    // Merge — keep existing fields, override with body
    config.buses[idx] = { ...config.buses[idx], ...req.body, id: req.params.id };
    await saveConfig(config);

    res.json({ success: true, data: config.buses[idx] });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/buses/:id ─────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const config = await loadConfig();
    if (!config) throw createError(500, 'Site config not found');

    const before = config.buses.length;
    config.buses = config.buses.filter((b) => b.id !== req.params.id);

    if (config.buses.length === before) {
      throw createError(404, `Bus "${req.params.id}" not found`);
    }

    await saveConfig(config);

    res.json({ success: true, message: `Bus ${req.params.id} deleted` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
