-- =============================================
-- Drop legacy audit trigger that causes NOT NULL violation
-- =============================================
-- When a global director (or any approver) approves a report or marketing report,
-- the app updates event_approvals (and possibly marketing_reports). If an old
-- trigger exists that inserts into audit_logs without setting action_type,
-- Postgres raises:
--   null value in column "action_type" of relation "audit_logs" violates not-null constraint
--
-- Audit logging is done in application code (audit.service.ts) with proper action_type.
-- Run this once on any database that was created from the old migrations.
-- =============================================

-- Drop trigger on all tables that may have had the legacy audit trigger
DROP TRIGGER IF EXISTS audit_log_trigger ON event_approvals;
DROP TRIGGER IF EXISTS audit_log_trigger ON events;
DROP TRIGGER IF EXISTS audit_log_trigger ON marketing_reports;
DROP TRIGGER IF EXISTS audit_log_trigger ON reports;
DROP TRIGGER IF EXISTS audit_log_trigger ON venue_approvals;

-- Drop the trigger function so it is not left behind (CASCADE drops dependent triggers)
DROP FUNCTION IF EXISTS audit_log_trigger() CASCADE;
DROP FUNCTION IF EXISTS audit_log_trigger(trigger) CASCADE;
