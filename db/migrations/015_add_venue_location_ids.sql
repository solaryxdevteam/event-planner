/**
 * Migration: Add Location IDs to Venues
 *
 * Changes:
 * 1. Add country_id column (UUID, references locations.id)
 * 2. Add state_id column (UUID, references locations.id)
 * 3. Migrate existing data (match country/state strings to locations)
 * 4. Create indexes for performance
 *
 * Note: country and state string columns are kept for backward compatibility
 */

-- =============================================
-- 1. ADD NEW COLUMNS
-- =============================================

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- =============================================
-- 2. MIGRATE EXISTING COUNTRY DATA
-- =============================================

-- Match country names to locations (case-insensitive)
UPDATE venues v
SET country_id = (
  SELECT id FROM locations l
  WHERE l.type = 'country' 
    AND LOWER(TRIM(l.name)) = LOWER(TRIM(v.country))
    AND l.is_active = true
  LIMIT 1
)
WHERE v.country_id IS NULL AND v.country IS NOT NULL;

-- Set default to US if no match found
UPDATE venues v
SET country_id = (
  SELECT id FROM locations l
  WHERE l.type = 'country' AND l.code = 'US' AND l.is_active = true
  LIMIT 1
)
WHERE v.country_id IS NULL;

-- =============================================
-- 3. MIGRATE EXISTING STATE DATA
-- =============================================

-- Match state names to locations within the country
UPDATE venues v
SET state_id = (
  SELECT l.id FROM locations l
  WHERE l.type = 'state'
    AND l.parent_id = v.country_id
    AND LOWER(TRIM(l.name)) = LOWER(TRIM(v.state))
    AND l.is_active = true
  LIMIT 1
)
WHERE v.state_id IS NULL 
  AND v.state IS NOT NULL 
  AND v.country_id IS NOT NULL;

-- =============================================
-- 4. CREATE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_venues_country_id ON venues(country_id) WHERE country_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_venues_state_id ON venues(state_id) WHERE state_id IS NOT NULL;

-- =============================================
-- 5. ADD COMMENTS
-- =============================================

COMMENT ON COLUMN venues.country_id IS 'Country ID from locations table (references locations.id where type=country)';
COMMENT ON COLUMN venues.state_id IS 'State ID from locations table (references locations.id where type=state, optional)';

-- =============================================
-- 6. VERIFICATION QUERY (for manual check)
-- =============================================

-- Uncomment to verify migration:
-- SELECT 
--   COUNT(*) as total_venues,
--   COUNT(country_id) as venues_with_country_id,
--   COUNT(state_id) as venues_with_state_id
-- FROM venues;
