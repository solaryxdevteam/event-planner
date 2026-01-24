/**
 * Migration: Add short_id to venues table
 * 
 * Adds a unique short_id column to venues table for URL-friendly identifiers
 * Format: venue-XXXXX (where XXXXX is a random alphanumeric string)
 */

-- Add short_id column
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS short_id TEXT;

-- Create unique index on short_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_short_id ON venues(short_id) WHERE short_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN venues.short_id IS 'Unique short identifier for URL (format: venue-XXXXX)';
