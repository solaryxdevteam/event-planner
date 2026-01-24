/**
 * Migration: Update Users Location Fields
 *
 * Changes:
 * 1. Add country_id column (UUID, references locations.id)
 * 2. Rename region column to state_id (UUID, references locations.id)
 * 3. Change city column from TEXT to city_id (UUID, references locations.id)
 * 4. Set default country_id to US (United States)
 * 5. Update existing users to have US as default country
 */

-- =============================================
-- 1. GET US COUNTRY ID
-- =============================================

DO $$
DECLARE
  usa_country_id UUID;
BEGIN
  -- Get the US country ID from locations table
  SELECT id INTO usa_country_id 
  FROM locations 
  WHERE type = 'country' AND code = 'US' 
  LIMIT 1;
  
  IF usa_country_id IS NULL THEN
    RAISE EXCEPTION 'US country not found in locations table. Please seed locations first.';
  END IF;

  -- =============================================
  -- 2. ADD COUNTRY_ID COLUMN
  -- =============================================
  
  -- Add country_id column with foreign key constraint
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES locations(id) ON DELETE SET NULL;
  
  -- Set default to US for all existing users
  UPDATE users 
  SET country_id = usa_country_id 
  WHERE country_id IS NULL;
  
  -- Make country_id NOT NULL with default
  ALTER TABLE users
  ALTER COLUMN country_id SET DEFAULT usa_country_id,
  ALTER COLUMN country_id SET NOT NULL;
  
  -- Create index for country_id
  CREATE INDEX IF NOT EXISTS idx_users_country_id ON users(country_id);
  
  COMMENT ON COLUMN users.country_id IS 'Country ID from locations table (default: US)';

  -- =============================================
  -- 3. RENAME REGION TO STATE_ID
  -- =============================================
  
  -- First, drop the old column if it exists (we'll recreate it as UUID)
  ALTER TABLE users
  DROP COLUMN IF EXISTS region;
  
  -- Add state_id column as UUID with foreign key
  ALTER TABLE users
  ADD COLUMN state_id UUID REFERENCES locations(id) ON DELETE SET NULL;
  
  -- Create index for state_id
  CREATE INDEX IF NOT EXISTS idx_users_state_id ON users(state_id);
  
  COMMENT ON COLUMN users.state_id IS 'State ID from locations table (renamed from region)';

  -- =============================================
  -- 4. CHANGE CITY TO CITY_ID
  -- =============================================
  
  -- Drop the old city TEXT column
  ALTER TABLE users
  DROP COLUMN IF EXISTS city;
  
  -- Add city_id column as UUID with foreign key
  ALTER TABLE users
  ADD COLUMN city_id UUID REFERENCES locations(id) ON DELETE SET NULL;
  
  -- Create index for city_id
  CREATE INDEX IF NOT EXISTS idx_users_city_id ON users(city_id);
  
  COMMENT ON COLUMN users.city_id IS 'City ID from locations table (changed from city TEXT)';

END $$;

-- =============================================
-- END OF MIGRATION
-- =============================================
