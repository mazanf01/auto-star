-- Phase 4: Multi-Account STAR ASN + Session Management
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════
-- 1. MULTI-ACCOUNT: Drop UNIQUE constraint on star_credentials.user_id
-- ═══════════════════════════════════════════════════════════

-- Drop the unique constraint so 1 user can have multiple STAR ASN accounts
ALTER TABLE star_credentials DROP CONSTRAINT IF EXISTS star_credentials_user_id_key;

-- Add is_active column (only 1 active per user at a time)
ALTER TABLE star_credentials ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add updated_at column if not exists
ALTER TABLE star_credentials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure only 1 active credential per user via partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS star_credentials_active_per_user
  ON star_credentials(user_id)
  WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════
-- 2. SESSION MANAGEMENT
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,              -- hash of JWT (not raw token)
  device_info TEXT,                       -- parsed User-Agent
  ip_address TEXT,
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_owner ON sessions FOR ALL TO authenticated
  USING (user_id = auth.uid());
