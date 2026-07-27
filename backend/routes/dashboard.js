'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ─── GET /api/dashboard — stats for current user ───────────
router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    // WIB-aligned "today": 00:00 WIB = 17:00 UTC previous day.
    const _wibNow = new Date(Date.now() + 7 * 3600000);
    const today = _wibNow.toISOString().split('T')[0]; // YYYY-MM-DD in WIB

    // Today's presensi logs for this user
    const { data: todayLogs, error: e1 } = await sb
      .from('presensi_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('executed_at', today + 'T00:00:00+07:00')
      .order('executed_at', { ascending: false });
    if (e1) throw e1;

    // Last 7 days presensi logs (WIB-aligned)
    const sevenDaysAgo = new Date(_wibNow.getTime() - 7 * 86400000).toISOString();
    const { data: weekLogs, error: e2 } = await sb
      .from('presensi_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('executed_at', sevenDaysAgo)
      .order('executed_at', { ascending: false });
    if (e2) throw e2;

    // User's menus
    let menus;
    if (req.user.role === 'admin') {
      const { data } = await sb.from('menus').select('*').eq('is_active', true).order('sort_order', { ascending: true });
      menus = data;
    } else {
      const { data } = await sb
        .from('user_menus')
        .select('menu:menus(*)')
        .eq('user_id', req.user.id)
        .eq('menu.is_active', true);
      menus = (data || []).map(r => r.menu).filter(Boolean).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    // Presensi settings
    const { data: settings } = await sb
      .from('presensi_settings')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    // Admin: extra stats
    let adminStats = null;
    if (req.user.role === 'admin') {
      const [{ count: totalUsers }, { count: totalMenus }, { count: activeAutoPresensi }, { count: todayActivity }] = await Promise.all([
        sb.from('users').select('*', { count: 'exact', head: true }),
        sb.from('menus').select('*', { count: 'exact', head: true }),
        sb.from('presensi_settings').select('*', { count: 'exact', head: true }).eq('enabled', true),
        sb.from('activity_logs').select('*', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00Z'),
      ]);
      adminStats = { totalUsers, totalMenus, activeAutoPresensi, todayActivity };
    }

    res.json({
      user: req.user,
      todayLogs: todayLogs || [],
      weekLogs: weekLogs || [],
      menus,
      settings: settings || null,
      adminStats,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
