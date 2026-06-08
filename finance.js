// ============================================================
//  REWA KRIPA TRAVELS — Finance Routes
//  src/routes/finance.js
//
//  GET    /api/finance           — list entries (admin, with filters)
//  POST   /api/finance           — create one or many entries (admin)
//  DELETE /api/finance/:id       — delete a single entry (admin)
//  GET    /api/finance/summary   — profit summary per bus (admin)
//  GET    /api/finance/export    — CSV export (admin)
// ============================================================

const router          = require('express').Router();
const { supabase }    = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

// ── Ensure finance_entries table in Supabase ─────────────────
// Run this SQL once in Supabase SQL Editor:
//
// create table if not exists finance_entries (
//   id           text primary key,
//   type         text not null check (type in ('income','expense')),
//   bus_id       text not null,
//   bus_plate    text default '',
//   bus_title    text default '',
//   date         date not null,
//   category     text not null,
//   amount       numeric(12,2) not null,
//   route        text default '',
//   pax1         int  default 0,
//   pax2         int  default 0,
//   fare         numeric(10,2) default 0,
//   vendor       text default '',
//   ref_no       text default '',
//   notes        text default '',
//   created_at   timestamptz default now()
// );
// alter table finance_entries enable row level security;
// create policy "fin_all" on finance_entries for all using (true) with check (true);

// ── GET /api/finance ──────────────────────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { busId, type, category, fromDate, toDate } = req.query;

    let query = supabase
      .from('finance_entries')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (busId && busId !== 'all')       query = query.eq('bus_id', busId);
    if (type  && type  !== 'all')       query = query.eq('type', type);
    if (category && category !== 'all') query = query.eq('category', category);
    if (fromDate)                        query = query.gte('date', fromDate);
    if (toDate)                          query = query.lte('date', toDate);

    const { data, error } = await query;
    if (error) throw createError(500, error.message);

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/finance/summary ─────────────────────────────────
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const { fromDate, toDate, busId } = req.query;

    let query = supabase.from('finance_entries').select('*');
    if (busId && busId !== 'all') query = query.eq('bus_id', busId);
    if (fromDate)                  query = query.gte('date', fromDate);
    if (toDate)                    query = query.lte('date', toDate);

    const { data, error } = await query;
    if (error) throw createError(500, error.message);

    const entries = data || [];

    // Group by bus_id
    const summaryMap = {};
    entries.forEach((e) => {
      if (!summaryMap[e.bus_id]) {
        summaryMap[e.bus_id] = {
          busId    : e.bus_id,
          busPlate : e.bus_plate,
          busTitle : e.bus_title,
          income   : 0,
          expense  : 0,
          profit   : 0,
          entries  : 0,
          totalPax : 0,
        };
      }
      const s = summaryMap[e.bus_id];
      const amount = parseFloat(e.amount) || 0;
      if (e.type === 'income') {
        s.income  += amount;
        s.totalPax += (e.pax1 || 0) + (e.pax2 || 0);
      } else {
        s.expense += amount;
      }
      s.profit  = s.income - s.expense;
      s.entries += 1;
    });

    const summary = Object.values(summaryMap).map((s) => ({
      ...s,
      margin: s.income > 0 ? ((s.profit / s.income) * 100).toFixed(1) + '%' : '—',
    }));

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/finance/export?format=csv ──────────────────────
router.get('/export', requireAuth, async (req, res, next) => {
  try {
    const { busId, fromDate, toDate, type } = req.query;

    let query = supabase
      .from('finance_entries')
      .select('*')
      .order('date', { ascending: false });

    if (busId && busId !== 'all') query = query.eq('bus_id', busId);
    if (type  && type  !== 'all') query = query.eq('type', type);
    if (fromDate)                  query = query.gte('date', fromDate);
    if (toDate)                    query = query.lte('date', toDate);

    const { data, error } = await query;
    if (error) throw createError(500, error.message);

    const rows = data || [];
    if (!rows.length) {
      return res.status(200).send('No data found');
    }

    // Build CSV
    const headers = [
      'Date', 'Type', 'Bus Number', 'Bus Name',
      'Category', 'Route / Trip', 'Amount (₹)',
      'Trip 1 Pax', 'Trip 2 Pax', 'Fare/Seat',
      'Paid To', 'Ref No', 'Notes',
    ];

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const csvRows = rows.map((e) =>
      [
        e.date,
        e.type === 'income' ? 'CR — Income' : 'DR — Expense',
        e.bus_plate,
        e.bus_title,
        e.category,
        e.route || '',
        e.amount,
        e.pax1 || '',
        e.pax2 || '',
        e.fare || '',
        e.vendor || '',
        e.ref_no || '',
        e.notes || '',
      ]
        .map(escape)
        .join(',')
    );

    const csv = [headers.map(escape).join(','), ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rewa-kripa-finance-${fromDate || 'all'}-to-${toDate || 'all'}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/finance ─────────────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      throw createError(400, 'entries[] array is required');
    }

    for (const e of entries) {
      if (!e.type || !['income', 'expense'].includes(e.type)) {
        throw createError(400, 'Each entry must have type: "income" or "expense"');
      }
      if (!e.busId || !e.date || !e.category || !e.amount) {
        throw createError(400, 'busId, date, category and amount are required for each entry');
      }
    }

    const rows = entries.map((e) => ({
      id        : `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type      : e.type,
      bus_id    : e.busId,
      bus_plate : e.busPlate  || '',
      bus_title : e.busTitle  || '',
      date      : e.date,
      category  : e.category,
      amount    : parseFloat(e.amount) || 0,
      route     : e.route    || '',
      pax1      : parseInt(e.pax1, 10) || 0,
      pax2      : parseInt(e.pax2, 10) || 0,
      fare      : parseFloat(e.fare)   || 0,
      vendor    : e.vendor   || '',
      ref_no    : e.refNo    || '',
      notes     : e.notes    || '',
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('finance_entries')
      .insert(rows)
      .select();

    if (error) throw createError(500, error.message);

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/finance/:id ───────────────────────────────────
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('finance_entries')
      .delete()
      .eq('id', id);

    if (error) throw createError(500, error.message);

    res.json({ success: true, message: `Entry ${id} deleted` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
