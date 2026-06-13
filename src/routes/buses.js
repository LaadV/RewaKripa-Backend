// ============================================================
//  REWA KRIPA TRAVELS — Buses Routes
//  GET  /api/buses          → list all buses
//  GET  /api/buses/:id      → single bus
//  POST /api/buses          → create bus (admin)
//  PUT  /api/buses/:id      → update bus (admin)
//  DELETE /api/buses/:id    → delete bus (admin)
// ============================================================

const express        = require('express');
const { supabase }   = require('../config/supabase');
const { requireAuth }  = require('../middleware/auth');
const { createError }  = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', async (req, res, next) => {
  const { data, error } = await supabase
    .from('buses')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return next(error);
  res.json({ success: true, data });
});

router.get('/:id', async (req, res, next) => {
  const { data, error } = await supabase
    .from('buses')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return next(error);
  if (!data) return next(createError(404, 'Bus not found'));
  res.json({ success: true, data });
});

router.post('/', requireAuth, async (req, res, next) => {
  const { data, error } = await supabase
    .from('buses')
    .insert(req.body)
    .select()
    .single();
  if (error) return next(error);
  res.status(201).json({ success: true, data });
});

router.put('/:id', requireAuth, async (req, res, next) => {
  const { data, error } = await supabase
    .from('buses')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return next(error);
  res.json({ success: true, data });
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  const { error } = await supabase
    .from('buses')
    .delete()
    .eq('id', req.params.id);
  if (error) return next(error);
  res.json({ success: true });
});

module.exports = router;
