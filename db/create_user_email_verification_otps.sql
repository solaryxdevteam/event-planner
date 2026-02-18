-- Create user_email_verification_otps table if it does not exist.
-- Run this in Supabase Dashboard > SQL Editor if you see:
-- "Could not find the table 'public.user_email_verification_otps' in the schema cache"

CREATE TABLE IF NOT EXISTS user_email_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_email_verification_otps_user_id ON user_email_verification_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_verification_otps_email ON user_email_verification_otps(email);
CREATE INDEX IF NOT EXISTS idx_user_email_verification_otps_expires_at ON user_email_verification_otps(expires_at);
