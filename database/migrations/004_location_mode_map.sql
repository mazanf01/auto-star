-- ============================================================
-- Migration 004: Add 'map' to location_mode constraint
-- ============================================================

ALTER TABLE presensi_settings
  DROP CONSTRAINT IF EXISTS presensi_settings_location_mode_check;

ALTER TABLE presensi_settings
  ADD CONSTRAINT presensi_settings_location_mode_check
  CHECK (location_mode IN ('primary','random','map'));
