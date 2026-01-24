/**
 * Migration: Add city TEXT column to users table
 *
 * Adds a city TEXT column alongside city_id for text-based city input
 * This allows users to enter city names as text rather than selecting from locations
 */

-- Add city TEXT column (nullable, can coexist with city_id)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS city TEXT;

-- Create index for city text searches
CREATE INDEX IF NOT EXISTS idx_users_city_text ON users(city);

COMMENT ON COLUMN users.city IS 'City name as text (alternative to city_id for free-form city entry)';
