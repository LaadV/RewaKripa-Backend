// ============================================================
//  REWA KRIPA TRAVELS — Staff Routes
//  GET  /api/staff              → all active staff
//  GET  /api/staff/:id
//  POST /api/staff              (admin)
//  PUT  /api/staff/:id          (admin)
//  DELETE /api/staff/:id        (admin — soft delete)
// ============================================================

const express        = require('express');
const { supabase }   = require('../config/supabase');
const { requireAuth }  = require('../middleware/auth');
const { createError }  = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', async (req, res, next) => {
  let query = supabase.from('staff').select('*').order('name');
  if (req.query.active !== 'false') query = query.eq('active', true);
  const { data, error } = await query;
  if (error) return next(error);
  res.json({ success: true, data });
});

router.get('/:id', async (req, res, next) => {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return next(error);
  if (!data) return next(createError(404, 'Staff not found'));
  res.json({ success: true, data });
});

router.post('/', requireAuth, async (req, res, next) => {
  const { data, error } = await supabase
    .from('staff')
    .insert({ ...req.body, active: true })
    .select()
    .single();
  if (error) return next(error);
  res.status(201).json({ success: true, data });
});

router.put('/:id', requireAuth, async (req, res, next) => {
  const { data, error } = await supabase
    .from('staff')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return next(error);
  res.json({ success: true, data });
});

// Soft delete — set active = false
router.delete('/:id', requireAuth, async (req, res, next) => {
  const { error } = await supabase
    .from('staff')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', req.params.id);
  if (error) return next(error);
  res.json({ success: true });
});

module.exports = router;
