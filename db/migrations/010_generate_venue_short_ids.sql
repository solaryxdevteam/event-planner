/**
 * Migration: Generate short_id for existing venues
 * 
 * Generates unique short_id for all existing venues that don't have one
 */

-- Function to generate short_id
CREATE OR REPLACE FUNCTION generate_venue_short_id() RETURNS TEXT AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result TEXT := 'venue-';
  i INTEGER;
  char_index INTEGER;
BEGIN
  -- Generate 7 random characters
  FOR i IN 1..7 LOOP
    char_index := floor(random() * length(chars) + 1)::INTEGER;
    result := result || substr(chars, char_index, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate short_id for venues that don't have one
DO $$
DECLARE
  venue_record RECORD;
  new_short_id TEXT;
  attempts INTEGER;
  max_attempts INTEGER := 10;
BEGIN
  FOR venue_record IN SELECT id FROM venues WHERE short_id IS NULL LOOP
    attempts := 0;
    LOOP
      new_short_id := generate_venue_short_id();
      
      -- Check if short_id already exists
      IF NOT EXISTS (SELECT 1 FROM venues WHERE short_id = new_short_id) THEN
        -- Update venue with new short_id
        UPDATE venues SET short_id = new_short_id WHERE id = venue_record.id;
        EXIT;
      END IF;
      
      attempts := attempts + 1;
      IF attempts >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique short_id for venue % after % attempts', venue_record.id, max_attempts;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Drop the temporary function
DROP FUNCTION IF EXISTS generate_venue_short_id();

-- Make short_id NOT NULL after generating for all venues
ALTER TABLE venues
ALTER COLUMN short_id SET NOT NULL;
