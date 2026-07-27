-- ============================================================
-- Row Level Security (Supabase RLS)
-- ============================================================
-- We manage auth via our own JWT in the backend, so RLS is
-- permissive for authenticated service_role key only.
-- The backend uses the service_role key which bypasses RLS.
-- ============================================================

ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_menus         ENABLE ROW LEVEL SECURITY;
ALTER TABLE star_credentials   ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs      ENABLE ROW LEVEL SECURITY;

-- All tables: allow service_role full access, deny anon
CREATE POLICY "service_role_all" ON users   FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON menus   FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON user_menus FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON star_credentials FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON presensi_settings FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON presensi_logs FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON activity_logs FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
