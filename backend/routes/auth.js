'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getSupabase } = require('../lib/supabase');
const { auth } = require('../middleware/auth');
const { logActivity } = require('../services/activity');

const router = express.Router();

// ─── POST /api/auth/register ───────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });

    const sb = getSupabase();
    const { data: existing } = await sb.from('users').select('id').eq('email', email).single();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await sb
      .from('users')
      .insert({ email, password_hash: hash, full_name: full_name || null, role: 'user', is_active: true })
      .select('id, email, full_name, role, is_active, created_at')
      .single();
    if (error) throw error;

    await logActivity({ userId: user.id, action: 'register', req });
    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const sb = getSupabase();
    const { data: user, error } = await sb
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // ─── Session tracking (Phase 4) ──────────────────────────
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Parse device info from User-Agent
    const ua = req.headers['user-agent'] || 'Unknown';
    let deviceInfo = 'Unknown';
    if (/Mobile|Android|iPhone/.test(ua)) deviceInfo = 'Mobile';
    else if (/Windows/.test(ua)) deviceInfo = 'Windows';
    else if (/Mac/.test(ua)) deviceInfo = 'macOS';
    else if (/Linux/.test(ua)) deviceInfo = 'Linux';
    const browser = /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : /Edge/.test(ua) ? 'Edge' : 'Browser';
    deviceInfo = `${deviceInfo} · ${browser}`;

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection?.remoteAddress || 'unknown';

    const { data: session, error: sessErr } = await sb
      .from('sessions')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        device_info: deviceInfo,
        ip_address: ip,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();
    // Non-fatal if session table doesn't exist yet
    if (sessErr) console.error('[auth] session insert failed:', sessErr.message);

    await logActivity({ userId: user.id, action: 'login', req });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// ─── POST /api/auth/logout ─────────────────────────────────
router.post('/logout', auth, async (req, res) => {
  try {
    const sb = getSupabase();
    const token = req.headers.authorization.slice(7);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Delete session by token hash
    await sb.from('sessions').delete().eq('token_hash', tokenHash).eq('user_id', req.user.id);

    await logActivity({ userId: req.user.id, action: 'logout', req });
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/auth/change-password ────────────────────────
router.post('/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Current and new password required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'New password min 6 characters' });

    const sb = getSupabase();
    const { data: user } = await sb.from('users').select('password_hash').eq('id', req.user.id).single();
    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password incorrect' });

    const hash = await bcrypt.hash(new_password, 10);
    await sb.from('users').update({ password_hash: hash }).eq('id', req.user.id);
    await logActivity({ userId: req.user.id, action: 'change_password', req });
    res.json({ message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
