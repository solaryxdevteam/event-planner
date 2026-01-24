/**
 * Migration: Venue Management Schema Update
 *
 * Removes existing venues and updates schema with comprehensive venue management fields:
 * 
 * Step 1: Basic Info
 * - name, address (street), city, state (from user), country (from user), location_lat, location_lng
 * 
 * Step 2: Capacity & Features
 * - capacity_standing, capacity_seated, available_rooms_halls, technical_specs (JSONB), 
 *   availability_start_date, availability_end_date, base_pricing (DECIMAL)
 * 
 * Step 3: Contact & Media
 * - contact_person_name, contact_email, contact_phone, restrictions (TEXT), images (JSONB array)
 */

-- Remove all existing venues
DELETE FROM venues;

-- Drop old columns that are being replaced
ALTER TABLE venues
DROP COLUMN IF EXISTS capacity,
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS region;

-- Add Step 1 fields (address is already there, we'll keep it for street address)
-- Add street field for detailed address
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'United States';

-- Update address to be street if it exists
UPDATE venues SET street = address WHERE address IS NOT NULL;

-- Add Step 2 fields
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS capacity_standing INTEGER,
ADD COLUMN IF NOT EXISTS capacity_seated INTEGER,
ADD COLUMN IF NOT EXISTS available_rooms_halls TEXT,
ADD COLUMN IF NOT EXISTS technical_specs JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS availability_start_date DATE,
ADD COLUMN IF NOT EXISTS availability_end_date DATE,
ADD COLUMN IF NOT EXISTS base_pricing DECIMAL(12, 2);

-- Add Step 3 fields
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS restrictions TEXT,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Add constraints
ALTER TABLE venues
ADD CONSTRAINT valid_capacity_standing CHECK (capacity_standing IS NULL OR capacity_standing > 0),
ADD CONSTRAINT valid_capacity_seated CHECK (capacity_seated IS NULL OR capacity_seated > 0),
ADD CONSTRAINT valid_base_pricing CHECK (base_pricing IS NULL OR base_pricing >= 0),
ADD CONSTRAINT valid_availability_dates CHECK (
  availability_start_date IS NULL OR 
  availability_end_date IS NULL OR 
  availability_start_date <= availability_end_date
),
ADD CONSTRAINT valid_contact_email CHECK (
  contact_email IS NULL OR 
  contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Update unique constraint to use street instead of address
ALTER TABLE venues
DROP CONSTRAINT IF EXISTS unique_venue_per_creator;

ALTER TABLE venues
ADD CONSTRAINT unique_venue_per_creator UNIQUE (name, street, city, creator_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_venues_state ON venues(state);
CREATE INDEX IF NOT EXISTS idx_venues_country_new ON venues(country);
CREATE INDEX IF NOT EXISTS idx_venues_availability_dates ON venues(availability_start_date, availability_end_date);
CREATE INDEX IF NOT EXISTS idx_venues_contact_email ON venues(contact_email) WHERE contact_email IS NOT NULL;

-- Add comments
COMMENT ON COLUMN venues.street IS 'Street address of the venue';
COMMENT ON COLUMN venues.state IS 'State/Province (pre-filled from user info)';
COMMENT ON COLUMN venues.country IS 'Country (pre-filled from user info)';
COMMENT ON COLUMN venues.capacity_standing IS 'Maximum standing capacity';
COMMENT ON COLUMN venues.capacity_seated IS 'Maximum seated capacity';
COMMENT ON COLUMN venues.available_rooms_halls IS 'Available rooms and halls description';
COMMENT ON COLUMN venues.technical_specs IS 'JSON object with sound, lights, screens specifications';
COMMENT ON COLUMN venues.availability_start_date IS 'Start date of availability range';
COMMENT ON COLUMN venues.availability_end_date IS 'End date of availability range (max 1 year from start)';
COMMENT ON COLUMN venues.base_pricing IS 'Base pricing (optional, internal use)';
COMMENT ON COLUMN venues.contact_person_name IS 'Full name of venue contact person';
COMMENT ON COLUMN venues.contact_email IS 'Email address of venue contact';
COMMENT ON COLUMN venues.contact_phone IS 'Phone number of venue contact';
COMMENT ON COLUMN venues.restrictions IS 'Noise, time, catering rules and restrictions';
COMMENT ON COLUMN venues.images IS 'JSON array of image URLs (1-5 images)';
