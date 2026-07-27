'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../services/activity');

const router = express.Router();

// ═══════════════════════════════════════════════════════════
// Activity logs — admin sees all, users see their own
// ═══════════════════════════════════════════════════════════
router.use(auth);

// ─── GET /api/activity — list activity logs ────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, user_id } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const sb = getSupabase();
    let query = sb
      .from('activity_logs')
      .select('id, user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at, user:users(email, full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // Non-admins only see their own logs
    if (req.user.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    } else if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      logs: data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        total_pages: Math.ceil(count / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
