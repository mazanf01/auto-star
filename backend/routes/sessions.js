'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ─── GET /api/sessions — list current user's active sessions ─
router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('sessions')
      .select('id, device_info, ip_address, last_active, created_at, expires_at')
      .eq('user_id', req.user.id)
      .gt('expires_at', new Date().toISOString())
      .order('last_active', { ascending: false });
    if (error) throw error;
    res.json({ sessions: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── DELETE /api/sessions/:id — revoke (force logout) a session
router.delete('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('sessions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id); // can only delete own sessions
    if (error) throw error;
    res.json({ revoked: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── DELETE /api/sessions — revoke all other sessions (keep current)
router.delete('/', async (req, res) => {
  try {
    const sb = getSupabase();
    // Delete all sessions except current
    let q = sb.from('sessions').delete().eq('user_id', req.user.id);
    if (req.sessionId) {
      q = q.neq('id', req.sessionId);
    }
    const { error } = await q;
    if (error) throw error;
    res.json({ revoked: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
