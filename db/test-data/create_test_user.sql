-- =============================================
-- Create Test User for Development
-- =============================================
-- This creates a test user that can be used when testing
-- without authentication enabled
-- =============================================

-- Create test user with the UUID used in testing
INSERT INTO users (
  id,
  email,
  name,
  role,
  parent_id,
  city,
  region,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  'Test User',
  'event_planner',
  NULL,
  'San Francisco',
  'California',
  true
) ON CONFLICT (id) DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- Verify the user was created
SELECT id, email, name, role, city, region, is_active
FROM users
WHERE id = '00000000-0000-0000-0000-000000000000';
