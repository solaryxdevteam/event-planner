-- =============================================
-- Event Management Platform - Initial Schema
-- =============================================
-- Description: Complete database schema (consolidated from all migrations).
--              Use this for fresh installs. Replace migrations with this file.
-- =============================================

-- =============================================
-- 1. ENUMS
-- =============================================

CREATE TYPE role AS ENUM (
  'event_planner',
  'city_curator',
  'regional_curator',
  'lead_curator',
  'global_director',
  'marketing_manager'
);

CREATE TYPE event_status AS ENUM (
  'draft',
  'in_review',
  'rejected',
  'approved_scheduled',
  'completed_awaiting_report',
  'completed_archived',
  'cancelled'
);

CREATE TYPE approval_status AS ENUM (
  'waiting',
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE approval_type AS ENUM (
  'event',
  'modification',
  'cancellation',
  'report',
  'marketing_report'
);

CREATE TYPE action_type AS ENUM (
  'create_draft',
  'create_event_as_approved',
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
  'ban_venue',
  'approve_venue',
  'reject_venue'
);

CREATE TYPE user_status AS ENUM (
  'pending',
  'active',
  'inactive'
);

-- =============================================
-- 2. FUNCTIONS (for triggers)
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. TABLES
-- =============================================

-- ---------------------------------------------
-- 3.1 Locations
-- ---------------------------------------------
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('country', 'state', 'city')),
  parent_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_location_name_per_parent UNIQUE (name, parent_id, type),
  CONSTRAINT valid_hierarchy CHECK (
    (type = 'country' AND parent_id IS NULL) OR
    (type = 'state' AND parent_id IS NOT NULL) OR
    (type = 'city' AND parent_id IS NOT NULL)
  )
);

CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_parent_id ON locations(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_locations_code ON locations(code) WHERE code IS NOT NULL;
CREATE INDEX idx_locations_is_active ON locations(is_active);
CREATE INDEX idx_locations_name ON locations(name);

-- ---------------------------------------------
-- 3.2 Users
-- ---------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  role role NOT NULL DEFAULT 'event_planner',
  parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  country_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  city_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  city TEXT,
  phone TEXT,
  status user_status NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  notification_prefs JSONB DEFAULT '{"email_enabled": true, "frequency": "instant"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$'),
  CONSTRAINT valid_notification_prefs CHECK (
    notification_prefs ? 'email_enabled' AND notification_prefs ? 'frequency'
  )
);

CREATE INDEX idx_users_parent_id ON users(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_country_id ON users(country_id);
CREATE INDEX idx_users_city_id ON users(city_id);
CREATE INDEX idx_users_city_text ON users(city);
CREATE INDEX idx_users_first_name ON users(first_name);
CREATE INDEX idx_users_last_name ON users(last_name) WHERE last_name IS NOT NULL;

-- ---------------------------------------------
-- 3.3 Invitations
-- ---------------------------------------------
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  country_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_country_id ON invitations(country_id);
CREATE INDEX idx_invitations_created_by ON invitations(created_by);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX idx_invitations_used_at ON invitations(used_at) WHERE used_at IS NULL;

-- ---------------------------------------------
-- 3.4 Venues
-- ---------------------------------------------
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  street TEXT,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'United States',
  country_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  total_capacity INTEGER,
  number_of_tables INTEGER,
  ticket_capacity INTEGER,
  floor_plans JSONB DEFAULT '[]'::jsonb,
  contact_person_name TEXT,
  contact_email TEXT,
  contact_email_verified BOOLEAN NOT NULL DEFAULT false,
  sounds TEXT,
  lights TEXT,
  screens TEXT,
  media JSONB DEFAULT '[]'::jsonb,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_location_lat CHECK (location_lat IS NULL OR (location_lat BETWEEN -90 AND 90)),
  CONSTRAINT valid_location_lng CHECK (location_lng IS NULL OR (location_lng BETWEEN -180 AND 180)),
  CONSTRAINT valid_total_capacity CHECK (total_capacity IS NULL OR total_capacity >= 0),
  CONSTRAINT valid_number_of_tables CHECK (number_of_tables IS NULL OR number_of_tables >= 0),
  CONSTRAINT valid_ticket_capacity CHECK (ticket_capacity IS NULL OR ticket_capacity >= 0),
  CONSTRAINT valid_contact_email CHECK (
    contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  CONSTRAINT unique_venue_per_creator UNIQUE (name, street, city, creator_id)
);

CREATE UNIQUE INDEX idx_venues_short_id ON venues(short_id);
CREATE INDEX idx_venues_creator_id ON venues(creator_id);
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_is_active ON venues(is_active);
CREATE INDEX idx_venues_name ON venues(name);
CREATE INDEX idx_venues_country ON venues(country);
CREATE INDEX idx_venues_country_id ON venues(country_id) WHERE country_id IS NOT NULL;
CREATE INDEX idx_venues_location_coords ON venues(location_lat, location_lng) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;
CREATE INDEX idx_venues_contact_email ON venues(contact_email) WHERE contact_email IS NOT NULL;
CREATE INDEX idx_venues_deleted_at ON venues(deleted_at) WHERE deleted_at IS NULL;

-- ---------------------------------------------
-- 3.5 DJs
-- ---------------------------------------------
CREATE TABLE djs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL,
  name TEXT NOT NULL,
  picture_url TEXT,
  music_style TEXT,
  price DECIMAL(12, 2),
  email TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  technical_rider JSONB NOT NULL DEFAULT '[]',
  hospitality_rider JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_dj_price CHECK (price IS NULL OR price >= 0),
  CONSTRAINT valid_dj_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE UNIQUE INDEX idx_djs_short_id ON djs(short_id);
CREATE INDEX idx_djs_email ON djs(email);
CREATE INDEX idx_djs_is_active ON djs(is_active);
CREATE INDEX idx_djs_deleted_at ON djs(deleted_at);
CREATE INDEX idx_djs_name ON djs(name);

-- ---------------------------------------------
-- 3.6 Events
-- ---------------------------------------------
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  venue_id UUID REFERENCES venues(id) ON DELETE RESTRICT,
  dj_id UUID REFERENCES djs(id) ON DELETE SET NULL,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status event_status NOT NULL DEFAULT 'draft',
  expected_attendance INTEGER,
  minimum_ticket_price DECIMAL(10, 2),
  minimum_table_price DECIMAL(10, 2),
  notes TEXT,
  proposed_ticket_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_table_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_expected_attendance CHECK (expected_attendance IS NULL OR expected_attendance > 0),
  CONSTRAINT valid_minimum_ticket_price CHECK (minimum_ticket_price IS NULL OR minimum_ticket_price >= 0),
  CONSTRAINT valid_minimum_table_price CHECK (minimum_table_price IS NULL OR minimum_table_price >= 0),
  CONSTRAINT unique_events_short_id UNIQUE (short_id)
);

CREATE INDEX idx_events_creator_id ON events(creator_id);
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_dj_id ON events(dj_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_starts_at ON events(starts_at);
CREATE INDEX idx_events_starts_at_status ON events(starts_at, status);

-- ---------------------------------------------
-- 3.7 Event Versions
-- ---------------------------------------------
CREATE TABLE event_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  version_data JSONB NOT NULL,
  status event_status NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_event_version UNIQUE (event_id, version_number),
  CONSTRAINT valid_version_number CHECK (version_number > 0)
);

CREATE INDEX idx_event_versions_event_id ON event_versions(event_id);
CREATE INDEX idx_event_versions_status ON event_versions(status);
CREATE INDEX idx_event_versions_created_at ON event_versions(created_at);

-- ---------------------------------------------
-- 3.8 Event Approvals
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
  CONSTRAINT valid_sequence_order CHECK (sequence_order > 0),
  CONSTRAINT unique_approval_in_chain UNIQUE (event_id, approval_type, sequence_order)
);

CREATE INDEX idx_event_approvals_event_id ON event_approvals(event_id);
CREATE INDEX idx_event_approvals_approver_id ON event_approvals(approver_id);
CREATE INDEX idx_event_approvals_status ON event_approvals(status);
CREATE INDEX idx_event_approvals_type_status ON event_approvals(approval_type, status);
CREATE INDEX idx_event_approvals_pending ON event_approvals(approver_id, status) WHERE status = 'pending';

-- ---------------------------------------------
-- 3.9 Venue Approvals
-- ---------------------------------------------
CREATE TABLE venue_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status approval_status NOT NULL DEFAULT 'waiting',
  sequence_order INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_venue_sequence_order CHECK (sequence_order > 0),
  CONSTRAINT unique_venue_approval_in_chain UNIQUE (venue_id, sequence_order)
);

CREATE INDEX idx_venue_approvals_venue_id ON venue_approvals(venue_id);
CREATE INDEX idx_venue_approvals_approver_id ON venue_approvals(approver_id);
CREATE INDEX idx_venue_approvals_status ON venue_approvals(status);
CREATE INDEX idx_venue_approvals_pending ON venue_approvals(approver_id, status) WHERE status = 'pending';

-- ---------------------------------------------
-- 3.10 Reports
-- ---------------------------------------------
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  attendance_count INTEGER NOT NULL,
  feedback TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  external_links JSONB DEFAULT '[]'::jsonb,
  total_ticket_sales NUMERIC(14, 2),
  total_bar_sales NUMERIC(14, 2),
  total_table_sales NUMERIC(14, 2),
  reels_urls JSONB DEFAULT '[]'::jsonb,
  pos_report_attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  detailed_report TEXT,
  incidents TEXT,
  status approval_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_attendance_count CHECK (attendance_count >= 0)
);

CREATE INDEX idx_reports_event_id ON reports(event_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE UNIQUE INDEX idx_reports_one_approved_per_event ON reports(event_id) WHERE status = 'approved';

-- ---------------------------------------------
-- 3.11 Marketing Reports
-- ---------------------------------------------
CREATE TABLE marketing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status approval_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  marketing_flyers JSONB NOT NULL DEFAULT '[]'::jsonb,
  marketing_videos JSONB NOT NULL DEFAULT '[]'::jsonb,
  marketing_strategy_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  marketing_budget NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketing_reports_event_id ON marketing_reports(event_id);
CREATE INDEX idx_marketing_reports_status ON marketing_reports(status);

-- ---------------------------------------------
-- 3.12 Audit Logs
-- ---------------------------------------------
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type action_type NOT NULL,
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_event_id ON audit_logs(event_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_event_created ON audit_logs(event_id, created_at DESC);

-- ---------------------------------------------
-- 3.13 Templates
-- ---------------------------------------------
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_template_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_name ON templates(name);

-- ---------------------------------------------
-- 3.14 Approval Configs
-- ---------------------------------------------
CREATE TABLE approval_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_data JSONB NOT NULL DEFAULT '{
    "event_planner": false,
    "city_curator": true,
    "regional_curator": true,
    "lead_curator": true,
    "global_director": true,
    "marketing_manager": false
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_config_structure CHECK (
    config_data ? 'event_planner' AND
    config_data ? 'city_curator' AND
    config_data ? 'regional_curator' AND
    config_data ? 'lead_curator' AND
    config_data ? 'global_director'
  )
);

-- ---------------------------------------------
-- 3.15 Venue Contact Verifications
-- ---------------------------------------------
CREATE TABLE venue_contact_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,
  otp_hash TEXT NOT NULL,
  otp_expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venue_contact_verifications_venue_id ON venue_contact_verifications(venue_id);
CREATE INDEX idx_venue_contact_verifications_token ON venue_contact_verifications(token) WHERE verified_at IS NULL;

-- ---------------------------------------------
-- 3.15b DJ Contact Verifications
-- ---------------------------------------------
CREATE TABLE dj_contact_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES djs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,
  otp_hash TEXT NOT NULL,
  otp_expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dj_contact_verifications_dj_id ON dj_contact_verifications(dj_id);
CREATE INDEX idx_dj_contact_verifications_token ON dj_contact_verifications(token) WHERE verified_at IS NULL;

-- ---------------------------------------------
-- 3.16 Verification OTPs
-- ---------------------------------------------
CREATE TABLE verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  context_type TEXT NOT NULL,
  context_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'create', 'change')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  one_time_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_otps_user_context ON verification_otps(user_id, context_type, context_id, action);
CREATE INDEX idx_verification_otps_one_time_token ON verification_otps(one_time_token) WHERE one_time_token IS NOT NULL;
CREATE INDEX idx_verification_otps_expires_at ON verification_otps(expires_at);

-- ---------------------------------------------
-- 3.17 User Email Verification OTPs
-- ---------------------------------------------
CREATE TABLE user_email_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_email_verification_otps_user_id ON user_email_verification_otps(user_id);
CREATE INDEX idx_user_email_verification_otps_email ON user_email_verification_otps(email);
CREATE INDEX idx_user_email_verification_otps_expires_at ON user_email_verification_otps(expires_at);

-- =============================================
-- 4. TRIGGERS
-- =============================================

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_djs_updated_at
  BEFORE UPDATE ON djs
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

CREATE TRIGGER update_venue_approvals_updated_at
  BEFORE UPDATE ON venue_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_reports_updated_at
  BEFORE UPDATE ON marketing_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_configs_updated_at
  BEFORE UPDATE ON approval_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. INITIAL DATA
-- =============================================

-- Default approval config
INSERT INTO approval_configs (config_data) VALUES (
  '{
    "event_planner": false,
    "city_curator": true,
    "regional_curator": true,
    "lead_curator": true,
    "global_director": true,
    "marketing_manager": false
  }'::jsonb
);

-- USA and states (for locations)
INSERT INTO locations (name, type, code, is_active) VALUES
  ('United States', 'country', 'US', true)
ON CONFLICT (name, parent_id, type) DO NOTHING;

DO $$
DECLARE
  usa_id UUID;
BEGIN
  SELECT id INTO usa_id FROM locations WHERE type = 'country' AND code = 'US' LIMIT 1;
  IF usa_id IS NOT NULL THEN
    INSERT INTO locations (name, type, parent_id, code, is_active) VALUES
      ('California', 'state', usa_id, 'CA', true),
      ('New York', 'state', usa_id, 'NY', true),
      ('Texas', 'state', usa_id, 'TX', true),
      ('Florida', 'state', usa_id, 'FL', true),
      ('Illinois', 'state', usa_id, 'IL', true),
      ('Pennsylvania', 'state', usa_id, 'PA', true),
      ('Ohio', 'state', usa_id, 'OH', true),
      ('Georgia', 'state', usa_id, 'GA', true),
      ('North Carolina', 'state', usa_id, 'NC', true),
      ('Michigan', 'state', usa_id, 'MI', true)
    ON CONFLICT (name, parent_id, type) DO NOTHING;
  END IF;
END $$;

-- =============================================
-- 6. STORAGE (Supabase)
-- =============================================
-- Run after schema if using Supabase Storage for reports media.
-- Enable RLS on storage.objects and create policies for bucket 'reports'.
--
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Authenticated users can upload report media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reports' AND auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated users can read report media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'reports' AND auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated users can update report media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'reports' AND auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated users can delete report media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'reports' AND auth.role() = 'authenticated');
-- =============================================
