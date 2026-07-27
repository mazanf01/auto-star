-- Phase 3: Holiday Calendar + Notifications + Analytics
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════
-- 1. HOLIDAYS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'national' CHECK (type IN ('national', 'religious', 'custom')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed: hari libur nasional 2026 (sebagian)
INSERT INTO holidays (name, date, type) VALUES
  ('Tahun Baru',         '2026-01-01', 'national'),
  ('Tahun Baru Imlek',   '2026-02-17', 'religious'),
  ('Hari Suci Nyepi',    '2026-03-19', 'religious'),
  ('Wafat Isa Almasih',  '2026-04-03', 'national'),
  ('Hari Buruh',         '2026-05-01', 'national'),
  ('Kenaikan Isa Almasih','2026-05-14', 'religious'),
  ('Hari Lahir Pancasila','2026-06-01', 'national'),
  ('Idul Adha',          '2026-05-27', 'religious'),
  ('Tahun Baru Hijriyah', '2026-06-27', 'religious'),
  ('Hari Kemerdekaan',   '2026-08-17', 'national'),
  ('Maulid Nabi',        '2026-08-26', 'religious'),
  ('Hari Raya Natal',    '2026-12-25', 'national')
ON CONFLICT (date) DO NOTHING;

-- RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY holidays_read ON holidays FOR SELECT USING (true);
CREATE POLICY holidays_admin ON holidays FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ═══════════════════════════════════════════════════════════
-- 2. NOTIFICATIONS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'presensi')),
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_owner ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- 3. ANALYTICS VIEW (30-day presensi summary per user)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_presensi_analytics AS
SELECT
  p.user_id,
  DATE(p.executed_at) AS presensi_date,
  p.type,
  p.status,
  COUNT(*) AS count
FROM presensi_logs p
WHERE p.executed_at >= NOW() - INTERVAL '90 days'
GROUP BY p.user_id, DATE(p.executed_at), p.type, p.status;
