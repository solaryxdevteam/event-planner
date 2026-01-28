-- =============================================
-- Migration 012: Remove event_date and budget fields
-- =============================================
-- Description: Removes legacy event_date, event_time, and budget fields
--              as they are replaced by starts_at/ends_at and budget_amount/budget_currency
-- Date: 2026-01-XX
-- =============================================

-- Drop indexes that depend on event_date
DROP INDEX IF EXISTS idx_events_event_date;
DROP INDEX IF EXISTS idx_events_status_date;

-- Drop constraints that reference event_date
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS valid_event_date;

-- Drop constraints that reference budget
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS valid_budget;

-- Remove the columns
ALTER TABLE events
  DROP COLUMN IF EXISTS event_date,
  DROP COLUMN IF EXISTS event_time,
  DROP COLUMN IF EXISTS budget,
  DROP COLUMN IF EXISTS budget_amount,
  DROP COLUMN IF EXISTS budget_currency;

-- Drop constraint for budget_amount if it exists
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS valid_budget_amount;

-- Drop indexes for budget if they exist
DROP INDEX IF EXISTS idx_events_budget_amount;

-- Comments
COMMENT ON COLUMN events.starts_at IS 'Event start date and time (required)';
COMMENT ON COLUMN events.ends_at IS 'Event end date and time (optional)';
