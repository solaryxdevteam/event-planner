/**
 * Migration: Invitation-Based Authentication Schema
 *
 * Changes:
 * 1. Create user_status enum (pending, active, inactive)
 * 2. Add phone, company, and status columns to users table
 * 3. Create invitations table for invitation-based registration
 * 4. Migrate existing users to status='active'
 */

-- =============================================
-- 1. CREATE USER_STATUS ENUM
-- =============================================

DO $$
BEGIN
  -- Create enum type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'inactive');
  END IF;
END $$;

COMMENT ON TYPE user_status IS 'User account status: pending (awaiting activation), active (can log in), inactive (deactivated)';

-- =============================================
-- 2. ADD COLUMNS TO USERS TABLE
-- =============================================

-- Add phone column (optional, validated format)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add validation constraint for phone (E.164 format: optional +, then 1-15 digits)
ALTER TABLE users
DROP CONSTRAINT IF EXISTS valid_phone;

ALTER TABLE users
ADD CONSTRAINT valid_phone CHECK (
  phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$'
);

-- Add company column (optional)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS company TEXT;

-- Add status column (user_status enum, default 'pending' for new users)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status user_status;

-- Set all existing users to 'active' status
UPDATE users
SET status = 'active'::user_status
WHERE status IS NULL;

-- Set default to 'pending' for new users
ALTER TABLE users
ALTER COLUMN status SET DEFAULT 'pending'::user_status;

-- Make status NOT NULL
ALTER TABLE users
ALTER COLUMN status SET NOT NULL;

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Comments
COMMENT ON COLUMN users.phone IS 'User phone number in E.164 format (optional)';
COMMENT ON COLUMN users.company IS 'User company name (optional)';
COMMENT ON COLUMN users.status IS 'User account status: pending (awaiting activation), active (can log in), inactive (deactivated)';

-- =============================================
-- 3. CREATE INVITATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS invitations (
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

-- Indexes for invitations
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_country_id ON invitations(country_id);
CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON invitations(created_by);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_used_at ON invitations(used_at) WHERE used_at IS NULL;

-- Comments
COMMENT ON TABLE invitations IS 'Invitation links for user registration (country-bound, single-use, time-limited)';
COMMENT ON COLUMN invitations.token IS 'Unique invitation token (cryptographically secure random string)';
COMMENT ON COLUMN invitations.email IS 'Email address of the invited user';
COMMENT ON COLUMN invitations.country_id IS 'Country ID from locations table (REQUIRED - must be assigned before creating invitation)';
COMMENT ON COLUMN invitations.created_by IS 'User ID of Global Director who created the invitation';
COMMENT ON COLUMN invitations.expires_at IS 'Expiration timestamp for the invitation';
COMMENT ON COLUMN invitations.used_at IS 'Timestamp when invitation was used (NULL if unused)';

-- =============================================
-- END OF MIGRATION
-- =============================================
