// ============================================================
//  REWA KRIPA TRAVELS — Seats Routes
//  src/routes/seats.js
//
//  GET    /api/seats              — get booked seats for bus+date
//  POST   /api/seats              — book one or more seats
//  DELETE /api/seats/:seatNum     — unblock a single seat  (admin)
//  DELETE /api/seats              — unblock all for bus+date (admin)
//  DELETE /api/seats/bus/:busId   — full reset for a bus    (admin)
// ============================================================

const router            = require('express').Router();
const { supabase }      = require('../config/supabase');
const { requireAuth }   = require('../middleware/auth');
const { createError }   = require('../middleware/errorHandler');

// ── Helpers ──────────────────────────────────────────────────

/** Parse & validate a date string → YYYY-MM-DD */
function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

/** Check auto-reset: if bus departed 2+ hrs ago wipe seats */
async function checkAndAutoReset(busId, date, departureTime) {
  if (!departureTime) return;

  const m = departureTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return;

  let h = parseInt(m[1], 10);
  let min = parseInt(m[2], 10);
  const ampm = (m[3] || '').toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;

  const dep = new Date(`${date}T00:00:00`);
  dep.setHours(h, min, 0, 0);
  const resetAt = new Date(dep.getTime() + 2 * 60 * 60 * 1000);

  if (new Date() >= resetAt) {
    await supabase
      .from('seats')
      .delete()
      .eq('bus_id', busId)
      .eq('travel_date', date);
  }
}

// ── GET /api/seats ───────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { busId, date, departure } = req.query;

    if (!busId || !date) {
      throw createError(400, 'busId and date query params are required');
    }

    const parsedDate = parseDate(date);
    if (!parsedDate) throw createError(400, 'Invalid date format');

    // Optional auto-reset check
    if (departure) {
      await checkAndAutoReset(busId, parsedDate, departure);
    }

    const { data, error } = await supabase
      .from('seats')
      .select('*')
      .eq('bus_id', busId)
      .eq('travel_date', parsedDate)
      .order('seat_num', { ascending: true });

    if (error) throw createError(500, error.message);

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/seats ──────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { busId, date, seats } = req.body;

    if (!busId || !date || !Array.isArray(seats) || seats.length === 0) {
      throw createError(400, 'busId, date and seats[] are required');
    }

    const parsedDate = parseDate(date);
    if (!parsedDate) throw createError(400, 'Invalid date format');

    // Validate each seat
    for (const s of seats) {
      if (!s.num || !['M', 'F'].includes(s.gender)) {
        throw createError(400, `Invalid seat entry: ${JSON.stringify(s)}`);
      }
      if (!s.passenger_name || !s.passenger_phone) {
        throw createError(400, 'passenger_name and passenger_phone are required for each seat');
      }
    }

    const rows = seats.map((s) => ({
      bus_id         : busId,
      travel_date    : parsedDate,
      seat_num       : s.num,
      gender         : s.gender,
      passenger_name : s.passenger_name.trim(),
      passenger_phone: s.passenger_phone.trim(),
      status         : 'booked',
      booked_at      : new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('seats')
      .upsert(rows, { onConflict: 'bus_id,travel_date,seat_num' })
      .select();

    if (error) throw createError(500, error.message);

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/seats/bus/:busId  (full reset — admin only) ──
router.delete('/bus/:busId', requireAuth, async (req, res, next) => {
  try {
    const { busId } = req.params;

    const { error } = await supabase
      .from('seats')
      .delete()
      .eq('bus_id', busId);

    if (error) throw createError(500, error.message);

    res.json({ success: true, message: `All seats cleared for bus ${busId}` });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/seats/:seatNum  (single unblock — admin only) ─
router.delete('/:seatNum', requireAuth, async (req, res, next) => {
  try {
    const { busId, date } = req.query;
    const seatNum         = parseInt(req.params.seatNum, 10);

    if (!busId || !date || isNaN(seatNum)) {
      throw createError(400, 'busId, date query params and numeric seatNum are required');
    }

    const parsedDate = parseDate(date);
    if (!parsedDate) throw createError(400, 'Invalid date format');

    const { error } = await supabase
      .from('seats')
      .delete()
      .eq('bus_id', busId)
      .eq('travel_date', parsedDate)
      .eq('seat_num', seatNum);

    if (error) throw createError(500, error.message);

    res.json({ success: true, message: `Seat ${seatNum} unblocked` });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/seats  (clear all for bus+date — admin only) ──
router.delete('/', requireAuth, async (req, res, next) => {
  try {
    const { busId, date } = req.query;

    if (!busId) throw createError(400, 'busId is required');

    let query = supabase.from('seats').delete().eq('bus_id', busId);

    if (date) {
      const parsedDate = parseDate(date);
      if (!parsedDate) throw createError(400, 'Invalid date format');
      query = query.eq('travel_date', parsedDate);
    }

    const { error } = await query;
    if (error) throw createError(500, error.message);

    res.json({
      success: true,
      message: date
        ? `All seats cleared for bus ${busId} on ${date}`
        : `All seats cleared for bus ${busId}`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
