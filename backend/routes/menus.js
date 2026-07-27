'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../services/activity');

const router = express.Router();
const allMenusRouter = express.Router();

// ═══════════════════════════════════════════════════════════
// Routes that require auth for reading own menus
// ═══════════════════════════════════════════════════════════

// ─── GET /api/menus/my — get current user's accessible menus ─
router.get('/my', auth, async (req, res) => {
  try {
    const sb = getSupabase();
    let menus;
    if (req.user.role === 'admin') {
      const { data, error } = await sb
        .from('menus')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      menus = data;
    } else {
      const { data, error } = await sb
        .from('user_menus')
        .select('menu:menus(*)')
        .eq('user_id', req.user.id)
        .eq('menu.is_active', true);
      if (error) throw error;
      menus = (data || []).map(r => r.menu).filter(Boolean).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    res.json({ menus });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// Admin routes — CRUD menus + assign access
// ═══════════════════════════════════════════════════════════

allMenusRouter.use(auth, requireAdmin);

// ─── GET /api/menus — list all menus (admin) ───────────────
allMenusRouter.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('menus')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json({ menus: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/menus — create menu ─────────────────────────
allMenusRouter.post('/', async (req, res) => {
  try {
    const { name, slug, icon, path, description, parent_id, sort_order, is_active, is_default_for_new } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });

    const sb = getSupabase();
    const { data: menu, error } = await sb
      .from('menus')
      .insert({
        name, slug, icon: icon || null, path: path || null,
        description: description || null,
        parent_id: parent_id || null,
        sort_order: sort_order ?? 0,
        is_active: is_active !== undefined ? is_active : true,
        is_default_for_new: is_default_for_new !== undefined ? !!is_default_for_new : false,
      })
      .select('*')
      .single();
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'create_menu', entityId: menu.id, details: { name, slug }, req });
    res.status(201).json({ menu });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── PUT /api/menus/:id — update menu ──────────────────────
allMenusRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, icon, path, description, parent_id, sort_order, is_active, is_default_for_new } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (icon !== undefined) updates.icon = icon;
    if (path !== undefined) updates.path = path;
    if (description !== undefined) updates.description = description;
    if (parent_id !== undefined) updates.parent_id = parent_id;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (is_active !== undefined) updates.is_active = is_active;
    if (is_default_for_new !== undefined) updates.is_default_for_new = !!is_default_for_new;

    const sb = getSupabase();
    const { data: menu, error } = await sb.from('menus').update(updates).eq('id', id).select('*').single();
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'update_menu', entityId: id, details: updates, req });
    res.json({ menu });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── DELETE /api/menus/:id ─────────────────────────────────
allMenusRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sb = getSupabase();
    const { error } = await sb.from('menus').delete().eq('id', id);
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'delete_menu', entityId: id, req });
    res.json({ message: 'Menu deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/menus/:id/toggle — activate/deactivate ─────
allMenusRouter.post('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const sb = getSupabase();
    const { data: m } = await sb.from('menus').select('is_active').eq('id', id).single();
    const { data: menu, error } = await sb
      .from('menus')
      .update({ is_active: !m.is_active })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    await logActivity({ userId: req.user.id, action: 'toggle_menu', entityId: id, details: { is_active: menu.is_active }, req });
    res.json({ menu });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/menus/:id/toggle-default — toggle is_default_for_new ─
allMenusRouter.post('/:id/toggle-default', async (req, res) => {
  try {
    const { id } = req.params;
    const sb = getSupabase();
    const { data: m } = await sb.from('menus').select('is_default_for_new').eq('id', id).single();
    if (!m) return res.status(404).json({ error: 'Menu not found' });
    const { data: menu, error } = await sb
      .from('menus')
      .update({ is_default_for_new: !m.is_default_for_new })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    await logActivity({ userId: req.user.id, action: 'toggle_menu_default', entityId: id, details: { is_default_for_new: menu.is_default_for_new }, req });
    res.json({ menu });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── GET /api/menus/defaults — list default menus for new users ─
allMenusRouter.get('/defaults/list', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('menus')
      .select('id, name, slug, is_default_for_new')
      .eq('is_default_for_new', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json({ defaults: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── GET /api/menus/:id/access — list users with access to menu ─
allMenusRouter.get('/:id/access', async (req, res) => {
  try {
    const { id } = req.params;
    const sb = getSupabase();
    const { data, error } = await sb
      .from('user_menus')
      .select('user_id, user:users(id, email, full_name)')
      .eq('menu_id', id);
    if (error) throw error;
    res.json({ accesses: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/menus/:id/access — grant access to users ────
allMenusRouter.post('/:id/access', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;
    if (!Array.isArray(user_ids)) return res.status(400).json({ error: 'user_ids must be array' });

    const sb = getSupabase();
    const inserts = user_ids.map(uid => ({ menu_id: id, user_id: uid }));
    const { error } = await sb.from('user_menus').upsert(inserts, { onConflict: 'user_id,menu_id', ignoreDuplicates: true });
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'grant_menu_access', entityId: id, details: { user_ids }, req });
    res.json({ message: 'Access granted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── DELETE /api/menus/:id/access/:userId — revoke access ─
allMenusRouter.delete('/:id/access/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const sb = getSupabase();
    const { error } = await sb.from('user_menus').delete().eq('menu_id', id).eq('user_id', userId);
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'revoke_menu_access', entityId: id, details: { user_id: userId }, req });
    res.json({ message: 'Access revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── GET /api/users/:id/menus — list menus assigned to user ─
allMenusRouter.get('/users/:id/menus-list', async (req, res) => {
  try {
    const { id } = req.params;
    const sb = getSupabase();
    const { data, error } = await sb
      .from('user_menus')
      .select('menu:menus(*)')
      .eq('user_id', id);
    if (error) throw error;
    res.json({ menus: (data || []).map(r => r.menu).filter(Boolean).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── PUT /api/users/:id/menus — bulk assign menus to user ─
allMenusRouter.put('/users/:id/menus', async (req, res) => {
  try {
    const { id } = req.params;
    const { menu_ids } = req.body;
    if (!Array.isArray(menu_ids)) return res.status(400).json({ error: 'menu_ids must be array' });

    const sb = getSupabase();
    // Delete existing, then insert new
    await sb.from('user_menus').delete().eq('user_id', id);
    if (menu_ids.length > 0) {
      const inserts = menu_ids.map(mid => ({ user_id: id, menu_id: mid }));
      const { error } = await sb.from('user_menus').insert(inserts);
      if (error) throw error;
    }

    await logActivity({ userId: req.user.id, action: 'assign_user_menus', entityId: id, details: { menu_ids }, req });
    res.json({ message: 'Menus assigned', menu_ids });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = { router, allMenusRouter };
