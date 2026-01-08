-- =============================================
-- Event Management Platform - Seed Data
-- =============================================
-- Description: Create test hierarchy with sample users, venues, and data
-- Version: 001
-- Date: 2026-01-08
--
-- This script is IDEMPOTENT - can be run multiple times safely
-- It will skip inserts if data already exists
-- =============================================

-- =============================================
-- CLEANUP (Optional - Comment out for production)
-- =============================================
-- Uncomment these lines if you want to reset data before seeding
-- WARNING: This will delete all data!

-- DELETE FROM audit_logs;
-- DELETE FROM reports;
-- DELETE FROM event_approvals;
-- DELETE FROM event_versions;
-- DELETE FROM events;
-- DELETE FROM venues;
-- DELETE FROM templates;
-- DELETE FROM users WHERE email LIKE '%@example.com';
-- DELETE FROM approval_configs WHERE id != (SELECT id FROM approval_configs ORDER BY created_at DESC LIMIT 1);

-- =============================================
-- 1. USER HIERARCHY
-- =============================================
-- Create complete organizational hierarchy with fixed UUIDs for consistency
-- Structure: Global Director → Lead Curator → Regional Curator → City Curator → Event Planners

-- Global Director (Top of hierarchy)
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
  '00000000-0000-0000-0000-000000000001'::uuid,
  'dev@solaryxdev.com',
  'Admin X',
  'global_director',
  NULL, -- No parent (top of hierarchy)
  'New York',
  'Global',
  true
) ON CONFLICT (email) DO NOTHING;

-- Lead Curator (Reports to Global Director)
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
  '00000000-0000-0000-0000-000000000002'::uuid,
  'lead@example.com',
  'Michael Chen',
  'lead_curator',
  '00000000-0000-0000-0000-000000000001'::uuid, -- Reports to Global Director
  'Los Angeles',
  'Americas',
  true
) ON CONFLICT (email) DO NOTHING;

-- Regional Curator (Reports to Lead Curator)
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
  '00000000-0000-0000-0000-000000000003'::uuid,
  'regional@example.com',
  'Emma Rodriguez',
  'regional_curator',
  '00000000-0000-0000-0000-000000000002'::uuid, -- Reports to Lead Curator
  'San Francisco',
  'West Coast',
  true
) ON CONFLICT (email) DO NOTHING;

-- City Curator (Reports to Regional Curator)
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
  '00000000-0000-0000-0000-000000000004'::uuid,
  'city@example.com',
  'James Taylor',
  'city_curator',
  '00000000-0000-0000-0000-000000000003'::uuid, -- Reports to Regional Curator
  'San Francisco',
  'West Coast',
  true
) ON CONFLICT (email) DO NOTHING;

-- Event Planner 1 (Reports to City Curator)
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
  '00000000-0000-0000-0000-000000000005'::uuid,
  'planner1@example.com',
  'Jessica Martinez',
  'event_planner',
  '00000000-0000-0000-0000-000000000004'::uuid, -- Reports to City Curator
  'San Francisco',
  'West Coast',
  true
) ON CONFLICT (email) DO NOTHING;

-- Event Planner 2 (Reports to City Curator)
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
  '00000000-0000-0000-0000-000000000006'::uuid,
  'planner2@example.com',
  'David Anderson',
  'event_planner',
  '00000000-0000-0000-0000-000000000004'::uuid, -- Reports to City Curator
  'San Francisco',
  'West Coast',
  true
) ON CONFLICT (email) DO NOTHING;

-- =============================================
-- 2. APPROVAL CONFIG
-- =============================================
-- Default approval configuration (all roles required)
-- Note: This is already inserted in the initial migration
-- This ensures it exists even if migration was modified

INSERT INTO approval_configs (config_data) 
SELECT '{
  "event_planner": false,
  "city_curator": true,
  "regional_curator": true,
  "lead_curator": true,
  "global_director": true
}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM approval_configs LIMIT 1
);

-- =============================================
-- 3. VENUES
-- =============================================
-- Create 3 sample venues for testing events

-- Venue 1: Downtown Conference Center
INSERT INTO venues (
  id,
  name,
  address,
  city,
  capacity,
  notes,
  creator_id,
  is_active
) VALUES (
  '10000000-0000-0000-0000-000000000001'::uuid,
  'Downtown Conference Center',
  '123 Main Street',
  'San Francisco',
  500,
  'Large venue with AV equipment, catering available, parking for 200 cars',
  '00000000-0000-0000-0000-000000000004'::uuid, -- Created by City Curator
  true
) ON CONFLICT (name, address, creator_id) DO NOTHING;

-- Venue 2: Community Arts Hall
INSERT INTO venues (
  id,
  name,
  address,
  city,
  capacity,
  notes,
  creator_id,
  is_active
) VALUES (
  '10000000-0000-0000-0000-000000000002'::uuid,
  'Community Arts Hall',
  '456 Oak Avenue',
  'San Francisco',
  200,
  'Intimate venue perfect for workshops and small gatherings, has stage and sound system',
  '00000000-0000-0000-0000-000000000005'::uuid, -- Created by Event Planner 1
  true
) ON CONFLICT (name, address, creator_id) DO NOTHING;

-- Venue 3: Waterfront Event Space
INSERT INTO venues (
  id,
  name,
  address,
  city,
  capacity,
  notes,
  creator_id,
  is_active
) VALUES (
  '10000000-0000-0000-0000-000000000003'::uuid,
  'Waterfront Event Space',
  '789 Bay Shore Drive',
  'San Francisco',
  1000,
  'Premium outdoor venue with bay views, weather-protected area available, full catering services',
  '00000000-0000-0000-0000-000000000004'::uuid, -- Created by City Curator
  true
) ON CONFLICT (name, address, creator_id) DO NOTHING;

-- =============================================
-- 4. SAMPLE EVENTS (Optional)
-- =============================================
-- Create a few sample events in different states for testing

-- Sample Event 1: Draft Event
INSERT INTO events (
  id,
  title,
  description,
  event_date,
  event_time,
  venue_id,
  creator_id,
  status,
  expected_attendance,
  budget,
  notes
) VALUES (
  '20000000-0000-0000-0000-000000000001'::uuid,
  'Community Welcome Event',
  'Annual community gathering to welcome new members and celebrate our growth',
  CURRENT_DATE + INTERVAL '30 days',
  '18:00:00',
  '10000000-0000-0000-0000-000000000002'::uuid, -- Community Arts Hall
  '00000000-0000-0000-0000-000000000005'::uuid, -- Created by Planner 1
  'draft',
  150,
  5000.00,
  'Need to confirm catering vendor and finalize guest list'
) ON CONFLICT (id) DO NOTHING;

-- Sample Event 2: Approved Event (Future)
INSERT INTO events (
  id,
  title,
  description,
  event_date,
  event_time,
  venue_id,
  creator_id,
  status,
  expected_attendance,
  budget,
  notes
) VALUES (
  '20000000-0000-0000-0000-000000000002'::uuid,
  'Annual Leadership Summit',
  'Strategic planning session for community leaders',
  CURRENT_DATE + INTERVAL '60 days',
  '09:00:00',
  '10000000-0000-0000-0000-000000000001'::uuid, -- Downtown Conference Center
  '00000000-0000-0000-0000-000000000006'::uuid, -- Created by Planner 2
  'approved_scheduled',
  300,
  15000.00,
  'Full day event with breakfast and lunch included'
) ON CONFLICT (id) DO NOTHING;

-- Sample Event 3: Past Event (For report testing)
INSERT INTO events (
  id,
  title,
  description,
  event_date,
  event_time,
  venue_id,
  creator_id,
  status,
  expected_attendance,
  budget,
  notes
) VALUES (
  '20000000-0000-0000-0000-000000000003'::uuid,
  'Summer Networking Mixer',
  'Casual networking event for community members',
  CURRENT_DATE - INTERVAL '7 days',
  '19:00:00',
  '10000000-0000-0000-0000-000000000003'::uuid, -- Waterfront Event Space
  '00000000-0000-0000-0000-000000000005'::uuid, -- Created by Planner 1
  'completed_awaiting_report',
  180,
  8000.00,
  'Successful event, weather was perfect'
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 5. SAMPLE TEMPLATES (Optional)
-- =============================================
-- Create sample event templates for quick event creation

-- Template 1: Community Gathering
INSERT INTO templates (
  id,
  user_id,
  name,
  template_data
) VALUES (
  '30000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000005'::uuid, -- Planner 1's template
  'Community Gathering Template',
  '{
    "title": "Community Gathering",
    "description": "Regular community meetup and networking event",
    "event_time": "18:00:00",
    "venue_id": "10000000-0000-0000-0000-000000000002",
    "expected_attendance": 100,
    "budget": 3000,
    "notes": "Standard setup with refreshments"
  }'::jsonb
) ON CONFLICT (user_id, name) DO NOTHING;

-- Template 2: Workshop
INSERT INTO templates (
  id,
  user_id,
  name,
  template_data
) VALUES (
  '30000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000006'::uuid, -- Planner 2's template
  'Workshop Template',
  '{
    "title": "Educational Workshop",
    "description": "Interactive learning session",
    "event_time": "14:00:00",
    "venue_id": "10000000-0000-0000-0000-000000000002",
    "expected_attendance": 50,
    "budget": 1500,
    "notes": "Ensure projector and whiteboard are available"
  }'::jsonb
) ON CONFLICT (user_id, name) DO NOTHING;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Run these to verify seed data was inserted correctly

-- Check user hierarchy
-- SELECT 
--   u.name,
--   u.role,
--   u.email,
--   p.name as reports_to,
--   u.city
-- FROM users u
-- LEFT JOIN users p ON u.parent_id = p.id
-- WHERE u.email LIKE '%@example.com'
-- ORDER BY 
--   CASE u.role
--     WHEN 'global_director' THEN 1
--     WHEN 'lead_curator' THEN 2
--     WHEN 'regional_curator' THEN 3
--     WHEN 'city_curator' THEN 4
--     WHEN 'event_planner' THEN 5
--   END;

-- Check venues
-- SELECT name, address, city, capacity, creator_id FROM venues;

-- Check events
-- SELECT title, status, event_date, creator_id FROM events;

-- Check approval config
-- SELECT config_data FROM approval_configs ORDER BY created_at DESC LIMIT 1;

-- Check templates
-- SELECT u.name as owner, t.name as template_name 
-- FROM templates t
-- JOIN users u ON t.user_id = u.id;

-- =============================================
-- SEED COMPLETE
-- =============================================

DO $$ 
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'SEED DATA INSERTED SUCCESSFULLY';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Users created: 6 (1 Director, 1 Lead, 1 Regional, 1 City, 2 Planners)';
  RAISE NOTICE 'Venues created: 3';
  RAISE NOTICE 'Sample events: 3 (draft, approved, completed)';
  RAISE NOTICE 'Templates: 2';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Test Credentials (use for login):';
  RAISE NOTICE '  Global Director: director@example.com';
  RAISE NOTICE '  Lead Curator: lead@example.com';
  RAISE NOTICE '  Regional Curator: regional@example.com';
  RAISE NOTICE '  City Curator: city@example.com';
  RAISE NOTICE '  Event Planner 1: planner1@example.com';
  RAISE NOTICE '  Event Planner 2: planner2@example.com';
  RAISE NOTICE '==============================================';
END $$;
