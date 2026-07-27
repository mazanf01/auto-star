'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { getSupabase } = require('../lib/supabase');
const { auth, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../services/activity');

const router = express.Router();

// All routes require auth + admin
router.use(auth, requireAdmin);

// ─── GET /api/users — list all users ───────────────────────
router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('users')
      .select('id, email, full_name, role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ users: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/users — create user (by admin) ──────────────
router.post('/', async (req, res) => {
  try {
    const { email, password, full_name, role, is_active } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });
    if (role && !['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const sb = getSupabase();
    const { data: existing } = await sb.from('users').select('id').eq('email', email).single();
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await sb
      .from('users')
      .insert({
        email, password_hash: hash,
        full_name: full_name || null,
        role: role || 'user',
        is_active: is_active !== undefined ? is_active : true,
      })
      .select('id, email, full_name, role, is_active, created_at')
      .single();
    if (error) throw error;

    // Auto-assign default menus (is_default_for_new = true)
    try {
      const { data: defaultMenus } = await sb
        .from('menus')
        .select('id')
        .eq('is_default_for_new', true)
        .eq('is_active', true);
      if (defaultMenus && defaultMenus.length) {
        const inserts = defaultMenus.map(m => ({ user_id: user.id, menu_id: m.id }));
        await sb.from('user_menus').upsert(inserts, { onConflict: 'user_id,menu_id', ignoreDuplicates: true });
      }
    } catch (e) {
      // Non-fatal: user created but default menus failed
      console.warn('Failed to assign default menus:', e.message);
    }

    await logActivity({ userId: req.user.id, action: 'create_user', entityId: user.id, details: { email, role }, req });
    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── PUT /api/users/:id — update user ──────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, full_name, role, is_active } = req.body;
    const updates = {};
    if (email) updates.email = email;
    if (full_name !== undefined) updates.full_name = full_name;
    if (role) {
      if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
      updates.role = role;
    }
    if (is_active !== undefined) updates.is_active = is_active;
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    const sb = getSupabase();
    const { data: user, error } = await sb
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, full_name, role, is_active, updated_at')
      .single();
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'update_user', entityId: id, details: updates, req });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── DELETE /api/users/:id ─────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

    const sb = getSupabase();
    const { error } = await sb.from('users').delete().eq('id', id);
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'delete_user', entityId: id, req });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/users/:id/toggle — activate/deactivate ─────
router.post('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const sb = getSupabase();
    const { data: u } = await sb.from('users').select('is_active').eq('id', id).single();
    const { data: user, error } = await sb
      .from('users')
      .update({ is_active: !u.is_active })
      .eq('id', id)
      .select('id, email, full_name, role, is_active')
      .single();
    if (error) throw error;
    await logActivity({ userId: req.user.id, action: 'toggle_user', entityId: id, details: { is_active: user.is_active }, req });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// BULK OPERATIONS (Phase 2 — Feature #3)
// ═══════════════════════════════════════════════════════════

// ─── POST /api/users/bulk/activate — activate many users ───
router.post('/bulk/activate', async (req, res) => {
  try {
    const { user_ids } = req.body;
    if (!Array.isArray(user_ids) || !user_ids.length) return res.status(400).json({ error: 'user_ids must be non-empty array' });
    const sb = getSupabase();
    const { data, error } = await sb.from('users').update({ is_active: true }).in('id', user_ids).select('id, email, is_active');
    if (error) throw error;
    await logActivity({ userId: req.user.id, action: 'bulk_activate_users', details: { count: data.length, user_ids }, req });
    res.json({ updated: data.length, users: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/users/bulk/deactivate — deactivate many users ─
router.post('/bulk/deactivate', async (req, res) => {
  try {
    const { user_ids } = req.body;
    if (!Array.isArray(user_ids) || !user_ids.length) return res.status(400).json({ error: 'user_ids must be non-empty array' });
    const sb = getSupabase();
    // Prevent deactivating self
    const safeIds = user_ids.filter(uid => uid !== req.user.id);
    if (!safeIds.length) return res.status(400).json({ error: 'Cannot deactivate yourself only' });
    const { data, error } = await sb.from('users').update({ is_active: false }).in('id', safeIds).select('id, email, is_active');
    if (error) throw error;
    await logActivity({ userId: req.user.id, action: 'bulk_deactivate_users', details: { count: data.length, user_ids: safeIds }, req });
    res.json({ updated: data.length, users: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/users/bulk/delete — delete many users ───────
router.post('/bulk/delete', async (req, res) => {
  try {
    const { user_ids } = req.body;
    if (!Array.isArray(user_ids) || !user_ids.length) return res.status(400).json({ error: 'user_ids must be non-empty array' });
    const safeIds = user_ids.filter(uid => uid !== req.user.id);
    if (!safeIds.length) return res.status(400).json({ error: 'Cannot delete yourself' });
    const sb = getSupabase();
    const { data, error } = await sb.from('users').delete().in('id', safeIds).select('id');
    if (error) throw error;
    await logActivity({ userId: req.user.id, action: 'bulk_delete_users', details: { count: data.length, user_ids: safeIds }, req });
    res.json({ deleted: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/users/bulk/assign-menus — assign menus to many users ─
router.post('/bulk/assign-menus', async (req, res) => {
  try {
    const { user_ids, menu_ids } = req.body;
    if (!Array.isArray(user_ids) || !user_ids.length) return res.status(400).json({ error: 'user_ids must be non-empty array' });
    if (!Array.isArray(menu_ids) || !menu_ids.length) return res.status(400).json({ error: 'menu_ids must be non-empty array' });
    const sb = getSupabase();
    const inserts = [];
    for (const uid of user_ids) for (const mid of menu_ids) inserts.push({ user_id: uid, menu_id: mid });
    const { data, error } = await sb.from('user_menus').upsert(inserts, { onConflict: 'user_id,menu_id', ignoreDuplicates: true }).select('user_id, menu_id');
    if (error) throw error;
    await logActivity({ userId: req.user.id, action: 'bulk_assign_menus', details: { user_count: user_ids.length, menu_count: menu_ids.length, inserted: data.length }, req });
    res.json({ assigned: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
