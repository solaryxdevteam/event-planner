-- =============================================
-- Activate Locations (Countries, States, Cities)
-- =============================================

-- =============================================
-- 1. ACTIVATE COUNTRIES
-- =============================================

-- Option 1: Activate ALL countries
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'country';

-- Option 2: Activate specific countries by code
/*
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'country' 
  AND code IN ('CA', 'MX', 'GB', 'FR', 'DE', 'IT', 'ES', 'AU', 'NZ', 'JP', 'CN', 'IN', 'BR', 'AR', 'CL');
*/

-- =============================================
-- 2. ACTIVATE STATES
-- =============================================

-- Option 1: Activate ALL states
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'state';

-- Option 2: Activate states for specific countries
/*
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'state' 
  AND parent_id IN (
    SELECT id FROM locations 
    WHERE type = 'country' AND code IN ('US', 'CA', 'MX')
  );
*/

-- Option 3: Activate states by name pattern
/*
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'state' 
  AND name LIKE 'California%'  -- Example: Activate all states starting with "California"
*/

-- =============================================
-- 3. ACTIVATE CITIES
-- =============================================

-- Option 1: Activate ALL cities
/*
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'city';
*/

-- Option 2: Activate cities for specific states
/*
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'city' 
  AND parent_id IN (
    SELECT id FROM locations 
    WHERE type = 'state' AND name IN ('California', 'New York', 'Texas')
  );
*/

-- Option 3: Activate cities for specific countries
/*
UPDATE locations
SET 
  is_active = true,
  updated_at = NOW()
WHERE type = 'city' 
  AND parent_id IN (
    SELECT l2.id 
    FROM locations l2
    JOIN locations l1 ON l2.parent_id = l1.id
    WHERE l1.type = 'country' AND l1.code = 'US'
  );
*/

-- =============================================
-- 4. VERIFICATION QUERIES
-- =============================================

-- Summary by type and status
SELECT 
  type,
  is_active,
  COUNT(*) as count
FROM locations
GROUP BY type, is_active
ORDER BY type, is_active DESC;

-- List active countries
SELECT 
  name,
  code,
  is_active,
  created_at
FROM locations
WHERE type = 'country' AND is_active = true
ORDER BY name;

-- List active states with country
SELECT 
  l1.name as country_name,
  l2.name as state_name,
  l2.code as state_code,
  l2.is_active
FROM locations l2
LEFT JOIN locations l1 ON l2.parent_id = l1.id
WHERE l2.type = 'state' AND l2.is_active = true
ORDER BY l1.name, l2.name
LIMIT 50;

-- Count summary
SELECT 
  COUNT(*) FILTER (WHERE type = 'country' AND is_active = true) as active_countries,
  COUNT(*) FILTER (WHERE type = 'country' AND is_active = false) as inactive_countries,
  COUNT(*) FILTER (WHERE type = 'state' AND is_active = true) as active_states,
  COUNT(*) FILTER (WHERE type = 'state' AND is_active = false) as inactive_states,
  COUNT(*) FILTER (WHERE type = 'city' AND is_active = true) as active_cities,
  COUNT(*) FILTER (WHERE type = 'city' AND is_active = false) as inactive_cities
FROM locations;
