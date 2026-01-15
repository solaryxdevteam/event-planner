-- =============================================
-- Event Management Platform - Initial Schema
-- =============================================
-- Description: Complete database schema with hierarchical user management,
--              event lifecycle, approval workflows, and audit logging
-- Version: 001
-- Date: 2026-01-08
-- =============================================

-- =============================================
-- 1. ENUMS
-- =============================================

-- User role hierarchy (lowest to highest authority)
CREATE TYPE role AS ENUM (
  'event_planner',
  'city_curator',
  'regional_curator',
  'lead_curator',
  'global_director'
);

-- Event lifecycle status
CREATE TYPE event_status AS ENUM (
  'draft',
  'in_review',
  'rejected',
  'approved_scheduled',
  'completed_awaiting_report',
  'completed_archived',
  'cancelled'
);

-- Approval record status
CREATE TYPE approval_status AS ENUM (
  'waiting',     -- Not yet their turn in chain
  'pending',     -- Awaiting their action
  'approved',    -- Approved by this approver
  'rejected'     -- Rejected by this approver
);

-- Type of approval workflow
CREATE TYPE approval_type AS ENUM (
  'event',
  'modification',
  'cancellation',
  'report'
);

-- Audit log action types
CREATE TYPE action_type AS ENUM (
  'create_draft',
  'submit_for_approval',
  'approve',
  'reject',
  'request_modification',
  'approve_modification',
  'reject_modification',
  'request_cancellation',
  'approve_cancellation',
  'reject_cancellation',
  'submit_report',
  'approve_report',
  'reject_report',
  'update_event',
  'delete_draft',
  'create_user',
  'update_user',
  'deactivate_user',
  'create_venue',
  'update_venue',
  'delete_venue',
  'ban_venue'
);

-- =============================================
-- 2. TABLES
-- =============================================

-- ---------------------------------------------
-- 2.1 Users Table
-- ---------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role role NOT NULL DEFAULT 'event_planner',
  parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  city TEXT,
  region TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  notification_prefs JSONB DEFAULT '{"email_enabled": true, "frequency": "instant"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_notification_prefs CHECK (
    notification_prefs ? 'email_enabled' AND 
    notification_prefs ? 'frequency'
  )
);

-- Indexes for users
CREATE INDEX idx_users_parent_id ON users(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Comments for users table
COMMENT ON TABLE users IS 'User accounts with hierarchical organization structure';
COMMENT ON COLUMN users.parent_id IS 'Self-referencing foreign key for organizational hierarchy';
COMMENT ON COLUMN users.notification_prefs IS 'JSON object with email_enabled and frequency fields';

-- ---------------------------------------------
-- 2.2 Venues Table
-- ---------------------------------------------
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  capacity INTEGER,
  notes TEXT,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_capacity CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT unique_venue_per_creator UNIQUE (name, address, creator_id)
);

-- Indexes for venues
CREATE INDEX idx_venues_creator_id ON venues(creator_id);
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_is_active ON venues(is_active);
CREATE INDEX idx_venues_name ON venues(name);

-- Comments for venues table
COMMENT ON TABLE venues IS 'Event venues with duplicate prevention per creator';
COMMENT ON CONSTRAINT unique_venue_per_creator ON venues IS 'Prevents duplicate venues by same creator';

-- ---------------------------------------------
-- 2.3 Events Table
-- ---------------------------------------------
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  venue_id UUID REFERENCES venues(id) ON DELETE RESTRICT,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status event_status NOT NULL DEFAULT 'draft',
  expected_attendance INTEGER,
  budget DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_expected_attendance CHECK (expected_attendance IS NULL OR expected_attendance > 0),
  CONSTRAINT valid_budget CHECK (budget IS NULL OR budget >= 0),
  CONSTRAINT valid_event_date CHECK (event_date >= CURRENT_DATE OR status != 'draft')
);

-- Indexes for events
CREATE INDEX idx_events_creator_id ON events(creator_id);
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_status_date ON events(status, event_date);

-- Comments for events table
COMMENT ON TABLE events IS 'Main events table tracking full event lifecycle';
COMMENT ON COLUMN events.status IS 'Current state in event lifecycle workflow';

-- ---------------------------------------------
-- 2.4 Event Versions Table
-- ---------------------------------------------
CREATE TABLE event_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  version_data JSONB NOT NULL,
  status event_status NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_event_version UNIQUE (event_id, version_number),
  CONSTRAINT valid_version_number CHECK (version_number > 0)
);

-- Indexes for event_versions
CREATE INDEX idx_event_versions_event_id ON event_versions(event_id);
CREATE INDEX idx_event_versions_status ON event_versions(status);
CREATE INDEX idx_event_versions_created_at ON event_versions(created_at);

-- Comments for event_versions table
COMMENT ON TABLE event_versions IS 'Version history for event modifications and auditing';
COMMENT ON COLUMN event_versions.version_data IS 'Complete snapshot of event data at this version';

-- ---------------------------------------------
-- 2.5 Event Approvals Table
-- ---------------------------------------------
CREATE TABLE event_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approval_type approval_type NOT NULL DEFAULT 'event',
  status approval_status NOT NULL DEFAULT 'waiting',
  sequence_order INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_sequence_order CHECK (sequence_order > 0),
  CONSTRAINT unique_approval_in_chain UNIQUE (event_id, approval_type, sequence_order)
);

-- Indexes for event_approvals
CREATE INDEX idx_event_approvals_event_id ON event_approvals(event_id);
CREATE INDEX idx_event_approvals_approver_id ON event_approvals(approver_id);
CREATE INDEX idx_event_approvals_status ON event_approvals(status);
CREATE INDEX idx_event_approvals_type_status ON event_approvals(approval_type, status);
CREATE INDEX idx_event_approvals_pending ON event_approvals(approver_id, status) WHERE status = 'pending';

-- Comments for event_approvals table
COMMENT ON TABLE event_approvals IS 'Approval chain records for events and related workflows';
COMMENT ON COLUMN event_approvals.sequence_order IS 'Order in approval chain (1 = first approver)';
COMMENT ON COLUMN event_approvals.approval_type IS 'Type of approval: event, modification, cancellation, or report';

-- ---------------------------------------------
-- 2.6 Reports Table
-- ---------------------------------------------
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  attendance_count INTEGER NOT NULL,
  summary TEXT NOT NULL,
  feedback TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  external_links JSONB DEFAULT '[]'::jsonb,
  status approval_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_attendance_count CHECK (attendance_count >= 0),
  CONSTRAINT one_report_per_event UNIQUE (event_id)
);

-- Indexes for reports
CREATE INDEX idx_reports_event_id ON reports(event_id);
CREATE INDEX idx_reports_status ON reports(status);

-- Comments for reports table
COMMENT ON TABLE reports IS 'Post-event reports with media and attendance data';
COMMENT ON COLUMN reports.media_urls IS 'Array of media file URLs from Supabase Storage';
COMMENT ON COLUMN reports.external_links IS 'Array of external links {url, title}';

-- ---------------------------------------------
-- 2.7 Audit Logs Table
-- ---------------------------------------------
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type action_type NOT NULL,
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Note: No updated_at as audit logs are immutable
  CONSTRAINT audit_log_immutable CHECK (created_at IS NOT NULL)
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_event_id ON audit_logs(event_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_event_created ON audit_logs(event_id, created_at DESC);

-- Comments for audit_logs table
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all significant actions';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context data (old/new values, etc.)';

-- ---------------------------------------------
-- 2.8 Templates Table
-- ---------------------------------------------
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_template_name_per_user UNIQUE (user_id, name)
);

-- Indexes for templates
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_name ON templates(name);

-- Comments for templates table
COMMENT ON TABLE templates IS 'User-saved event templates for quick creation';
COMMENT ON COLUMN templates.template_data IS 'Saved event field values';

-- ---------------------------------------------
-- 2.9 Approval Configs Table
-- ---------------------------------------------
CREATE TABLE approval_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_data JSONB NOT NULL DEFAULT '{
    "event_planner": false,
    "city_curator": true,
    "regional_curator": true,
    "lead_curator": true,
    "global_director": true
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_config_structure CHECK (
    config_data ? 'event_planner' AND
    config_data ? 'city_curator' AND
    config_data ? 'regional_curator' AND
    config_data ? 'lead_curator' AND
    config_data ? 'global_director'
  )
);

-- Comments for approval_configs table
COMMENT ON TABLE approval_configs IS 'Configuration for which roles are required in approval chains';
COMMENT ON COLUMN approval_configs.config_data IS 'Boolean flags for each role indicating if they are required in approval chain';

-- =============================================
-- 3. AUTHORIZATION & SECURITY
-- =============================================

-- IMPORTANT: This application does NOT use Row Level Security (RLS)
-- All authorization and access control is handled in the backend application layer.
--
-- Reasons for backend-only authorization:
-- 1. Database portability - easier to migrate to different databases (MySQL, MongoDB, etc.)
-- 2. Testability - business logic is easier to test in application code
-- 3. Maintainability - all authorization logic in one place (no SQL + TypeScript duplication)
-- 4. Flexibility - complex business rules are easier to implement in application code
--
-- Security is enforced through:
-- - Service Layer: /lib/services/*/*.service.ts (permission checks, hierarchy validation)
-- - Permissions: /lib/permissions/* (role-based access control)
-- - Auth Middleware: /lib/auth/server.ts (user authentication)
--
-- DO NOT enable RLS on any tables in this project.
-- All queries must go through the Service Layer which enforces proper authorization.

-- =============================================
-- 4. FUNCTIONS
-- =============================================

-- ---------------------------------------------
-- 4.1 Automatic Updated At Trigger Function
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates updated_at timestamp on row updates';

-- ---------------------------------------------
-- NOTE: Complex Business Logic Moved to Backend
-- ---------------------------------------------
-- The following functions were removed and implemented in backend services:
-- 
-- 1. get_subordinate_user_ids() -> lib/services/users/hierarchy.service.ts
--    - Better testability and maintainability
--    - Easier to debug and modify
--    - Can handle complex edge cases
-- 
-- 2. build_approval_chain() -> lib/services/approvals/chain-builder.service.ts
--    - Business logic belongs in service layer
--    - Easier to add features (notifications, logging, etc.)
--    - Better separation of concerns
-- 
-- Database functions should be limited to:
-- - Simple data transformations
-- - Triggers for data integrity
-- - Performance-critical operations
-- 
-- See: .cursor/rules/business-logic-placement/RULE.md

-- =============================================
-- 5. TRIGGERS
-- =============================================

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_approvals_updated_at
  BEFORE UPDATE ON event_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_configs_updated_at
  BEFORE UPDATE ON approval_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. INITIAL DATA
-- =============================================

-- Insert default approval config
INSERT INTO approval_configs (config_data) VALUES (
  '{
    "event_planner": false,
    "city_curator": true,
    "regional_curator": true,
    "lead_curator": true,
    "global_director": true
  }'::jsonb
);

-- =============================================
-- 7. GRANTS (if needed for service role)
-- =============================================

-- Grant necessary permissions to authenticated users
-- (Specific permissions controlled by backend Service Layer)

-- =============================================
-- END OF MIGRATION
-- =============================================
