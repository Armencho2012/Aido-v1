-- Update the is_pro_user function to check for both 'pro' and 'class' plans
CREATE OR REPLACE FUNCTION public.is_pro_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    AND plan_type IN ('pro', 'class')
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- Create a function to get the user's plan type
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
BEGIN
  SELECT plan_type INTO v_plan
  FROM public.subscriptions
  WHERE user_id = p_user_id
  AND status = 'active'
  AND (expires_at IS NULL OR expires_at > now())
  ORDER BY 
    CASE plan_type 
      WHEN 'class' THEN 1 
      WHEN 'pro' THEN 2 
      ELSE 3 
    END
  LIMIT 1;
  
  RETURN COALESCE(v_plan, 'free');
END;
$$;