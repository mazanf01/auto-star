-- ─── Migration 010: STAR ASN sessions in DB (replace local JSON files) ───
-- Stores STAR ASN cookies + CSRF token per user per account.
-- Eliminates need for local filesystem session files → deploy-friendly.

CREATE TABLE IF NOT EXISTS star_sessions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cred_id        UUID NOT NULL REFERENCES star_credentials(id) ON DELETE CASCADE,
  cookies        JSONB NOT NULL DEFAULT '{}',
  csrf_token     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, cred_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_star_sessions_user_cred ON star_sessions(user_id, cred_id);

-- RLS
ALTER TABLE star_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON star_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_star_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER star_sessions_updated_at
  BEFORE UPDATE ON star_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_star_sessions_updated_at();
