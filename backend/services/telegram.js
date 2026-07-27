'use strict';

/**
 * Telegram notification service.
 * Sends messages via Telegram Bot API.
 * Bot token stored in system_settings table.
 */

const { getSupabase } = require('../lib/supabase');

let cachedBotToken = null;
let cachedAt = 0;

async function getBotToken() {
  // Cache for 60s
  if (cachedBotToken && Date.now() - cachedAt < 60000) return cachedBotToken;
  const sb = getSupabase();
  const { data, error } = await sb
    .from('system_settings')
    .select('value')
    .eq('key', 'telegram_bot_token')
    .single();
  if (error || !data?.value) return null;
  cachedBotToken = data.value;
  cachedAt = Date.now();
  return cachedBotToken;
}

async function isEnabled() {
  const sb = getSupabase();
  const { data } = await sb
    .from('system_settings')
    .select('value')
    .eq('key', 'telegram_enabled')
    .single();
  return data?.value === 'true';
}

/**
 * Get telegram chat_id for a user.
 */
async function getUserChatId(userId) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('users')
    .select('telegram_chat_id')
    .eq('id', userId)
    .single();
  if (error || !data?.telegram_chat_id) return null;
  return data.telegram_chat_id;
}

/**
 * Send a Telegram message to a user.
 * @param {string} userId - user UUID
 * @param {string} text - message text (supports Markdown)
 * @returns {Promise<boolean>} success
 */
async function sendToUser(userId, text) {
  try {
    const [token, enabled, chatId] = await Promise.all([
      getBotToken(),
      isEnabled(),
      getUserChatId(userId),
    ]);
    // token must be non-empty and look like a bot token (contains ':')
    if (!token || token.length < 10 || !token.includes(':') || !enabled || !chatId) return false;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    if (!resp.ok) {
      console.error('[telegram] send failed:', resp.status, await resp.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[telegram] error:', err.message);
    return false;
  }
}

/**
 * Send notification to user via both in-app (notifications table) and Telegram.
 * @param {object} sb - Supabase client
 * @param {string} userId - user UUID
 * @param {string} title - notification title
 * @param {string} message - notification message
 * @param {string} type - notification type (info/success/warning/error/presensi)
 * @param {object} metadata - optional metadata
 */
async function notifyUser(sb, userId, title, message, type = 'info', metadata = {}) {
  // In-app notification
  try {
    await sb.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      metadata,
    });
  } catch (e) {
    console.error('[notify] in-app failed:', e.message);
  }

  // Telegram notification (async, non-blocking)
  const telegramText = `*${title}*\n\n${message}`;
  sendToUser(userId, telegramText).catch(() => {}); // fire & forget
}

module.exports = { sendToUser, notifyUser, getBotToken, isEnabled, getUserChatId };
