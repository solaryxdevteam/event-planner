-- =============================================
-- Migration 011: Add datetime and budget fields to events table
-- =============================================
-- Description: Adds starts_at, ends_at, budget_amount, and budget_currency
--              fields to support more detailed event scheduling and budgeting
-- Date: 2026-01-XX
-- =============================================

-- Add new timestamp fields for event start and end times
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- Add new budget fields (replacing/supplementing existing budget field)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS budget_currency VARCHAR(3) DEFAULT 'USD';


-- Add constraint for budget_amount
ALTER TABLE events
  ADD CONSTRAINT valid_budget_amount CHECK (
    budget_amount IS NULL OR budget_amount >= 0
  );

-- Add indexes for the new timestamp fields
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_ends_at ON events(ends_at);
CREATE INDEX IF NOT EXISTS idx_events_starts_at_status ON events(starts_at, status);

-- Comments
COMMENT ON COLUMN events.starts_at IS 'Event start date and time (replaces event_date + event_time)';
COMMENT ON COLUMN events.ends_at IS 'Event end date and time';
COMMENT ON COLUMN events.budget_amount IS 'Event budget amount (replaces/supplements budget field)';
COMMENT ON COLUMN events.budget_currency IS 'Currency code for budget (ISO 4217, e.g., USD, EUR)';
