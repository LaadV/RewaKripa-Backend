// ============================================================
//  REWA KRIPA TRAVELS — Finance Routes
//  GET  /api/finance?busId=&type=&from=&to=&category=
//  POST /api/finance           → add entry (admin)
//  POST /api/finance/bulk      → add multiple entries (admin)
//  DELETE /api/finance/:id     → delete entry (admin)
//  GET  /api/finance/summary   → P&L summary by bus
// ============================================================

const express        = require('express');
const { supabase }   = require('../config/supabase');
const { requireAuth }  = require('../middleware/auth');
const { createError }  = require('../middleware/errorHandler');

const router = express.Router();

// ── GET summary (must be before /:id) ────────────────────────
router.get('/summary', requireAuth, async (req, res, next) => {
  const { from, to, busId } = req.query;
  let query = supabase.from('finance_entries').select('*');
  if (from)  query = query.gte('date', from);
  if (to)    query = query.lte('date', to);
  if (busId && busId !== 'all') query = query.eq('bus_id', busId);

  const { data, error } = await query;
  if (error) return next(error);

  // Group by bus
  const summary = {};
  (data || []).forEach(e => {
    if (!summary[e.bus_id]) summary[e.bus_id] = { income: 0, expense: 0, entries: 0 };
    if (e.type === 'income')  summary[e.bus_id].income  += (+e.amount || 0);
    if (e.type === 'expense') summary[e.bus_id].expense += (+e.amount || 0);
    summary[e.bus_id].entries++;
  });

  const result = Object.entries(summary).map(([busId, s]) => ({
    busId,
    income : s.income,
    expense: s.expense,
    profit : s.income - s.expense,
    entries: s.entries,
    margin : s.income > 0 ? +((((s.income - s.expense) / s.income) * 100).toFixed(1)) : 0,
  }));

  res.json({ success: true, data: result });
});

// ── GET entries ───────────────────────────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  const { busId, type, category, from, to } = req.query;
  let query = supabase.from('finance_entries').select('*').order('date', { ascending: false });

  if (busId    && busId    !== 'all') query = query.eq('bus_id',   busId);
  if (type     && type     !== 'all') query = query.eq('type',     type);
  if (category && category !== 'all') query = query.eq('category', category);
  if (from) query = query.gte('date', from);
  if (to)   query = query.lte('date', to);

  const { data, error } = await query;
  if (error) return next(error);
  res.json({ success: true, data });
});

// ── POST add entry ────────────────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  const entry = req.body;
  if (!entry.bus_id || !entry.date || !entry.type || !entry.amount) {
    return next(createError(400, 'bus_id, date, type, and amount required'));
  }

  const { data, error } = await supabase
    .from('finance_entries')
    .insert({ ...entry, created_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return next(error);
  res.status(201).json({ success: true, data });
});

// ── POST bulk add entries ────────────────────────────────────
router.post('/bulk', requireAuth, async (req, res, next) => {
  const { entries } = req.body || {};
  if (!Array.isArray(entries) || !entries.length) {
    return next(createError(400, 'entries[] required'));
  }

  const rows = entries.map(e => ({ ...e, created_at: new Date().toISOString() }));
  const { data, error } = await supabase
    .from('finance_entries')
    .insert(rows)
    .select();

  if (error) return next(error);
  res.status(201).json({ success: true, data });
});

// ── DELETE entry ─────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res, next) => {
  const { error } = await supabase
    .from('finance_entries')
    .delete()
    .eq('id', req.params.id);
  if (error) return next(error);
  res.json({ success: true });
});

module.exports = router;
