/**
 * Migration: Add notification_prefs to users if missing
 *
 * Fixes: "Could not find the 'notification_prefs' column of 'users' in the schema cache"
 * Use when the users table was created without this column (e.g. different initial schema).
 * Idempotent: safe to run even if the column already exists.
 */

-- Add notification_prefs column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'notification_prefs'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN notification_prefs JSONB DEFAULT '{"email_enabled": true, "frequency": "instant"}'::jsonb;

    COMMENT ON COLUMN public.users.notification_prefs IS 'JSON object: email_enabled, frequency, event_approved, event_rejected, report_due, reports_pending_approval';
  END IF;
END $$;

-- Add check constraint if it does not exist (required keys for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'valid_notification_prefs'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT valid_notification_prefs CHECK (
      notification_prefs ? 'email_enabled' AND
      notification_prefs ? 'frequency'
    );
  END IF;
END $$;
