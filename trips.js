// ============================================================
//  REWA KRIPA TRAVELS — Trips Routes
//  src/routes/trips.js
//
//  GET    /api/trips        — list all trips (public)
//  GET    /api/trips/:id    — single trip    (public)
//  POST   /api/trips        — create trip    (admin)
//  PUT    /api/trips/:id    — update trip    (admin)
//  DELETE /api/trips/:id    — delete trip    (admin)
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

// ── GET /api/trips ────────────────────────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const config = await loadConfig();
    res.json({ success: true, data: config ? config.trips : [] });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/trips/:id ────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const config = await loadConfig();
    const trip   = config ? config.trips.find((t) => t.id === req.params.id) : null;
    if (!trip) throw createError(404, `Trip "${req.params.id}" not found`);
    res.json({ success: true, data: trip });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/trips ───────────────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const newTrip = req.body;
    if (!newTrip.id || !newTrip.title) {
      throw createError(400, 'id and title are required');
    }

    const config = await loadConfig();
    if (!config) throw createError(500, 'Site config not found');

    if (config.trips.find((t) => t.id === newTrip.id)) {
      throw createError(409, `Trip id "${newTrip.id}" already exists`);
    }

    // Ensure arrays exist
    newTrip.itinerary  = newTrip.itinerary  || [];
    newTrip.inclusions = newTrip.inclusions || [];
    newTrip.exclusions = newTrip.exclusions || [];
    newTrip.notes      = newTrip.notes      || [];

    config.trips.push(newTrip);
    await saveConfig(config);

    res.status(201).json({ success: true, data: newTrip });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/trips/:id ────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const config = await loadConfig();
    if (!config) throw createError(500, 'Site config not found');

    const idx = config.trips.findIndex((t) => t.id === req.params.id);
    if (idx === -1) throw createError(404, `Trip "${req.params.id}" not found`);

    config.trips[idx] = { ...config.trips[idx], ...req.body, id: req.params.id };
    await saveConfig(config);

    res.json({ success: true, data: config.trips[idx] });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/trips/:id ─────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const config = await loadConfig();
    if (!config) throw createError(500, 'Site config not found');

    const before  = config.trips.length;
    config.trips  = config.trips.filter((t) => t.id !== req.params.id);

    if (config.trips.length === before) {
      throw createError(404, `Trip "${req.params.id}" not found`);
    }

    await saveConfig(config);
    res.json({ success: true, message: `Trip ${req.params.id} deleted` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
