'use strict';

const jwt = require('jsonwebtoken');
const { getSupabase } = require('../lib/supabase');

/**
 * Verify JWT from Authorization header.
 * Attaches user info to req.user.
 */
async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const sb = getSupabase();
    const { data: user, error } = await sb
      .from('users')
      .select('id, email, full_name, role, is_active')
      .eq('id', decoded.sub)
      .single();
    if (error || !user) return res.status(401).json({ error: 'User not found' });
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });
    req.user = user;

    // ─── Update session last_active (Phase 4, non-fatal) ────
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    sb.from('sessions')
      .update({ last_active: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .eq('user_id', user.id)
      .then(({ data: sess }) => { req.sessionId = sess?.[0]?.id || null; })
      .catch(() => {});

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', detail: err.message });
  }
}

/**
 * Require admin role.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Check if user has access to a specific menu slug.
 * Admins have access to all menus.
 */
async function requireMenuAccess(slug) {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') return next();
      const sb = getSupabase();
      const { data, error } = await sb
        .from('user_menus')
        .select('menu_id')
        .eq('user_id', req.user.id)
        .eq('menu_id', sb.from('menus').select('id').eq('slug', slug).single());
      // Simpler: join check
      const { data: access } = await sb
        .rpc('check_menu_access', { p_user_id: req.user.id, p_slug: slug });
      if (!access) {
        return res.status(403).json({ error: `No access to menu: ${slug}` });
      }
      next();
    } catch (err) {
      // Fallback: manual check
      const sb = getSupabase();
      const { data: menu } = await sb.from('menus').select('id').eq('slug', slug).eq('is_active', true).single();
      if (!menu) return res.status(404).json({ error: 'Menu not found' });
      const { data: um } = await sb.from('user_menus').select('id').eq('user_id', req.user.id).eq('menu_id', menu.id).single();
      if (!um) return res.status(403).json({ error: `No access to menu: ${slug}` });
      next();
    }
  };
}

module.exports = { auth, requireAdmin, requireMenuAccess };
