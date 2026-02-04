-- Migration: Allow multiple reports per event, but only one approved report per event
-- 
-- This migration:
-- 1. Removes the unique constraint on event_id
-- 2. Adds a partial unique index to ensure only one approved report per event

-- Step 1: Drop the existing unique constraint
ALTER TABLE reports DROP CONSTRAINT IF EXISTS one_report_per_event;

-- Step 2: Drop the index if it already exists (in case migration was partially applied)
DROP INDEX IF EXISTS idx_reports_one_approved_per_event;

-- Step 3: Create a partial unique index to ensure only one approved report per event
-- This allows multiple reports per event, but only one can be approved at a time
CREATE UNIQUE INDEX idx_reports_one_approved_per_event 
ON reports(event_id) 
WHERE status = 'approved';

-- Add comment
COMMENT ON INDEX idx_reports_one_approved_per_event IS 'Ensures only one approved report per event, but allows multiple reports (pending/rejected)';
