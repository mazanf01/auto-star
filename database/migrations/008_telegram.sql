-- Telegram notification integration
-- Run in Supabase SQL Editor

-- Add telegram_chat_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- Add system_settings table for global config (bot token, etc)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default empty telegram bot token
INSERT INTO system_settings (key, value) VALUES
  ('telegram_bot_token', ''),
  ('telegram_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- RLS: only admin can read/write system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS system_settings_admin ON system_settings;
CREATE POLICY system_settings_admin ON system_settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Users can update their own telegram_chat_id
DROP POLICY IF EXISTS users_telegram_self ON users;
CREATE POLICY users_telegram_self ON users FOR UPDATE TO authenticated
  USING (id = auth.uid());
