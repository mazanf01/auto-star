'use strict';

/**
 * Supabase-backed session store for StarAsnAuth.
 * Replaces local filesystem session files.
 *
 * Usage:
 *   const store = createSessionStore(sb, userId);
 *   const client = new StarAsnAuth({ sessionStore: store });
 *   await client.saveSession(credId);
 *   await client.loadSession(credId);
 */

function createSessionStore(sb, userId) {
  return {
    async save(credId, data) {
      if (!userId || !credId) throw new Error('userId and credId required');
      const { error } = await sb
        .from('star_sessions')
        .upsert(
          {
            user_id: userId,
            cred_id: credId,
            cookies: data.cookieJar || {},
            csrf_token: data.csrfToken || null,
          },
          { onConflict: 'user_id,cred_id' }
        );
      if (error) throw new Error(`Session save failed: ${error.message}`);
    },

    async load(credId) {
      if (!userId || !credId) return null;
      const { data, error } = await sb
        .from('star_sessions')
        .select('cookies, csrf_token, updated_at')
        .eq('user_id', userId)
        .eq('cred_id', credId)
        .single();
      if (error || !data) return null;
      return {
        savedAt: data.updated_at,
        cookieJar: data.cookies || {},
        csrfToken: data.csrf_token || null,
      };
    },

    async clear(credId) {
      if (!userId || !credId) return;
      await sb.from('star_sessions').delete().eq('user_id', userId).eq('cred_id', credId);
    },
  };
}

module.exports = { createSessionStore };
