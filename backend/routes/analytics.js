'use strict';

const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ─── GET /api/analytics — presensi analytics for current user
router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const { days = 7 } = req.query;
    // WIB-aligned "since": start of N days ago at 00:00 WIB (= previous day 17:00 UTC).
    // WIB = UTC+7, so 00:00 WIB = 17:00 UTC the day before.
    const now = new Date();
    // Compute "today" in WIB by shifting
    const wibOffsetMs = 7 * 3600000;
    const wibNow = new Date(now.getTime() + wibOffsetMs);
    // Start of WIB "today" in WIB wall-clock = wibNow at 00:00
    const wibTodayStart = new Date(Date.UTC(
      wibNow.getUTCFullYear(),
      wibNow.getUTCMonth(),
      wibNow.getUTCDate(),
      0, 0, 0
    ));
    // N days ago at 00:00 WIB
    const since = new Date(wibTodayStart.getTime() - (parseInt(days, 10) - 1) * 86400000).toISOString();

    // Fetch presensi logs + star credential info
    const { data: logs, error } = await sb
      .from('presensi_logs')
      .select('executed_at, type, status, message, response_body')
      .eq('user_id', req.user.id)
      .gte('executed_at', since)
      .order('executed_at', { ascending: true });
    if (error) throw error;

    // Fetch star credentials for this user (to show which account was used)
    const { data: creds } = await sb
      .from('star_credentials')
      .select('id, star_username, label, is_active')
      .eq('user_id', req.user.id)
      .order('saved_at', { ascending: false });

    // Helper: convert UTC ISO to WIB date string (YYYY-MM-DD in Asia/Jakarta)
    function toWIBDate(isoStr) {
      const d = new Date(isoStr);
      // Force interpret as WIB: shift +7h then take date
      const wib = new Date(d.getTime() + 7 * 3600000);
      return wib.toISOString().split('T')[0];
    }

    function toWIBTime(isoStr) {
      const d = new Date(isoStr);
      const wib = new Date(d.getTime() + 7 * 3600000);
      return wib.toISOString().split('T')[1].substring(0, 8); // HH:MM:SS
    }

    // Build daily summary (grouped by WIB date)
    const daily = {};
    (logs || []).forEach((l) => {
      const date = toWIBDate(l.executed_at);
      if (!daily[date]) daily[date] = { date, checkIn: null, checkOut: null, status: 'absent', account: null, details: [] };

      // Extract account from response_body if available
      const acct = l.response_body?.account || null;

      if (l.type === 'in' && l.status === 'success' && !daily[date].checkIn) {
        daily[date].checkIn = l.executed_at;
        daily[date].account = acct;
      }
      if (l.type === 'out' && l.status === 'success') {
        daily[date].checkOut = l.executed_at;
        if (!daily[date].account) daily[date].account = acct;
      }

      // Store all log entries for this day
      daily[date].details.push({
        type: l.type,
        status: l.status,
        time: toWIBTime(l.executed_at),
        message: l.message,
        account: acct,
      });
    });

    // Determine status per day
    Object.values(daily).forEach((d) => {
      if (d.checkIn && d.checkOut) d.status = 'complete';
      else if (d.checkIn) d.status = 'partial';
      else d.status = 'failed';
    });

    const dayList = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));

    // Stats
    const total = dayList.length;
    const complete = dayList.filter((d) => d.status === 'complete').length;
    const partial = dayList.filter((d) => d.status === 'partial').length;
    const failed = dayList.filter((d) => d.status === 'failed').length;
    const successRate = total > 0 ? Math.round((complete / total) * 100) : 0;

    // Avg check-in time (minutes from midnight, WIB)
    const checkInTimes = dayList
      .filter((d) => d.checkIn)
      .map((d) => {
        const wibTime = toWIBTime(d.checkIn);
        const [h, m] = wibTime.split(':').map(Number);
        return h * 60 + m;
      });
    const avgCheckIn = checkInTimes.length > 0
      ? Math.round(checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length)
      : null;

    // Format avgCheckIn to HH:MM (WIB)
    const avgCheckInStr = avgCheckIn !== null
      ? `${String(Math.floor(avgCheckIn / 60)).padStart(2, '0')}:${String(avgCheckIn % 60).padStart(2, '0')}`
      : null;

    // Streak (consecutive complete days, ending today or yesterday)
    let streak = 0;
    for (let i = dayList.length - 1; i >= 0; i--) {
      if (dayList[i].status === 'complete') streak++;
      else break;
    }

    res.json({
      days: parseInt(days, 10),
      daily: dayList,
      stats: {
        total,
        complete,
        partial,
        failed,
        successRate,
        avgCheckIn: avgCheckInStr,
        streak,
      },
      starAccounts: (creds || []).map(c => ({
        id: c.id,
        username: c.star_username,
        label: c.label,
        isActive: c.is_active,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

module.exports = router;
