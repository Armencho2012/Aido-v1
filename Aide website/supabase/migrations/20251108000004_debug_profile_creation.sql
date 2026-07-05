-- Debug and fix profile creation issues
-- This migration helps diagnose and fix profile creation problems

-- First, let's check if the RPC function exists and has correct permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'ensure_user_profile'
  ) THEN
    RAISE EXCEPTION 'RPC function ensure_user_profile does not exist! Run migration 20251108000001_fix_profile_creation.sql first.';
  END IF;
END $$;

-- Verify the function signature
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments,
  prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'ensure_user_profile';

-- Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Grant additional permissions if needed
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Create a test function to verify RLS is working
CREATE OR REPLACE FUNCTION public.test_profile_access()
RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.email, p.full_name
  FROM public.profiles p
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_profile_access() TO authenticated;

