// ============================================================
//  REWA KRIPA TRAVELS — Attendance Routes
//  src/routes/attendance.js
//
//  GET  /api/attendance              — get attendance for a date
//  GET  /api/attendance/range        — get attendance for date range
//  GET  /api/attendance/monthly      — monthly sheet for a staff
//  POST /api/attendance              — mark/update attendance (admin)
//  DELETE /api/attendance/:id        — delete a record (admin)
// ============================================================

const router          = require('express').Router();
const { supabase }    = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const VALID_STATUSES = ['present', 'absent', 'halfday', 'leave', 'late'];
const VALID_ROLES    = ['driver', 'conductor', 'helper', 'office'];

// ── GET /api/attendance?date=YYYY-MM-DD&role=driver ───────────
router.get('/', async (req, res, next) => {
  try {
    const { date, role, bus_id } = req.query;

    if (!date) throw createError(400, 'date query param is required (YYYY-MM-DD)');

    let query = supabase
      .from('attendance')
      .select('*')
      .eq('date', date)
      .order('staff_name', { ascending: true });

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

// ── GET /api/attendance/range?from=&to=&role= ─────────────────
router.get('/range', async (req, res, next) => {
  try {
    const { from, to, role, bus_id } = req.query;

    if (!from || !to) {
      throw createError(400, 'from and to query params are required (YYYY-MM-DD)');
    }

    let query = supabase
      .from('attendance')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });

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

// ── GET /api/attendance/monthly?month=YYYY-MM&staff_id= ───────
router.get('/monthly', async (req, res, next) => {
  try {
    const { month, staff_id, role } = req.query;

    if (!month) throw createError(400, 'month query param is required (YYYY-MM)');

    // Build date range for the full month
    const [yr, mo] = month.split('-').map(Number);
    const from = `${month}-01`;
    const to   = new Date(yr, mo, 0).toISOString().split('T')[0]; // last day

    let query = supabase
      .from('attendance')
      .select('*')
      .gte('date', from)
      .lte('date', to);

    if (staff_id) query = query.eq('staff_id', parseInt(staff_id, 10));
    if (role && VALID_ROLES.includes(role)) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) throw createError(500, error.message);

    res.json({ success: true, data: data || [], month, from, to });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/attendance  (mark / upsert) ────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      staff_id, staff_name, role, bus_id = '',
      bus_plate = '', date, status,
      check_in = '', note = '',
      marked_by = 'admin', wa_confirmed = false,
    } = req.body;

    if (!staff_id || !date || !status) {
      throw createError(400, 'staff_id, date and status are required');
    }

    if (!VALID_STATUSES.includes(status)) {
      throw createError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const row = {
      staff_id  : parseInt(staff_id, 10),
      staff_name: staff_name || '',
      role      : role || '',
      bus_id,
      bus_plate,
      date,
      status,
      check_in,
      note,
      marked_by,
      wa_confirmed,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('attendance')
      .upsert(row, { onConflict: 'staff_id,date' })
      .select()
      .single();

    if (error) throw createError(500, error.message);

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/attendance/:id  (admin) ──────────────────────
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw createError(400, 'Invalid attendance id');

    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id);

    if (error) throw createError(500, error.message);

    res.json({ success: true, message: `Attendance record ${id} deleted` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
