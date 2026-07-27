'use strict';

/**
 * Presensi system configuration.
 * Loads from system_settings table with 30s cache.
 * All values have sensible defaults hardcoded as fallback.
 */

const { getSupabase } = require('../lib/supabase');

let cached = null;
let cachedAt = 0;
const CACHE_TTL = 30000; // 30s

const DEFAULTS = {
  // Retry
  presensi_max_retries: 3,
  presensi_retry_delay_ms: 5000,
  presensi_retry_backoff: true,
  presensi_retry_backoff_multiplier: 2,
  presensi_retry_max_delay_ms: 30000,

  // Timeout
  presensi_request_timeout_ms: 30000,
  star_login_timeout_ms: 15000,

  // Login retry
  star_login_max_retries: 3,
  star_login_retry_delay_ms: 3000,

  // Already-done detection
  presensi_already_done_keywords: ['sudah presensi', 'already', 'sudah absen', 'already checked', 'sudah melakukan'],

  // Session
  star_session_reuse: true,
  star_session_validate_before_use: true,

  // Pre-checks
  presensi_check_already_done_local: true,
  presensi_check_holiday: true,
  presensi_check_workday: true,

  // Jitter
  presensi_jitter_min_ms: 0,
  presensi_jitter_max_ms: 0,

  // Notifications
  notify_on_success: true,
  notify_on_failure: true,
  notify_on_skipped: true,
  notify_on_holiday: true,
  notify_on_weekend: true,
  notify_on_no_credentials: true,

  // Scheduler
  scheduler_check_interval: 60,
  scheduler_timezone: 'Asia/Jakarta',
};

function parseValue(key, raw) {
  if (raw === null || raw === undefined) return DEFAULTS[key];

  // Boolean
  if (typeof DEFAULTS[key] === 'boolean') return raw === 'true';

  // Number
  if (typeof DEFAULTS[key] === 'number') {
    const n = parseInt(raw, 10);
    return isNaN(n) ? DEFAULTS[key] : n;
  }

  // Array (JSON stored as string)
  if (Array.isArray(DEFAULTS[key])) {
    try { return JSON.parse(raw); } catch { return DEFAULTS[key]; }
  }

  // String
  return raw;
}

async function loadConfig() {
  if (cached && Date.now() - cachedAt < CACHE_TTL) return cached;

  const sb = getSupabase();
  const { data, error } = await sb.from('system_settings').select('key, value');

  if (error || !data) {
    cached = { ...DEFAULTS };
    cachedAt = Date.now();
    return cached;
  }

  const config = { ...DEFAULTS };
  for (const row of data) {
    if (row.key in DEFAULTS) {
      config[row.key] = parseValue(row.key, row.value);
    }
  }

  cached = config;
  cachedAt = Date.now();
  return config;
}

function getCachedSync() {
  return cached || { ...DEFAULTS };
}

function invalidateCache() {
  cached = null;
  cachedAt = 0;
}

module.exports = { loadConfig, getCachedSync, invalidateCache, DEFAULTS };
