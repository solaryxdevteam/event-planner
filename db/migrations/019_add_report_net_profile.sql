-- Add net_profile to reports table (numeric, nullable for existing rows)
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS net_profile NUMERIC(14, 2) DEFAULT NULL;

COMMENT ON COLUMN reports.net_profile IS 'Net profit/fee for the event report';
