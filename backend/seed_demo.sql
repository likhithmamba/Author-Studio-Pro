-- ═══════════════════════════════════════════════════════════════════════
-- SEED DATA: Demo User + Demo Project for Development Mode
-- Run this ONCE after creating all tables.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Insert demo user (the mock auth user)
INSERT INTO users (id, email, password_hash)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'demo@example.com',
  '$2b$12$rmoaMSqN5lT2OPA1gddlUMOmGG6xHYgwXWthXeiOROibsGzU'
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert demo project
INSERT INTO projects (id, user_id, title)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'My Novel'
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert demo subscription
INSERT INTO subscriptions (id, user_id, plan, status)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'studio',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- 4. Insert a default chapter
INSERT INTO chapters (id, project_id, title)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Chapter 1'
) ON CONFLICT (id) DO NOTHING;
