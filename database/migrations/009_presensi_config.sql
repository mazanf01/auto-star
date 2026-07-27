-- Presensi system configuration defaults
-- Run in Supabase SQL Editor

INSERT INTO system_settings (key, value) VALUES
  -- Retry settings
  ('presensi_max_retries', '10'),
  ('presensi_retry_delay_ms', '5000'),
  ('presensi_retry_backoff', 'true'),
  ('presensi_retry_backoff_multiplier', '2'),
  ('presensi_retry_max_delay_ms', '30000'),

  -- Timeout settings
  ('presensi_request_timeout_ms', '30000'),
  ('star_login_timeout_ms', '15000'),

  -- Login retry settings
  ('star_login_max_retries', '3'),
  ('star_login_retry_delay_ms', '3000'),

  -- Already-done detection
  ('presensi_already_done_keywords', '["sudah presensi","already","sudah absen","already checked","sudah melakukan"]'),

  -- Session management
  ('star_session_reuse', 'true'),
  ('star_session_validate_before_use', 'true'),

  -- Pre-presensi checks
  ('presensi_check_already_done_local', 'true'),
  ('presensi_check_holiday', 'true'),
  ('presensi_check_workday', 'true'),

  -- Jitter (random delay before first attempt, ms)
  ('presensi_jitter_min_ms', '0'),
  ('presensi_jitter_max_ms', '0'),

  -- Notification settings
  ('notify_on_success', 'true'),
  ('notify_on_failure', 'true'),
  ('notify_on_skipped', 'true'),
  ('notify_on_holiday', 'true'),
  ('notify_on_weekend', 'true'),
  ('notify_on_no_credentials', 'true'),

  -- Scheduler
  ('scheduler_check_interval', '60'),
  ('scheduler_timezone', 'Asia/Jakarta')
ON CONFLICT (key) DO NOTHING;

-- Verify
SELECT key, value FROM system_settings ORDER BY key;
