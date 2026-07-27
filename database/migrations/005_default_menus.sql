-- ============================================================
-- Migration 005: Phase 2 — Default menus for new users
-- ============================================================

-- Add is_default_for_new column to menus
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS is_default_for_new BOOLEAN DEFAULT false;

-- Set default menus for new users (Dashboard + Presensi + Profil)
UPDATE menus SET is_default_for_new = true
WHERE slug IN ('dashboard', 'presensi', 'profil');
