'use strict';

const cron = require('node-cron');
const { getSupabase } = require('../lib/supabase');
const { notifyUser } = require('./telegram');
const { loadConfig } = require('./presensi-config');
const { encrypt, decrypt } = require('../lib/crypto');
const { StarAsnAuth } = require('../lib/StarAsnAuth');
const { createSessionStore } = require('../lib/session-store');

const TZ = process.env.SCHEDULER_TIMEZONE || 'Asia/Jakarta';
let scheduledTasks = [];

/**
 * Helper: parse "HH:MM" → minutes since midnight.
 */
function parseTimeToMinutes(t) {
  if (!t) return 0;
  const s = String(t).substring(0, 5);
  const [h, m] = s.split(':').map(n => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Helper: check if currentTime should trigger presensi.
 * If randomMinutes=0 → exact match.
 * If randomMinutes>0 → trigger if currentTime is within [target-randomMinutes, target+randomMinutes],
 *   but only trigger ONCE per day (use a simple in-memory cache).
 */
const _triggeredToday = new Map(); // key: `${userId}:${type}:${date}` → true

function shouldTrigger(currentTime, targetTime, randomMinutes) {
  const now = new Date();
  const todayKey = now.toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD

  // Cache key includes date so it resets daily
  // We need userId but shouldTrigger is called per-user in the loop.
  // Instead, we return true/false based on time window only, and the caller
  // handles the dedup via _triggeredToday map.
  if (!randomMinutes || randomMinutes === 0) {
    return currentTime === targetTime;
  }

  const currentMin = parseTimeToMinutes(currentTime);
  const targetMin = parseTimeToMinutes(targetTime);
  const windowStart = targetMin - randomMinutes;
  const windowEnd = targetMin + randomMinutes;

  return currentMin >= windowStart && currentMin <= windowEnd;
}

/**
 * Check if a user's presensi has already been triggered today.
 */
function hasTriggeredToday(userId, type) {
  const now = new Date();
  const todayKey = now.toLocaleDateString('en-CA', { timeZone: TZ });
  const key = `${userId}:${type}:${todayKey}`;
  return _triggeredToday.has(key);
}

/**
 * Mark a user's presensi as triggered today.
 */
function markTriggered(userId, type) {
  const now = new Date();
  const todayKey = now.toLocaleDateString('en-CA', { timeZone: TZ });
  const key = `${userId}:${type}:${todayKey}`;
  _triggeredToday.set(key, true);
}

// Clean up old entries every hour (prevent memory leak)
setInterval(() => {
  const now = new Date();
  const todayKey = now.toLocaleDateString('en-CA', { timeZone: TZ });
  for (const key of _triggeredToday.keys()) {
    if (!key.includes(todayKey)) _triggeredToday.delete(key);
  }
}, 3600000).unref();

/**
 * Run presensi for a single user.
 * @param {object} settings - presensi_settings row
 * @param {'in'|'out'} type
 */
async function runPresensiForUser(settings, type) {
  const sb = getSupabase();
  const log = (msg) => console.log(`[scheduler] ${settings.user_id} ${type}: ${msg}`);
  const cfg = await loadConfig();

  try {
    // Check if it's a work day
    const now = new Date();
    // Convert to local timezone day
    const localStr = now.toLocaleString('en-US', { timeZone: settings.timezone || TZ, weekday: 'short' });
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const todayDay = dayMap[localStr.substring(0, 3)];
    const workDays = settings.work_days || [1, 2, 3, 4, 5];
    if (cfg.presensi_check_workday && !workDays.includes(todayDay)) {
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      log(`Skipped — not a work day (day=${todayDay})`);
      await sb.from('presensi_logs').insert({
        user_id: settings.user_id, type, status: 'skipped',
        message: 'Not a work day', response_body: { day: todayDay },
      });
      if (cfg.notify_on_weekend) {
        const dayName = dayNames[todayDay] || 'Unknown';
        await notifyUser(sb, settings.user_id,
          `📅 Presensi Dilewati — Hari Libur`,
          `Hari ini ${dayName} (bukan hari kerja)\nPresensi ${type === 'in' ? 'masuk' : 'pulang'} dilewati otomatis.`,
          'info',
          { day: todayDay, day_name: dayName, presensi_type: type }
        ).catch(() => {});
      }
      return;
    }

    // Check if today is a holiday (Phase 3)
    if (cfg.presensi_check_holiday) {
      const todayDate = now.toISOString().split('T')[0];
      const { data: holiday } = await sb
        .from('holidays')
        .select('*')
        .eq('date', todayDate)
        .eq('is_active', true)
        .single();
      if (holiday) {
        log(`Skipped — holiday: ${holiday.name}`);
        await sb.from('presensi_logs').insert({
          user_id: settings.user_id, type, status: 'skipped',
          message: `Holiday: ${holiday.name}`, response_body: { holiday: holiday.name },
        });
        if (cfg.notify_on_holiday) {
          const holidayDate = new Date(todayDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          await notifyUser(sb, settings.user_id,
            `🎉 Presensi Dilewati — ${holiday.name}`,
            `Hari ini libur: *${holiday.name}*\nTanggal: ${holidayDate}\nTipe: ${holiday.type}\n\nPresensi ${type === 'in' ? 'masuk' : 'pulang'} dilewati otomatis.`,
            'presensi',
            { holiday_id: holiday.id, presensi_type: type, holiday_name: holiday.name }
          );
        }
        return;
      }
    }

    // Get STAR ASN credentials (active only)
    const { data: cred, error: credErr } = await sb
      .from('star_credentials')
      .select('*')
      .eq('user_id', settings.user_id)
      .eq('is_active', true)
      .single();
    if (credErr || !cred) {
      log('No active STAR ASN credentials found');
      await sb.from('presensi_logs').insert({
        user_id: settings.user_id, type, status: 'failed',
        message: 'No active STAR ASN credentials. Tambahkan akun di Profil.',
      });
      if (cfg.notify_on_no_credentials) {
        await notifyUser(sb, settings.user_id,
          '❌ Presensi Gagal — Akun Tidak Ditemukan',
          `Tidak ada akun STAR ASN aktif.\nUser: ${settings.user_id}\nTipe: ${type === 'in' ? 'Masuk' : 'Pulang'}\nWaktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
          'error',
          { presensi_type: type, reason: 'no_credentials' }
        ).catch(() => {});
      }
      return;
    }

    // ─── Resolve location (primary or random from saved_locations) ───
    let lat = settings.latitude;
    let lng = settings.longitude;
    let locationName = 'Settings default';

    if (settings.location_mode === 'random') {
      const { data: locs } = await sb
        .from('saved_locations')
        .select('*')
        .eq('user_id', settings.user_id);
      if (locs && locs.length > 0) {
        const pick = locs[Math.floor(Math.random() * locs.length)];
        lat = pick.latitude;
        lng = pick.longitude;
        locationName = pick.name || 'Random';
        log(`Random location: ${locationName} (${lat}, ${lng})`);
      }
    } else if (settings.location_mode === 'primary') {
      // Primary mode — try get primary location
      const { data: primary } = await sb
        .from('saved_locations')
        .select('*')
        .eq('user_id', settings.user_id)
        .eq('is_primary', true)
        .single();
      if (primary) {
        lat = primary.latitude;
        lng = primary.longitude;
        locationName = primary.name || 'Primary';
        log(`Primary location: ${locationName} (${lat}, ${lng})`);
      }
    } else {
      log(`Map mode: using settings coords (${lat}, ${lng})`);
    }

    // ─── Check if already presensi today (local check) ──────
    if (cfg.presensi_check_already_done_local) {
      // WIB-aligned day bounds: 00:00 WIB = 17:00 UTC previous day.
      const _now = new Date();
      const _wibNow = new Date(_now.getTime() + 7 * 3600000);
      const _wibDate = _wibNow.toISOString().split('T')[0]; // YYYY-MM-DD in WIB
      const todayStart = _wibDate + 'T00:00:00+07:00';
      const todayEnd = _wibDate + 'T23:59:59+07:00';
      const { data: existingLog } = await sb
        .from('presensi_logs')
        .select('id, status, message, executed_at')
        .eq('user_id', settings.user_id)
        .eq('type', type)
        .eq('status', 'success')
        .gte('executed_at', todayStart)
        .lte('executed_at', todayEnd)
        .order('executed_at', { ascending: false })
        .limit(1);

      if (existingLog && existingLog.length > 0) {
        log(`Already presensi ${type} today — skipping`);
        if (cfg.notify_on_skipped) {
          const existingTime = new Date(existingLog[0].executed_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' });
          await notifyUser(sb, settings.user_id,
            `ℹ️ Presensi ${type === 'in' ? 'Masuk' : 'Pulang'} Sudah Ada`,
            `Akun: ${cred.star_username}\nLokasi: ${locationName}\n\nPresensi ${type === 'in' ? 'masuk' : 'pulang'} sudah tercatat pada:\n${existingTime} WIB\n\nAuto-presensi dilewati.`,
            'info',
            { presensi_type: type, reason: 'already_done', existing_log_id: existingLog[0].id }
          ).catch(() => {});
        }
        return;
      }
    }

    const password = decrypt(cred.star_password_enc);
    const sessionStore = createSessionStore(sb, settings.user_id);
    const client = new StarAsnAuth({
      debug: process.env.NODE_ENV !== 'production',
      force: settings.force_mode !== false,
      sessionStore,
    });

    // Ensure login (with retry) — session loaded from DB
    const loaded = cfg.star_session_reuse ? await client.loadSession(cred.id) : null;
    if (!loaded || (cfg.star_session_validate_before_use && !(await client.isSessionValid()))) {
      log('Session expired, logging in...');
      const maxLoginRetries = cfg.star_login_max_retries;
      let loginOK = false;
      for (let li = 1; li <= maxLoginRetries; li++) {
        const loginResult = await client.login(cred.star_username, password);
        if (loginResult.ok) {
          await client.saveSession(cred.id);
          log(`Login OK (attempt ${li})`);
          loginOK = true;
          break;
        }
        log(`Login attempt ${li}/${maxLoginRetries} failed: ${loginResult.status}`);
        if (li < maxLoginRetries) {
          const loginDelay = cfg.star_login_retry_delay_ms;
          log(`Retrying login in ${loginDelay / 1000}s...`);
          await new Promise(r => setTimeout(r, loginDelay));
        }
      }
      if (!loginOK) {
        log(`Login failed after ${maxLoginRetries} attempts`);
        await sb.from('presensi_logs').insert({
          user_id: settings.user_id, type, status: 'failed',
          message: `STAR ASN login failed (${maxLoginRetries}x retry)`,
        });
        if (cfg.notify_on_failure) {
          await notifyUser(sb, settings.user_id,
            '❌ Presensi Gagal — Login STAR ASN Error',
            `Akun: ${cred.star_username}\nLokasi: ${locationName} (${lat}, ${lng})\nError: Login gagal setelah ${maxLoginRetries}x retry\nWaktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
            'error',
            { presensi_type: type, reason: 'login_failed', account: cred.star_username }
          ).catch(() => {});
        }
        return;
      }
    }

    // ─── Do presensi with retry ──────────────────────────────
    let result = null;
    let logStatus = 'failed';
    const maxRetries = cfg.presensi_max_retries;
    const alreadyDoneMsgs = cfg.presensi_already_done_keywords;

    // Jitter (random delay before first attempt)
    if (cfg.presensi_jitter_max_ms > 0) {
      const jitterMin = cfg.presensi_jitter_min_ms;
      const jitterMax = cfg.presensi_jitter_max_ms;
      const jitter = jitterMin + Math.floor(Math.random() * (jitterMax - jitterMin + 1));
      if (jitter > 0) {
        log(`Jitter: waiting ${jitter}ms before first attempt...`);
        await new Promise(r => setTimeout(r, jitter));
      }
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      log(`Attempt ${attempt}/${maxRetries}...`);
      result = await client.presensi(type, lat, lng, settings.timezone || TZ);
      logStatus = result.ok && result.body?.status !== 'error' ? 'success' : 'failed';

      if (logStatus === 'success') {
        log(`Success on attempt ${attempt}`);
        break;
      }

      // Check if "already done" — don't retry
      const respMsg = (result.body?.message || '').toLowerCase();
      const isAlreadyDone = alreadyDoneMsgs.some(m => respMsg.includes(m.toLowerCase()));
      if (isAlreadyDone) {
        log('Already presensi (server rejected) — skipping retry');
        logStatus = 'skipped';
        break;
      }

      // Log each failed attempt
      log(`Attempt ${attempt} failed: ${result.body?.message || 'Unknown error'}`);
      if (attempt < maxRetries) {
        let delayMs = cfg.presensi_retry_delay_ms;
        if (cfg.presensi_retry_backoff) {
          delayMs = delayMs * Math.pow(cfg.presensi_retry_backoff_multiplier, attempt - 1);
          delayMs = Math.min(delayMs, cfg.presensi_retry_max_delay_ms);
        }
        log(`Retrying in ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    await sb.from('presensi_logs').insert({
      user_id: settings.user_id, type, status: logStatus,
      message: result.body?.message || (result.ok ? 'OK' : (logStatus === 'skipped' ? 'Already presensi' : 'Failed')),
      response_body: { ...result.body, attempts: logStatus === 'success' ? 1 : (logStatus === 'skipped' ? 1 : maxRetries), account: cred.star_username, location: locationName, coords: { lat, lng } },
    });

    // Notify user of presensi result (Phase 3 + Telegram)
    const presensiTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' });
    const presensiLabel = type === 'in' ? 'Masuk' : 'Pulang';

    // Check if notification should be sent based on config
    const shouldNotify =
      (logStatus === 'success' && cfg.notify_on_success) ||
      (logStatus === 'failed' && cfg.notify_on_failure) ||
      (logStatus === 'skipped' && cfg.notify_on_skipped);

    if (shouldNotify) {
      let notifEmoji, notifTitle, notifType;
      if (logStatus === 'success') {
        notifEmoji = '✅'; notifTitle = `Presensi ${presensiLabel} Berhasil`; notifType = 'success';
      } else if (logStatus === 'skipped') {
        notifEmoji = 'ℹ️'; notifTitle = `Presensi ${presensiLabel} Sudah Ada`; notifType = 'info';
      } else {
        notifEmoji = '❌'; notifTitle = `Presensi ${presensiLabel} Gagal`; notifType = 'error';
      }
      const notifMsg = logStatus === 'success'
        ? `Akun: ${cred.star_username}\nLokasi: ${locationName}\nKoordinat: ${lat}, ${lng}\nWaktu: ${presensiTime} WIB\nStatus: Berhasil`
        : logStatus === 'skipped'
        ? `Akun: ${cred.star_username}\nLokasi: ${locationName}\n\nPresensi ${presensiLabel} sudah tercatat (manual atau sebelumnya).\nAuto-presensi dilewati.`
        : `Akun: ${cred.star_username}\nLokasi: ${locationName}\nKoordinat: ${lat}, ${lng}\nWaktu: ${presensiTime} WIB\nStatus: Gagal (${maxRetries}x retry)\nError: ${result.body?.message || 'Unknown'}`;
      await notifyUser(sb, settings.user_id,
        `${notifEmoji} ${notifTitle}`,
        notifMsg,
        notifType,
        { presensi_type: type, status: logStatus, time: presensiTime, account: cred.star_username, location: locationName }
      ).catch(() => {});
    }

    log(`Done: ${logStatus} — ${result.body?.message || ''}`);
  } catch (err) {
    console.error(`[scheduler] ${settings.user_id} ${type} ERROR:`, err.message);
    await sb.from('presensi_logs').insert({
      user_id: settings.user_id, type, status: 'failed',
      message: err.message, response_body: { error: err.message },
    }).catch(() => {});
  }
}

/**
 * Run presensi for all enabled users at a specific time.
 * @param {'in'|'out'} type
 */
async function runPresensiBatch(type) {
  const sb = getSupabase();
  const { data: settings, error } = await sb
    .from('presensi_settings')
    .select('*')
    .eq('enabled', true);
  if (error) {
    console.error('[scheduler] Failed to fetch settings:', error.message);
    return;
  }
  if (!settings || settings.length === 0) {
    console.log(`[scheduler] No enabled users for ${type}`);
    return;
  }

  console.log(`[scheduler] Running ${type} for ${settings.length} user(s)...`);
  for (const s of settings) {
    await runPresensiForUser(s, type);
  }
  console.log(`[scheduler] ${type} batch done.`);
}

/**
 * Start the cron scheduler.
 * Runs every minute, checks each user's time settings.
 */
function startScheduler() {
  if (process.env.SCHEDULER_ENABLED !== 'true') {
    console.log('[scheduler] Disabled (SCHEDULER_ENABLED != true)');
    return;
  }

  console.log(`[scheduler] Starting (TZ=${TZ})`);

  // Run every minute to check if it's time for any user's check-in/out
  const task = cron.schedule('* * * * *', async () => {
    const now = new Date();
    // Get current time in Asia/Jakarta
    const localTime = now.toLocaleTimeString('en-US', {
      timeZone: TZ,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const [hh, mm] = localTime.split(':').map(s => parseInt(s, 10));
    const currentTime = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;

    const sb = getSupabase();
    const { data: settings } = await sb
      .from('presensi_settings')
      .select('*')
      .eq('enabled', true);

    if (!settings) return;

    // Get current weekday (0=Sun ... 6=Sat)
    const localStr = now.toLocaleString('en-US', { timeZone: TZ, weekday: 'short' });
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const todayDay = dayMap[localStr.substring(0, 3)];

    for (const s of settings) {
      // Skip if not a work day
      const workDays = s.work_days || [1, 2, 3, 4, 5];
      if (!workDays.includes(todayDay)) continue;

      // Check-in: exact time or within random range
      const checkInTime = s.check_in_time ? String(s.check_in_time).substring(0, 5) : '08:00';
      const checkOutTime = s.check_out_time ? String(s.check_out_time).substring(0, 5) : '16:00';
      const inRandom = s.check_in_random || 0;
      const outRandom = s.check_out_random || 0;

      if (shouldTrigger(currentTime, checkInTime, inRandom) && !hasTriggeredToday(s.user_id, 'in')) {
        markTriggered(s.user_id, 'in');
        console.log(`[scheduler] Check-in time for user ${s.user_id} (now=${currentTime}, target=${checkInTime}±${inRandom}m)`);
        runPresensiForUser(s, 'in').catch(e => console.error('[scheduler] check-in error:', e.message));
      }
      if (shouldTrigger(currentTime, checkOutTime, outRandom) && !hasTriggeredToday(s.user_id, 'out')) {
        markTriggered(s.user_id, 'out');
        console.log(`[scheduler] Check-out time for user ${s.user_id} (now=${currentTime}, target=${checkOutTime}±${outRandom}m)`);
        runPresensiForUser(s, 'out').catch(e => console.error('[scheduler] check-out error:', e.message));
      }
    }
  }, { timezone: TZ });

  scheduledTasks.push(task);
  console.log('[scheduler] Cron job started (every minute check)');
}

function stopScheduler() {
  scheduledTasks.forEach(t => t.stop());
  scheduledTasks = [];
}

module.exports = { startScheduler, stopScheduler, runPresensiForUser, runPresensiBatch };
