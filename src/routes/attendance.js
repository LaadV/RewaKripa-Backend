// ============================================================
//  REWA KRIPA TRAVELS — Attendance Routes
//  GET  /api/attendance?date=&staffId=&from=&to=
//  POST /api/attendance        → mark/update attendance (admin)
//  POST /api/attendance/bulk   → mark all staff at once (admin)
// ============================================================

const express        = require('express');
const { supabase }   = require('../config/supabase');
const { requireAuth }  = require('../middleware/auth');
const { createError }  = require('../middleware/errorHandler');

const router = express.Router();

// ── GET attendance ───────────────────────────────────────────
router.get('/', async (req, res, next) => {
  const { date, staffId, from, to } = req.query;

  let query = supabase.from('attendance').select('*, staff(name, role, bus_plate)');

  if (date)    query = query.eq('date', date);
  if (staffId) query = query.eq('staff_id', staffId);
  if (from)    query = query.gte('date', from);
  if (to)      query = query.lte('date', to);

  query = query.order('date', { ascending: false });

  const { data, error } = await query;
  if (error) return next(error);
  res.json({ success: true, data });
});

// ── POST mark attendance ─────────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  const { staff_id, date, status, note, check_in, marked_by } = req.body || {};

  if (!staff_id || !date || !status) {
    return next(createError(400, 'staff_id, date and status required'));
  }

  const row = {
    staff_id, date, status,
    note       : note      || '',
    check_in   : check_in  || '',
    marked_by  : marked_by || 'admin',
    updated_at : new Date().toISOString(),
  };

  // Get staff name/role for denormalisation
  const { data: staffRow } = await supabase
    .from('staff')
    .select('name, role, bus_id, bus_plate')
    .eq('id', staff_id)
    .single();

  if (staffRow) {
    row.staff_name = staffRow.name;
    row.role       = staffRow.role;
    row.bus_id     = staffRow.bus_id  || '';
    row.bus_plate  = staffRow.bus_plate || '';
  }

  const { data, error } = await supabase
    .from('attendance')
    .upsert(row, { onConflict: 'staff_id,date' })
    .select();

  if (error) return next(error);
  res.json({ success: true, data });
});

// ── POST bulk mark (mark all present/absent) ─────────────────
router.post('/bulk', requireAuth, async (req, res, next) => {
  const { date, status, staffIds } = req.body || {};
  if (!date || !status || !Array.isArray(staffIds)) {
    return next(createError(400, 'date, status and staffIds[] required'));
  }

  const { data: staffRows } = await supabase
    .from('staff')
    .select('id, name, role, bus_id, bus_plate')
    .in('id', staffIds);

  const rows = (staffRows || []).map(s => ({
    staff_id   : s.id,
    staff_name : s.name,
    role       : s.role,
    bus_id     : s.bus_id    || '',
    bus_plate  : s.bus_plate || '',
    date, status,
    note       : '',
    check_in   : '',
    marked_by  : 'admin',
    updated_at : new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'staff_id,date' })
    .select();

  if (error) return next(error);
  res.json({ success: true, data });
});

module.exports = router;
