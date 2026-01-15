-- =============================================
-- Auto-create User Record on Authentication
-- =============================================
-- This trigger automatically creates a user record in the public.users table
-- when someone signs up via Supabase Auth (magic link)
--
-- Run this SQL in your Supabase SQL Editor after running the initial schema migration

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert new user into public.users table
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    is_active,
    notification_prefs
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- Use name from metadata if provided, otherwise use email username
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    'event_planner', -- Default role for new users
    true, -- Active by default
    '{"email_enabled": true, "frequency": "instant"}'::jsonb -- Default notification preferences
  )
  ON CONFLICT (id) DO NOTHING; -- Ignore if user already exists

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent auth user creation
    RAISE WARNING 'Failed to create user record: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates a user record in public.users when a new auth.users record is created. '
  'This ensures every authenticated user has a corresponding database profile.';

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment explaining the trigger
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
  'Fires after a new user signs up via Supabase Auth to create their profile in public.users table.';

-- Grant necessary permissions (if needed)
-- This ensures the function can insert into the users table
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT ON public.users TO authenticated;

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- =============================================
-- Testing the Trigger
-- =============================================
-- To test this trigger:
-- 1. Sign up with a new email via magic link
-- 2. After authentication, check the users table:
--    SELECT * FROM public.users WHERE email = 'your-test-email@example.com';
-- 3. The user should be created automatically with role 'event_planner'

-- =============================================
-- Troubleshooting
-- =============================================
-- If users are not being created automatically:
-- 1. Check if the trigger exists:
--    SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
-- 2. Check if the function exists:
--    SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
-- 3. Check Supabase logs for any errors during user creation
-- 4. Manually test the function:
--    SELECT public.handle_new_user();

-- =============================================
-- Manual User Creation (if needed)
-- =============================================
-- If you need to manually create a user record for an authenticated user:
/*
INSERT INTO public.users (id, email, name, role)
VALUES (
  'auth-user-id-here',
  'user@example.com',
  'User Name',
  'event_planner'
);
*/
