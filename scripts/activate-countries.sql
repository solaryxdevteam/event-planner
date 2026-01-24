-- =============================================
-- Activate Countries in Locations Table
-- =============================================

-- Option 1: Activate ALL countries
-- This will set is_active = true for all countries
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'country';

-- Option 2: Activate specific countries by code
-- Uncomment and modify the country codes as needed
/*
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'country' 
  AND code IN ('CA', 'MX', 'GB', 'FR', 'DE', 'IT', 'ES', 'AU', 'NZ', 'JP', 'CN', 'IN', 'BR', 'AR', 'CL');
*/

-- Option 3: Activate countries by name pattern
-- Uncomment and modify the pattern as needed
/*
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'country' 
  AND name LIKE 'United%'  -- Example: Activate all countries starting with "United"
*/

-- Option 4: Activate countries excluding specific ones
-- Uncomment and modify as needed
/*
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'country' 
  AND code NOT IN ('AQ', 'TF', 'HM', 'GS');  -- Exclude Antarctica and territories
*/

-- Verify the results
SELECT 
  type,
  is_active,
  COUNT(*) as count
FROM locations
WHERE type = 'country'
GROUP BY type, is_active
ORDER BY is_active DESC;

-- List active countries
SELECT 
  name,
  code,
  is_active,
  created_at
FROM locations
WHERE type = 'country' AND is_active = true
ORDER BY name;
