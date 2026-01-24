/**
 * Migration: Create Locations Table
 *
 * Creates a hierarchical locations table for countries, states, and cities.
 * Default country is USA.
 */

-- =============================================
-- 1. LOCATIONS TABLE
-- =============================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('country', 'state', 'city')),
  parent_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  code TEXT, -- ISO country code, state abbreviation, or city code
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_location_name_per_parent UNIQUE (name, parent_id, type),
  CONSTRAINT valid_hierarchy CHECK (
    (type = 'country' AND parent_id IS NULL) OR
    (type = 'state' AND parent_id IS NOT NULL) OR
    (type = 'city' AND parent_id IS NOT NULL)
  )
);

-- Indexes for locations
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_parent_id ON locations(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_locations_code ON locations(code) WHERE code IS NOT NULL;
CREATE INDEX idx_locations_is_active ON locations(is_active);
CREATE INDEX idx_locations_name ON locations(name);

-- Comments for locations table
COMMENT ON TABLE locations IS 'Hierarchical locations table: countries, states, and cities';
COMMENT ON COLUMN locations.type IS 'Type of location: country, state, or city';
COMMENT ON COLUMN locations.parent_id IS 'Parent location (states belong to countries, cities belong to states)';
COMMENT ON COLUMN locations.code IS 'ISO country code, state abbreviation, or city code';

-- =============================================
-- 2. TRIGGERS
-- =============================================

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 3. INITIAL DATA - USA
-- =============================================

-- Insert USA as default country
INSERT INTO locations (name, type, code, is_active) VALUES
  ('United States', 'country', 'US', true)
ON CONFLICT DO NOTHING;

-- Get USA ID for states
DO $$
DECLARE
  usa_id UUID;
BEGIN
  SELECT id INTO usa_id FROM locations WHERE type = 'country' AND code = 'US' LIMIT 1;
  
  -- Insert common US states (you can expand this list)
  INSERT INTO locations (name, type, parent_id, code, is_active) VALUES
    ('California', 'state', usa_id, 'CA', true),
    ('New York', 'state', usa_id, 'NY', true),
    ('Texas', 'state', usa_id, 'TX', true),
    ('Florida', 'state', usa_id, 'FL', true),
    ('Illinois', 'state', usa_id, 'IL', true),
    ('Pennsylvania', 'state', usa_id, 'PA', true),
    ('Ohio', 'state', usa_id, 'OH', true),
    ('Georgia', 'state', usa_id, 'GA', true),
    ('North Carolina', 'state', usa_id, 'NC', true),
    ('Michigan', 'state', usa_id, 'MI', true)
  ON CONFLICT DO NOTHING;
END $$;

-- =============================================
-- END OF MIGRATION
-- =============================================
