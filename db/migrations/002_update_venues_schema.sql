/**
 * Migration: Update Venues Schema
 *
 * Adds geographic location fields to venues table:
 * - country (VARCHAR)
 * - region (VARCHAR) - state/province
 * - location_lat (DECIMAL) - latitude from Google Maps
 * - location_lng (DECIMAL) - longitude from Google Maps
 *
 * Note: 'city' column already exists in the original schema
 */

-- Add new columns to venues table
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'United States',
ADD COLUMN IF NOT EXISTS region VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8);

-- Add check constraints for location coordinates
ALTER TABLE venues
ADD CONSTRAINT valid_location_lat CHECK (location_lat IS NULL OR (location_lat BETWEEN -90 AND 90)),
ADD CONSTRAINT valid_location_lng CHECK (location_lng IS NULL OR (location_lng BETWEEN -180 AND 180));

-- Create indexes for location queries
CREATE INDEX IF NOT EXISTS idx_venues_country ON venues(country);
CREATE INDEX IF NOT EXISTS idx_venues_region ON venues(region);
CREATE INDEX IF NOT EXISTS idx_venues_location_coords ON venues(location_lat, location_lng) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN venues.country IS 'Country where venue is located (default: United States)';
COMMENT ON COLUMN venues.region IS 'Region/state/province where venue is located';
COMMENT ON COLUMN venues.location_lat IS 'Latitude coordinate from Google Maps (between -90 and 90)';
COMMENT ON COLUMN venues.location_lng IS 'Longitude coordinate from Google Maps (between -180 and 180)';

-- Update existing venues to have default country if NULL
UPDATE venues SET country = 'United States' WHERE country IS NULL;
