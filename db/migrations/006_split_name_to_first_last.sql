/**
 * Migration: Split Name to First Name and Last Name
 *
 * Changes:
 * 1. Add first_name column (TEXT NOT NULL)
 * 2. Add last_name column (TEXT, nullable)
 * 3. Migrate existing data: split name into first_name and last_name
 * 4. Drop the name column
 */

-- =============================================
-- 1. ADD FIRST_NAME AND LAST_NAME COLUMNS
-- =============================================

-- Add first_name column (temporary, will be NOT NULL after migration)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Add last_name column (nullable - some names might be single word)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- =============================================
-- 2. MIGRATE EXISTING DATA
-- =============================================

-- Split existing name into first_name and last_name
-- If name has a space, split on the last space (to handle middle names)
-- If no space, put entire name in first_name and leave last_name NULL
DO $$
DECLARE
  rec RECORD;
  name_parts TEXT[];
  name_length INT;
BEGIN
  FOR rec IN SELECT id, name FROM users WHERE first_name IS NULL LOOP
    IF rec.name ~ ' ' THEN
      -- Split name by spaces
      name_parts := string_to_array(rec.name, ' ');
      name_length := array_length(name_parts, 1);
      
      -- First name is everything except the last word
      UPDATE users
      SET first_name = TRIM(ARRAY_TO_STRING(name_parts[1:name_length-1], ' ')),
          last_name = TRIM(name_parts[name_length])
      WHERE id = rec.id;
    ELSE
      -- Single word name
      UPDATE users
      SET first_name = TRIM(rec.name),
          last_name = NULL
      WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- =============================================
-- 3. MAKE FIRST_NAME NOT NULL AND DROP NAME COLUMN
-- =============================================

-- Make first_name NOT NULL
ALTER TABLE users
ALTER COLUMN first_name SET NOT NULL;

-- Drop the old name column
ALTER TABLE users
DROP COLUMN IF EXISTS name;

-- =============================================
-- 4. ADD INDEXES AND COMMENTS
-- =============================================

-- Create index on first_name for searching
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);

-- Create index on last_name for searching
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name) WHERE last_name IS NOT NULL;

-- Comments
COMMENT ON COLUMN users.first_name IS 'User first name (required)';
COMMENT ON COLUMN users.last_name IS 'User last name (optional)';

-- =============================================
-- END OF MIGRATION
-- =============================================
