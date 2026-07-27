'use strict';

/**
 * Vercel Cron Endpoint — Auto Presensi Scheduler
 *
 * Dipanggil oleh Vercel Cron setiap menit (lihat vercel.json).
 * Menggantikan node-cron yang jalan terus (tidak bisa di serverless).
 *
 * Security: endpoint diproteksi via CRON_SECRET — Vercel mengirim header
 * "Authorization: Bearer <CRON_SECRET>" otomatis.
 *
 * Logic sama persis dengan services/scheduler.js → startScheduler() cron loop.
 */

const { startSchedulerTick } = require('../../backend/services/scheduler');

module.exports = async (req, res) => {
  // Vercel Cron mengirim Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers['authorization'] || '';
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await startSchedulerTick();
    res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error('[cron/presensi] Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
