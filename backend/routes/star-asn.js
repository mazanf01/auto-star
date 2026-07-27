'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth } = require('../middleware/auth');
const { encrypt, decrypt } = require('../lib/crypto');
const { StarAsnAuth } = require('../lib/StarAsnAuth');
const { createSessionStore } = require('../lib/session-store');
const { logActivity } = require('../services/activity');

const router = express.Router();
router.use(auth);

/**
 * Get or create a StarAsnAuth client for the requesting user.
 * Loads saved STAR credentials from DB, decrypts password.
 * Injects Supabase-backed sessionStore (no local files).
 * Returns { client, credential } or null if no credentials saved.
 */
async function getClientForUser(userId) {
  const sb = getSupabase();
  // Phase 4: get the user's ACTIVE credential (only 1 active per user)
  const { data: cred, error } = await sb
    .from('star_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  if (error || !cred) return { client: null, credential: null };

  const password = decrypt(cred.star_password_enc);
  const sessionStore = createSessionStore(sb, userId);
  const client = new StarAsnAuth({
    debug: process.env.NODE_ENV !== 'production',
    force: true,
    sessionStore,
  });
  return { client, credential: { username: cred.star_username, password }, credId: cred.id };
}

/**
 * Ensure client is logged in (load session from DB or login fresh).
 */
async function ensureLogin(client, username, password, credId) {
  // Try load saved session from DB
  const loaded = await client.loadSession(credId);
  if (loaded && await client.isSessionValid()) {
    return { ok: true, mode: 'session' };
  }
  // Login fresh
  const result = await client.login(username, password);
  if (!result.ok) {
    return { ok: false, error: result };
  }
  await client.saveSession(credId);
  return { ok: true, mode: 'login' };
}

// ─── POST /api/star-asn/credentials — add STAR ASN credential (Phase 4: multi-account) ─
router.post('/credentials', async (req, res) => {
  try {
    const { star_username, star_password, label } = req.body;
    if (!star_username || !star_password) return res.status(400).json({ error: 'star_username and star_password required' });

    const sb = getSupabase();
    const encPassword = encrypt(star_password);

    // Deactivate all existing credentials for this user, then insert new as active
    await sb.from('star_credentials').update({ is_active: false }).eq('user_id', req.user.id);

    const { data, error } = await sb
      .from('star_credentials')
      .insert({
        user_id: req.user.id,
        star_username,
        star_password_enc: encPassword,
        label: label || null,
        is_active: true,
      })
      .select('id, user_id, star_username, label, saved_at, is_active')
      .single();
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'save_star_credentials', req });
    res.json({ credential: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── GET /api/star-asn/credentials — list ALL credentials (Phase 4) ─
router.get('/credentials', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('star_credentials')
      .select('id, user_id, star_username, label, saved_at, is_active')
      .eq('user_id', req.user.id)
      .order('saved_at', { ascending: false });
    if (error) throw error;
    res.json({ credentials: data || [], credential: (data || []).find(c => c.is_active) || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/star-asn/credentials/:id/activate — switch active account (Phase 4) ─
router.post('/credentials/:id/activate', async (req, res) => {
  try {
    const sb = getSupabase();
    // Deactivate all, activate selected
    await sb.from('star_credentials').update({ is_active: false }).eq('user_id', req.user.id);
    const { data, error } = await sb
      .from('star_credentials')
      .update({ is_active: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id, star_username, label, is_active')
      .single();
    if (error) throw error;
    await logActivity({ userId: req.user.id, action: 'switch_star_account', details: { id: req.params.id }, req });
    res.json({ credential: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── DELETE /api/star-asn/credentials/:id — delete specific credential (Phase 4) ─
router.delete('/credentials/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('star_credentials')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    await logActivity({ userId: req.user.id, action: 'delete_star_credentials', req });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/star-asn/login — test STAR ASN login ────────
router.post('/login', async (req, res) => {
  try {
    const { star_username, star_password } = req.body;
    let username = star_username, password = star_password;

    // If not provided in body, load from saved credentials
    if (!username || !password) {
      const sb = getSupabase();
      const { data: cred } = await sb.from('star_credentials').select('*').eq('user_id', req.user.id).eq('is_active', true).single();
      if (!cred) return res.status(400).json({ error: 'No STAR ASN credentials saved. Save credentials first or provide in body.' });
      username = cred.star_username;
      password = decrypt(cred.star_password_enc);
      const sessionStore = createSessionStore(sb, req.user.id);
      const client = new StarAsnAuth({ debug: process.env.NODE_ENV !== 'production', force: true, sessionStore });
      const result = await client.login(username, password);
      if (result.ok) await client.saveSession(cred.id);

      await logActivity({ userId: req.user.id, action: 'star_login', details: { status: result.status, ok: result.ok }, req });
      res.json(result);
      return;
    }

    const client = new StarAsnAuth({ debug: process.env.NODE_ENV !== 'production', force: true });
    const result = await client.login(username, password);
    // No credId available when credentials provided in body — skip DB session save

    await logActivity({ userId: req.user.id, action: 'star_login', details: { status: result.status, ok: result.ok }, req });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'STAR ASN login failed', detail: err.message, format: err.format ? err.format() : undefined });
  }
});

// ─── GET /api/star-asn/identity — get full identity ────────
router.get('/identity', async (req, res) => {
  try {
    const { client, credential } = await getClientForUser(req.user.id);
    if (!client) return res.status(400).json({ error: 'No STAR ASN credentials saved' });

    const sessionResult = await ensureLogin(client, credential.username, credential.password, credId);
    if (!sessionResult.ok) return res.status(401).json({ error: 'STAR ASN login failed', detail: sessionResult.error });

    const identity = await client.getFullIdentity();
    await logActivity({ userId: req.user.id, action: 'star_get_identity', req });
    res.json({ identity });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message, format: err.format ? err.format() : undefined });
  }
});

// ─── POST /api/star-asn/presensi — do presensi in/out ──────
router.post('/presensi', async (req, res) => {
  try {
    const { type, latitude, longitude, timezone } = req.body;
    if (!type || !['in', 'out'].includes(type)) return res.status(400).json({ error: 'type must be "in" or "out"' });
    if (latitude == null || longitude == null) return res.status(400).json({ error: 'latitude and longitude required' });

    const { client, credential, credId } = await getClientForUser(req.user.id);
    if (!client) return res.status(400).json({ error: 'No STAR ASN credentials saved' });

    const sessionResult = await ensureLogin(client, credential.username, credential.password, credId);
    if (!sessionResult.ok) return res.status(401).json({ error: 'STAR ASN login failed', detail: sessionResult.error });

    const result = await client.presensi(type, parseFloat(latitude), parseFloat(longitude), timezone || 'Asia/Jakarta');

    // Log to presensi_logs
    const sb = getSupabase();
    const logStatus = result.ok && result.body?.status !== 'error' ? 'success' : 'failed';
    await sb.from('presensi_logs').insert({
      user_id: req.user.id,
      type,
      status: logStatus,
      message: result.body?.message || (result.ok ? 'OK' : 'Failed'),
      response_body: result.body,
    });
    await logActivity({ userId: req.user.id, action: 'star_presensi', details: { type, status: logStatus }, req });

    res.json(result);
  } catch (err) {
    // Log failure
    const sb = getSupabase();
    await sb.from('presensi_logs').insert({
      user_id: req.user.id,
      type: req.body?.type || 'in',
      status: 'failed',
      message: err.message,
      response_body: { error: err.message },
    }).catch(() => {});

    res.status(500).json({ error: 'Presensi failed', detail: err.message, format: err.format ? err.format() : undefined });
  }
});

// ─── GET /api/star-asn/presensi-status — check today's status ─
router.get('/presensi-status', async (req, res) => {
  try {
    const { client, credential, credId } = await getClientForUser(req.user.id);
    if (!client) return res.status(400).json({ error: 'No STAR ASN credentials saved' });

    const sessionResult = await ensureLogin(client, credential.username, credential.password, credId);
    if (!sessionResult.ok) return res.status(401).json({ error: 'STAR ASN login failed', detail: sessionResult.error });

    const status = await client.getPresensiStatus();
    res.json({ status });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message, format: err.format ? err.format() : undefined });
  }
});

// ─── GET /api/star-asn/tunjangan — get tunjangan kinerja ───
router.get('/tunjangan', async (req, res) => {
  try {
    const { year, period } = req.query;
    if (!year || !period) return res.status(400).json({ error: 'year and period query params required' });

    const { client, credential, credId } = await getClientForUser(req.user.id);
    if (!client) return res.status(400).json({ error: 'No STAR ASN credentials saved' });

    const sessionResult = await ensureLogin(client, credential.username, credential.password, credId);
    if (!sessionResult.ok) return res.status(401).json({ error: 'STAR ASN login failed', detail: sessionResult.error });

    const result = await client.getPersonalAllowance(year, period);
    await logActivity({ userId: req.user.id, action: 'star_get_tunjangan', details: { year, period }, req });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message, format: err.format ? err.format() : undefined });
  }
});

module.exports = router;
