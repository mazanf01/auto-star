'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth, requireAdmin } = require('../middleware/auth');
const { getBotToken, isEnabled, getUserChatId, sendToUser } = require('../services/telegram');

const router = express.Router();
router.use(auth);

// ─── GET /api/telegram/status — check if telegram is configured ─
router.get('/status', async (req, res) => {
  try {
    const [token, enabled, chatId] = await Promise.all([
      getBotToken(),
      isEnabled(),
      getUserChatId(req.user.id),
    ]);
    res.json({
      configured: !!token && token.length >= 10 && token.includes(':'),
      enabled,
      chatId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/telegram/test — send test message to current user ─
router.post('/test', async (req, res) => {
  try {
    const ok = await sendToUser(req.user.id, '✅ *Test Notification*\n\nTelegram notification terkonfigurasi dengan benar!');
    if (!ok) return res.status(400).json({ error: 'Gagal kirim. Pastikan bot token, telegram_enabled, dan chat_id sudah set.' });
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── PUT /api/telegram/chat-id — set own telegram chat_id ──
router.put('/chat-id', async (req, res) => {
  try {
    const { chat_id } = req.body;
    if (!chat_id) return res.status(400).json({ error: 'chat_id required' });
    const sb = getSupabase();
    const { error } = await sb
      .from('users')
      .update({ telegram_chat_id: parseInt(chat_id, 10) })
      .eq('id', req.user.id);
    if (error) throw error;
    res.json({ set: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── GET /api/telegram/webhook-info — admin: get webhook info ─
router.get('/webhook-info', requireAdmin, async (req, res) => {
  try {
    const token = await getBotToken();
    if (!token) return res.json({ error: 'Bot token not configured' });
    const resp = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── GET /api/telegram/me — admin: get bot info ──
router.get('/me', requireAdmin, async (req, res) => {
  try {
    const token = await getBotToken();
    if (!token) return res.json({ error: 'Bot token not configured' });
    const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── Admin: set bot token & enable/disable ──────────────────
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const { bot_token, enabled } = req.body;
    const sb = getSupabase();
    if (bot_token !== undefined) {
      await sb.from('system_settings').upsert({ key: 'telegram_bot_token', value: bot_token, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    if (enabled !== undefined) {
      await sb.from('system_settings').upsert({ key: 'telegram_enabled', value: String(enabled), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

// ─── POST /api/telegram/webhook/:token — Telegram webhook ──
// Telegram sends updates here (e.g., /start command to get chat_id)
router.post('/webhook/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const configuredToken = await getBotToken();
    if (token !== configuredToken) return res.status(403).json({ error: 'Invalid token' });

    const update = req.body;
    const msg = update.message;
    if (msg && msg.text === '/start') {
      const chatId = msg.chat.id;
      const username = msg.from?.username || msg.from?.first_name || 'Unknown';
      // Send back the chat_id so user can register it
      await fetch(`https://api.telegram.org/bot${configuredToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `👋 Halo ${username}!\n\nChat ID Anda: *${chatId}*\n\nMasukkan ID ini di halaman Profil → Telegram untuk menerima notifikasi presensi.`,
          parse_mode: 'Markdown',
        }),
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
