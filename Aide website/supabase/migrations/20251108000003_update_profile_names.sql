-- Update existing profiles to set full_name from user metadata if it's missing
UPDATE public.profiles p
SET full_name = COALESCE(
  NULLIF(p.full_name, ''),
  (SELECT raw_user_meta_data->>'full_name' 
   FROM auth.users 
   WHERE id = p.user_id)
)
WHERE p.full_name IS NULL OR p.full_name = '';

