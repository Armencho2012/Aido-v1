-- Fix is_pro_user function to validate caller can only query their own data
CREATE OR REPLACE FUNCTION public.is_pro_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Enforce that users can only check their own subscription status
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    AND plan_type IN ('pro', 'class')
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$function$;