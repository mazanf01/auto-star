'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ─── GET /api/notifications — list user's notifications ────
router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ notifications: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── GET /api/notifications/unread-count ───────────────────
router.get('/unread-count', async (req, res) => {
  try {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/notifications/:id/read — mark as read ───────
router.post('/:id/read', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/notifications/read-all — mark all read ──────
router.post('/read-all', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── DELETE /api/notifications/:id ─────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('notifications')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
