-- Fix get_daily_usage_count to enforce caller authorization
CREATE OR REPLACE FUNCTION public.get_daily_usage_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enforce that users can only check their own usage
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access other users data';
  END IF;

  RETURN (
    SELECT COUNT(*)
    FROM public.usage_logs
    WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
  );
END;
$$;