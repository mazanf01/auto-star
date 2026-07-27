-- ============================================================
-- STAR ASN Web App — Initial Migration (Supabase PostgreSQL)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users (app users, not STAR ASN) ───────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Menus / Features ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS menus (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  icon        TEXT,
  path        TEXT,
  description TEXT,
  parent_id   UUID REFERENCES menus(id) ON DELETE SET NULL,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Menu access per user (many-to-many) ──────────────────
CREATE TABLE IF NOT EXISTS user_menus (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  menu_id    UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, menu_id)
);

-- ─── STAR ASN credentials (encrypted) ─────────────────────
CREATE TABLE IF NOT EXISTS star_credentials (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  star_username     TEXT NOT NULL,
  star_password_enc TEXT NOT NULL,
  label             TEXT,
  saved_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Auto-presensi settings ───────────────────────────────
CREATE TABLE IF NOT EXISTS presensi_settings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled        BOOLEAN DEFAULT false,
  check_in_time  TIME NOT NULL DEFAULT '08:00',
  check_out_time TIME NOT NULL DEFAULT '16:00',
  latitude       DOUBLE PRECISION NOT NULL DEFAULT -6.2088,
  longitude      DOUBLE PRECISION NOT NULL DEFAULT 106.8456,
  timezone       TEXT DEFAULT 'Asia/Jakarta',
  work_days      INTEGER[] DEFAULT '{1,2,3,4,5}',
  force_mode     BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Presensi execution logs ──────────────────────────────
CREATE TABLE IF NOT EXISTS presensi_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('in','out')),
  status        TEXT NOT NULL CHECK (status IN ('success','failed','skipped')),
  message       TEXT,
  response_body JSONB,
  executed_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Activity logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_menus_user ON user_menus(user_id);
CREATE INDEX IF NOT EXISTS idx_user_menus_menu ON user_menus(menu_id);
CREATE INDEX IF NOT EXISTS idx_presensi_logs_user ON presensi_logs(user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_presensi_settings_enabled ON presensi_settings(enabled) WHERE enabled = true;

-- ─── Seed default menus ───────────────────────────────────
INSERT INTO menus (name, slug, icon, path, sort_order) VALUES
  ('Dashboard',      'dashboard',      'LayoutDashboard', '/dashboard',      0),
  ('Presensi',       'presensi',       'Fingerprint',     '/presensi',       1),
  ('Auto Presensi',  'auto-presensi',  'Clock',           '/auto-presensi',  2),
  ('Riwayat Presensi','presensi-logs', 'History',         '/presensi-logs',  3),
  ('Tunjangan',      'tunjangan',      'Wallet',          '/tunjangan',      4),
  ('Identitas',      'identitas',      'UserCircle',      '/identitas',      5),
  ('Saved Locations','saved-locations','MapPin',          '/saved-locations', 6),
  ('Profil',         'profil',         'User',            '/profil',         7)
ON CONFLICT (slug) DO NOTHING;

-- ─── Seed default admin (password: admin123) ──────────────
-- bcrypt hash for "admin123" — generated with bcryptjs cost 10
INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES (
  'admin@star-asn.local',
  '$2a$10$83egduq7szUFBcpTpOjEKOioT.5pgA7k81ZuP5WI9yecV/8qKUF4i',
  'Administrator',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- ─── Grant all menu access to admin ───────────────────────
INSERT INTO user_menus (user_id, menu_id)
SELECT u.id, m.id FROM users u, menus m
WHERE u.email = 'admin@star-asn.local'
ON CONFLICT DO NOTHING;

-- ─── updated_at trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at        BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER menus_updated_at        BEFORE UPDATE ON menus        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER presensi_settings_updated_at BEFORE UPDATE ON presensi_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
