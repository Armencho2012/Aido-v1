-- EMERGENCY FIX: Create profiles for all existing users
-- This fixes the issue where users exist but profiles don't

-- Step 1: Create profiles for all existing users who don't have one
INSERT INTO public.profiles (user_id, email, full_name)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Verify the trigger exists and is working
DO $$
BEGIN
  -- Check if trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger does not exist! Creating it...';
    
    -- Create trigger function if it doesn't exist
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
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
    END;
    $$;
    
    -- Create the trigger
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
      
    RAISE NOTICE 'Trigger created successfully!';
  ELSE
    RAISE NOTICE 'Trigger already exists.';
  END IF;
END $$;

-- Step 3: Verify RPC function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'ensure_user_profile'
  ) THEN
    RAISE NOTICE 'RPC function does not exist! Creating it...';
    
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
    END;
    $$;
    
    GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT, TEXT) TO authenticated;
    
    RAISE NOTICE 'RPC function created successfully!';
  ELSE
    RAISE NOTICE 'RPC function already exists.';
  END IF;
END $$;

-- Step 4: Verify results
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.profiles) 
    THEN '✅ All users now have profiles!'
    ELSE '⚠️ Still missing some profiles'
  END as status;

