// ============================================================
//  REWA KRIPA TRAVELS — Seats Routes
//  GET    /api/seats?busId=&date=        → booked seats
//  POST   /api/seats/book                → book seats (public)
//  DELETE /api/seats/:busId/:date/:num   → unblock one seat (admin)
//  DELETE /api/seats/:busId/:date        → clear date (admin)
//  DELETE /api/seats/:busId              → full bus reset (admin)
// ============================================================

const express       = require('express');
const { supabase }  = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const router = express.Router();

// ── GET booked seats ─────────────────────────────────────────
router.get('/', async (req, res, next) => {
  const { busId, date } = req.query;
  if (!busId || !date) return next(createError(400, 'busId and date required'));

  const { data, error } = await supabase
    .from('seats')
    .select('*')
    .eq('bus_id', busId)
    .eq('travel_date', date);

  if (error) return next(error);
  res.json({ success: true, data });
});

// ── POST book seats (public) ─────────────────────────────────
router.post('/book', async (req, res, next) => {
  const { busId, date, seats } = req.body || {};
  if (!busId || !date || !Array.isArray(seats) || !seats.length) {
    return next(createError(400, 'busId, date, and seats[] required'));
  }

  const rows = seats.map(s => ({
    bus_id          : busId,
    travel_date     : date,
    seat_num        : s.num,
    gender          : s.gender || 'M',
    passenger_name  : s.passenger_name || '',
    passenger_phone : s.passenger_phone || '',
    status          : 'booked',
    booked_at       : new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('seats')
    .upsert(rows, { onConflict: 'bus_id,travel_date,seat_num' })
    .select();

  if (error) return next(error);
  res.json({ success: true, data });
});

// ── DELETE unblock single seat (admin) ───────────────────────
router.delete('/:busId/:date/:num', requireAuth, async (req, res, next) => {
  const { busId, date, num } = req.params;
  const { error } = await supabase
    .from('seats')
    .delete()
    .eq('bus_id', busId)
    .eq('travel_date', date)
    .eq('seat_num', parseInt(num));

  if (error) return next(error);
  res.json({ success: true });
});

// ── DELETE clear all seats for a date (admin) ─────────────────
router.delete('/:busId/:date', requireAuth, async (req, res, next) => {
  const { busId, date } = req.params;
  const { error } = await supabase
    .from('seats')
    .delete()
    .eq('bus_id', busId)
    .eq('travel_date', date);

  if (error) return next(error);
  res.json({ success: true });
});

// ── DELETE full bus reset (admin) ─────────────────────────────
router.delete('/:busId', requireAuth, async (req, res, next) => {
  const { busId } = req.params;
  const { error } = await supabase
    .from('seats')
    .delete()
    .eq('bus_id', busId);

  if (error) return next(error);
  res.json({ success: true });
});

module.exports = router;
