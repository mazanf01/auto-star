-- ============================================================
-- STAR ASN Web App — Migration 003: Phase 1 Features
--  - saved_locations table (primary + random mode)
--  - presensi_settings: random range columns + location_mode
-- ============================================================

-- ─── Saved Locations ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  address     TEXT,
  is_primary  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_locations_user ON saved_locations(user_id);

-- Ensure only one primary per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_locations_primary
  ON saved_locations(user_id)
  WHERE is_primary = true;

CREATE TRIGGER saved_locations_updated_at
  BEFORE UPDATE ON saved_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Presensi settings: new columns ───────────────────────
ALTER TABLE presensi_settings
  ADD COLUMN IF NOT EXISTS check_in_random   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS check_out_random  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS location_mode     TEXT DEFAULT 'primary' CHECK (location_mode IN ('primary','random','map'));

-- ─── Seed a default saved location for admin ──────────────
INSERT INTO saved_locations (user_id, name, latitude, longitude, address, is_primary)
SELECT u.id, 'Kantor Pusat', -6.2088, 106.8456, 'Jakarta Pusat', true
FROM users u
WHERE u.email = 'admin@star-asn.local'
AND NOT EXISTS (SELECT 1 FROM saved_locations sl WHERE sl.user_id = u.id);
