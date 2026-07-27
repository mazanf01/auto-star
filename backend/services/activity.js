'use strict';

const { getSupabase } = require('../lib/supabase');

/**
 * Log user activity to activity_logs table.
 */
async function logActivity({ userId, action, entityType = null, entityId = null, details = null, req = null }) {
  try {
    const sb = getSupabase();
    await sb.from('activity_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: req?.ip || null,
      user_agent: req?.headers?.['user-agent'] || null,
    });
  } catch (err) {
    console.error('[activity] Failed to log:', err.message);
  }
}

module.exports = { logActivity };
