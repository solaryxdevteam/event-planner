-- =============================================
-- Migration 017: Disable RLS on All Tables
-- =============================================
-- Description: Disables Row-Level Security on all application tables
--              This application uses backend authorization logic instead of RLS
--              Authorization is handled by passing subordinateUserIds in queries
-- Date: 2026-01-27
-- =============================================

-- Disable RLS on all main tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE venues DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE approval_configs DISABLE ROW LEVEL SECURITY;

-- Disable RLS on location tables
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;

-- Disable RLS on invitation/auth tables if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
        ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_codes') THEN
        ALTER TABLE auth_codes DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Comments
COMMENT ON TABLE users IS 'Users table - Authorization handled in backend, not via RLS';
COMMENT ON TABLE venues IS 'Venues table - Authorization handled in backend, not via RLS';
COMMENT ON TABLE events IS 'Events table - Authorization handled in backend, not via RLS';
COMMENT ON TABLE event_versions IS 'Event versions table - Authorization handled in backend, not via RLS';
COMMENT ON TABLE event_approvals IS 'Event approvals table - Authorization handled in backend, not via RLS';
COMMENT ON TABLE reports IS 'Reports table - Authorization handled in backend, not via RLS';
COMMENT ON TABLE audit_logs IS 'Audit logs table - Authorization handled in backend, not via RLS';
