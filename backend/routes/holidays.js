'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ─── GET /api/holidays — list (all authenticated) ──────────
router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const { year } = req.query;
    let q = sb.from('holidays').select('*').eq('is_active', true).order('date', { ascending: true });
    if (year) {
      q = q.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json({ holidays: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── Check if today is holiday ──────────────────────────────
router.get('/check', async (req, res) => {
  try {
    const sb = getSupabase();
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await sb
      .from('holidays')
      .select('*')
      .eq('date', today)
      .eq('is_active', true)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ isHoliday: !!data, holiday: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── Admin CRUD ─────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, date, type = 'custom' } = req.body;
    if (!name || !date) return res.status(400).json({ error: 'name & date required' });
    const sb = getSupabase();
    const { data, error } = await sb.from('holidays').insert({ name, date, type }).select().single();
    if (error) throw error;
    res.json({ holiday: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, date, type, is_active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (date !== undefined) updates.date = date;
    if (type !== undefined) updates.type = type;
    if (is_active !== undefined) updates.is_active = is_active;
    const sb = getSupabase();
    const { data, error } = await sb.from('holidays').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ holiday: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('holidays').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
