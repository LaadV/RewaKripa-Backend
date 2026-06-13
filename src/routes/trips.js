// ============================================================
//  REWA KRIPA TRAVELS — Trips (Tour Packages) Routes
//  GET  /api/trips
//  GET  /api/trips/:id
//  POST /api/trips          (admin)
//  PUT  /api/trips/:id      (admin)
//  DELETE /api/trips/:id    (admin)
// ============================================================

const express        = require('express');
const { supabase }   = require('../config/supabase');
const { requireAuth }  = require('../middleware/auth');
const { createError }  = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', async (req, res, next) => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return next(error);
  res.json({ success: true, data });
});

router.get('/:id', async (req, res, next) => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return next(error);
  if (!data) return next(createError(404, 'Trip not found'));
  res.json({ success: true, data });
});

router.post('/', requireAuth, async (req, res, next) => {
  const { data, error } = await supabase
    .from('trips')
    .insert(req.body)
    .select()
    .single();
  if (error) return next(error);
  res.status(201).json({ success: true, data });
});

router.put('/:id', requireAuth, async (req, res, next) => {
  const { data, error } = await supabase
    .from('trips')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return next(error);
  res.json({ success: true, data });
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', req.params.id);
  if (error) return next(error);
  res.json({ success: true });
});

module.exports = router;
