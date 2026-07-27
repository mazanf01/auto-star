'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth } = require('../middleware/auth');
const { logActivity } = require('../services/activity');

const router = express.Router();
router.use(auth);

// ─── GET /api/locations — list current user's saved locations ─
router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('saved_locations')
      .select('*')
      .eq('user_id', req.user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ locations: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/locations — create saved location ───────────
router.post('/', async (req, res) => {
  try {
    const { name, latitude, longitude, address, is_primary } = req.body;
    if (!name || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'name, latitude, longitude required' });
    }

    const sb = getSupabase();

    // If setting as primary, unset previous primary
    if (is_primary) {
      await sb.from('saved_locations')
        .update({ is_primary: false })
        .eq('user_id', req.user.id)
        .eq('is_primary', true);
    }

    const { data, error } = await sb
      .from('saved_locations')
      .insert({
        user_id: req.user.id,
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || null,
        is_primary: !!is_primary,
      })
      .select('*')
      .single();
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'create_location', entityId: data.id, details: { name }, req });
    res.status(201).json({ location: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── PUT /api/locations/:id — update location ──────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, address, is_primary } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (latitude !== undefined) updates.latitude = parseFloat(latitude);
    if (longitude !== undefined) updates.longitude = parseFloat(longitude);
    if (address !== undefined) updates.address = address;
    if (is_primary !== undefined) updates.is_primary = !!is_primary;

    const sb = getSupabase();

    // Verify ownership first
    const { data: existing, error: findErr } = await sb.from('saved_locations')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    if (findErr || !existing) return res.status(404).json({ error: 'Location not found' });

    // If setting as primary, unset previous primary
    if (is_primary) {
      await sb.from('saved_locations')
        .update({ is_primary: false })
        .eq('user_id', req.user.id)
        .eq('is_primary', true);
    }

    const { data, error } = await sb
      .from('saved_locations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single();
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'update_location', entityId: id, details: updates, req });
    res.json({ location: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── DELETE /api/locations/:id ─────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sb = getSupabase();

    // Verify ownership first
    const { data: loc, error: findErr } = await sb.from('saved_locations')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    if (findErr || !loc) return res.status(404).json({ error: 'Location not found' });

    const { error } = await sb.from('saved_locations')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'delete_location', entityId: id, req });
    res.json({ message: 'Location deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/locations/:id/set-primary ──────────────────
router.post('/:id/set-primary', async (req, res) => {
  try {
    const { id } = req.params;
    const sb = getSupabase();

    // Unset previous primary
    await sb.from('saved_locations')
      .update({ is_primary: false })
      .eq('user_id', req.user.id)
      .eq('is_primary', true);

    const { data, error } = await sb.from('saved_locations')
      .update({ is_primary: true })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single();
    if (error) throw error;

    await logActivity({ userId: req.user.id, action: 'set_primary_location', entityId: id, req });
    res.json({ location: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
