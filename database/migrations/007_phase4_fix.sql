-- Phase 4 fix: idempotent migration (safe to re-run)
-- Run in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════
-- 1. MULTI-ACCOUNT: star_credentials
-- ═══════════════════════════════════════════════════════════

-- Drop unique constraint if exists
ALTER TABLE star_credentials DROP CONSTRAINT IF EXISTS star_credentials_user_id_key;

-- Add is_active column if not exists
ALTER TABLE star_credentials ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE star_credentials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Partial unique index (only 1 active per user)
DROP INDEX IF EXISTS star_credentials_active_per_user;
CREATE UNIQUE INDEX IF NOT EXISTS star_credentials_active_per_user
  ON star_credentials(user_id)
  WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════
-- 2. SESSION MANAGEMENT
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes (safe — IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist, recreate
DROP POLICY IF EXISTS sessions_owner ON sessions;
CREATE POLICY sessions_owner ON sessions FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- 3. Set existing credential as active (if none active)
-- ═══════════════════════════════════════════════════════════
UPDATE star_credentials
SET is_active = true
WHERE is_active IS NULL
   OR is_active = false;

-- Ensure exactly 1 active per user (set the most recent as active)
UPDATE star_credentials sc
SET is_active = false
WHERE sc.id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM star_credentials
  ORDER BY user_id, saved_at DESC
);
