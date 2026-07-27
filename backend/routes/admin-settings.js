'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth, requireAdmin } = require('../middleware/auth');
const { DEFAULTS } = require('../services/presensi-config');
const { logActivity } = require('../services/activity');

const router = express.Router();
router.use(auth, requireAdmin);

// ─── GET /api/admin/settings — get all presensi config ────
router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('system_settings').select('key, value');
    if (error) throw error;

    // Merge with defaults
    const config = {};
    for (const key of Object.keys(DEFAULTS)) {
      const row = (data || []).find(r => r.key === key);
      let val = row ? row.value : String(DEFAULTS[key]);
      // Try parse JSON for arrays
      if (Array.isArray(DEFAULTS[key])) {
        try { val = JSON.parse(val); } catch { val = DEFAULTS[key]; }
      } else if (typeof DEFAULTS[key] === 'boolean') {
        val = val === 'true';
      } else if (typeof DEFAULTS[key] === 'number') {
        val = parseInt(val, 10) || DEFAULTS[key];
      }
      config[key] = val;
    }
    res.json({ settings: config });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── PUT /api/admin/settings — bulk update ─────────────────
router.put('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const updates = req.body.settings || req.body;
    const rows = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!(key in DEFAULTS)) continue; // skip unknown keys
      let strVal;
      if (typeof value === 'boolean') strVal = String(value);
      else if (Array.isArray(value)) strVal = JSON.stringify(value);
      else strVal = String(value);
      rows.push({ key, value: strVal, updated_at: new Date().toISOString() });
    }

    if (rows.length > 0) {
      const { error } = await sb
        .from('system_settings')
        .upsert(rows, { onConflict: 'key' });
      if (error) throw error;
    }

    // Invalidate config cache
    const { invalidateCache } = require('../services/presensi-config');
    invalidateCache();

    await logActivity({ userId: req.user.id, action: 'update_presensi_config', details: { keys: Object.keys(updates) }, req });
    res.json({ saved: true, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/admin/settings/reset — reset to defaults ────
router.post('/reset', async (req, res) => {
  try {
    const sb = getSupabase();
    const rows = [];
    for (const [key, val] of Object.entries(DEFAULTS)) {
      let strVal;
      if (typeof val === 'boolean') strVal = String(val);
      else if (Array.isArray(val)) strVal = JSON.stringify(val);
      else strVal = String(val);
      rows.push({ key, value: strVal, updated_at: new Date().toISOString() });
    }
    const { error } = await sb.from('system_settings').upsert(rows, { onConflict: 'key' });
    if (error) throw error;

    const { invalidateCache } = require('../services/presensi-config');
    invalidateCache();

    await logActivity({ userId: req.user.id, action: 'reset_presensi_config', req });
    res.json({ reset: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
