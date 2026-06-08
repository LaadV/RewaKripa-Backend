// ============================================================
//  REWA KRIPA TRAVELS — Staff Routes
//  src/routes/staff.js
//
//  GET    /api/staff        — list staff (public for check-in page)
//  GET    /api/staff/:id    — single staff member (admin)
//  POST   /api/staff        — add staff member    (admin)
//  PUT    /api/staff/:id    — update staff member (admin)
//  DELETE /api/staff/:id    — soft-delete (set active=false) (admin)
// ============================================================

const router          = require('express').Router();
const { supabase }    = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const VALID_ROLES = ['driver', 'conductor', 'helper', 'office'];

// ── GET /api/staff ────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { role, active = 'true', bus_id } = req.query;

    let query = supabase
      .from('staff')
      .select('*')
      .order('name', { ascending: true });

    // Filter active only by default
    if (active !== 'all') {
      query = query.eq('active', active === 'true');
    }

    if (role && VALID_ROLES.includes(role)) {
      query = query.eq('role', role);
    }

    if (bus_id) {
      query = query.eq('bus_id', bus_id);
    }

    const { data, error } = await query;
    if (error) throw createError(500, error.message);

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/staff/:id ────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw createError(400, 'Invalid staff id');

    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw createError(404, `Staff member ${id} not found`);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/staff ───────────────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      name, role, phone, whatsapp = '',
      photo_url = '', bus_id = '', bus_plate = '',
      salary = 0, join_date = '', address = '',
      id_proof = '', active = true,
    } = req.body;

    if (!name || !role || !phone) {
      throw createError(400, 'name, role and phone are required');
    }

    if (!VALID_ROLES.includes(role)) {
      throw createError(400, `role must be one of: ${VALID_ROLES.join(', ')}`);
    }

    const row = {
      name, role, phone, whatsapp, photo_url,
      bus_id, bus_plate, salary, join_date,
      address, id_proof, active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('staff')
      .insert(row)
      .select()
      .single();

    if (error) throw createError(500, error.message);

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/staff/:id ────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw createError(400, 'Invalid staff id');

    if (req.body.role && !VALID_ROLES.includes(req.body.role)) {
      throw createError(400, `role must be one of: ${VALID_ROLES.join(', ')}`);
    }

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw createError(500, error.message);
    if (!data)  throw createError(404, `Staff member ${id} not found`);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/staff/:id  (soft delete) ─────────────────────
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw createError(400, 'Invalid staff id');

    // Soft delete — set active = false
    const { data, error } = await supabase
      .from('staff')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw createError(500, error.message);
    if (!data)  throw createError(404, `Staff member ${id} not found`);

    res.json({ success: true, message: `Staff member ${id} deactivated` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
