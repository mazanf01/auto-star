'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth } = require('../middleware/auth');
const { logActivity } = require('../services/activity');

const router = express.Router();
router.use(auth);

// ─── GET /api/presensi-settings — get current user's settings ─
router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('presensi_settings')
      .select('*')
      .eq('user_id', req.user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // not found is OK
    // Normalize TIME fields (Postgres returns HH:MM:SS, strip seconds)
    if (data) {
      if (data.check_in_time) data.check_in_time = String(data.check_in_time).substring(0, 5);
      if (data.check_out_time) data.check_out_time = String(data.check_out_time).substring(0, 5);
    }
    res.json({ settings: data || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── PUT /api/presensi-settings — upsert settings ─────────
router.put('/', async (req, res) => {
  try {
    const {
      enabled, check_in_time, check_out_time,
      latitude, longitude, timezone, work_days, force_mode,
      check_in_random, check_out_random, location_mode,
    } = req.body;

    const sb = getSupabase();
    const payload = {
      user_id: req.user.id,
      enabled: enabled ?? false,
      check_in_time: check_in_time || '08:00',
      check_out_time: check_out_time || '16:00',
      latitude: latitude ?? -6.2088,
      longitude: longitude ?? 106.8456,
      timezone: timezone || 'Asia/Jakarta',
      work_days: work_days || [1, 2, 3, 4, 5],
      force_mode: force_mode ?? true,
      check_in_random: check_in_random ?? 0,
      check_out_random: check_out_random ?? 0,
      location_mode: location_mode || 'primary',
    };

    const { data, error } = await sb
      .from('presensi_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) throw error;

    // Normalize TIME fields
    if (data) {
      if (data.check_in_time) data.check_in_time = String(data.check_in_time).substring(0, 5);
      if (data.check_out_time) data.check_out_time = String(data.check_out_time).substring(0, 5);
    }

    await logActivity({ userId: req.user.id, action: 'update_presensi_settings', details: payload, req });
    res.json({ settings: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── GET /api/presensi-settings/logs — presensi execution logs ─
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const sb = getSupabase();
    let query = sb
      .from('presensi_logs')
      .select('*', { count: 'exact' })
      .order('executed_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // Non-admin only see own logs
    if (req.user.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      logs: data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        total_pages: Math.ceil(count / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── GET /api/presensi-settings/all — admin: list all users' settings ─
router.get('/all', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('presensi_settings')
      .select('*, user:users(id, email, full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ settings: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
