'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth, requireAdmin } = require('../middleware/auth');
const { decrypt } = require('../lib/crypto');
const { encrypt } = require('../lib/crypto');
const { StarAsnAuth } = require('../lib/StarAsnAuth');
const { createSessionStore } = require('../lib/session-store');
const { logActivity } = require('../services/activity');

const router = express.Router();
router.use(auth, requireAdmin);

// ─── GET /api/admin/star-accounts — list ALL users with their STAR accounts ─
router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();

    // Get all users
    const { data: users, error: uErr } = await sb
      .from('users')
      .select('id, email, full_name, role, is_active')
      .order('email', { ascending: true });
    if (uErr) throw uErr;

    // Get all STAR credentials
    const { data: creds, error: cErr } = await sb
      .from('star_credentials')
      .select('id, user_id, star_username, star_password_enc, label, is_active, saved_at')
      .order('saved_at', { ascending: false });
    if (cErr) throw cErr;

    // Group credentials by user
    const result = users.map(u => {
      const userCreds = (creds || []).filter(c => c.user_id === u.id);
      return {
        ...u,
        star_accounts: userCreds.map(c => ({
          id: c.id,
          username: c.star_username,
          password: decrypt(c.star_password_enc), // decrypt for admin view
          label: c.label,
          is_active: c.is_active,
          saved_at: c.saved_at,
        })),
        star_account_count: userCreds.length,
      };
    });

    res.json({ users: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/admin/star-accounts/:credId/check-session — login & get identity ─
router.post('/:credId/check-session', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: cred, error } = await sb
      .from('star_credentials')
      .select('*')
      .eq('id', req.params.credId)
      .single();
    if (error || !cred) return res.status(404).json({ error: 'Credential not found' });

    const password = decrypt(cred.star_password_enc);
    const sessionStore = createSessionStore(sb, cred.user_id);
    const client = new StarAsnAuth({ debug: false, force: true, sessionStore });

    // Try load session first (from DB)
    const loaded = await client.loadSession(cred.id);
    let loginMode = 'session';
    if (!loaded || !(await client.isSessionValid())) {
      const loginResult = await client.login(cred.star_username, password);
      if (!loginResult.ok) {
        return res.json({
          ok: false,
          status: 'login_failed',
          username: cred.star_username,
          error: loginResult.body?.message || `HTTP ${loginResult.status}`,
        });
      }
      await client.saveSession(cred.id);
      loginMode = 'fresh_login';
    }

    // Get identity
    let identity = null;
    try {
      identity = await client.getFullIdentity();
    } catch (e) {
      identity = { error: e.message };
    }

    await logActivity({ userId: req.user.id, action: 'admin_check_star_session', details: { credId: req.params.credId, username: cred.star_username }, req });

    res.json({
      ok: true,
      status: 'success',
      username: cred.star_username,
      login_mode: loginMode,
      identity,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── PUT /api/admin/star-accounts/:credId — update credential ─
router.put('/:credId', async (req, res) => {
  try {
    const { star_username, star_password, label, is_active } = req.body;
    const sb = getSupabase();
    const updates = {};
    if (star_username !== undefined) updates.star_username = star_username;
    if (label !== undefined) updates.label = label;
    if (is_active !== undefined) updates.is_active = is_active;
    if (star_password) updates.star_password_enc = encrypt(star_password);

    const { data, error } = await sb
      .from('star_credentials')
      .update(updates)
      .eq('id', req.params.credId)
      .select('id, star_username, label, is_active')
      .single();
    if (error) throw error;

    // If activating, deactivate others for same user
    if (is_active === true) {
      await sb.from('star_credentials')
        .update({ is_active: false })
        .neq('id', req.params.credId)
        .eq('user_id', data.user_id);
    }

    await logActivity({ userId: req.user.id, action: 'admin_update_star_credential', details: { credId: req.params.credId }, req });
    res.json({ credential: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── DELETE /api/admin/star-accounts/:credId — delete credential ─
router.delete('/:credId', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('star_credentials').delete().eq('id', req.params.credId);
    if (error) throw error;
    await logActivity({ userId: req.user.id, action: 'admin_delete_star_credential', details: { credId: req.params.credId }, req });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
