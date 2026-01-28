-- =============================================
-- Migration 016: Disable RLS on audit_logs
-- =============================================
-- Description: Disables Row Level Security on audit_logs table
--              to align with backend-only authorization architecture
-- Date: 2026-01-XX
-- =============================================

-- Disable RLS on audit_logs table
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Comment
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all significant actions. RLS disabled - authorization handled in backend service layer.';
