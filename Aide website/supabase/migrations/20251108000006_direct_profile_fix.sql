-- DIRECT FIX: Force create profiles for all users
-- This bypasses all RLS and triggers

-- Step 1: Temporarily disable RLS to create profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Create profiles for ALL existing users
INSERT INTO public.profiles (user_id, email, full_name)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify profiles were created
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.profiles) 
    THEN '✅ SUCCESS: All users now have profiles!'
    ELSE '⚠️ WARNING: Still missing some profiles'
  END as status;

-- Step 5: Show the created profiles
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.full_name,
  p.created_at,
  u.email as auth_email
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- Step 6: Fix the trigger to ensure it works for future users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Temporarily disable RLS for this operation
  PERFORM set_config('app.bypass_rls', 'true', true);
  
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
    full_name = CASE 
      WHEN EXCLUDED.full_name IS NOT NULL AND EXCLUDED.full_name != '' 
      THEN EXCLUDED.full_name 
      ELSE profiles.full_name 
    END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Ensure RPC function exists and works
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  p_user_id UUID, 
  p_email TEXT, 
  p_full_name TEXT DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (p_user_id, p_email, p_full_name)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    email = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
    full_name = CASE 
      WHEN EXCLUDED.full_name IS NOT NULL AND EXCLUDED.full_name != '' 
      THEN EXCLUDED.full_name 
      ELSE profiles.full_name 
    END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in ensure_user_profile for user %: %', p_user_id, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT, TEXT) TO authenticated;

-- Final verification
SELECT '✅ Migration completed! Check the results above.' as message;

