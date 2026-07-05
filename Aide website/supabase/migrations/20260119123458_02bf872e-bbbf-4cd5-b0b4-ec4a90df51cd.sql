-- Grant Pro plans to specified users
INSERT INTO public.subscriptions (user_id, status, plan_type, purchased_at)
VALUES 
  ('d13adab6-1ded-4ef9-9a6c-3e0bfb303b18', 'active', 'pro', now()),
  ('db1f7fdd-9e6a-4ecb-81f7-8eb5a7a1db09', 'active', 'pro', now()),
  ('61a14930-9afb-4265-be2b-5e5c7b99dbda', 'active', 'pro', now()),
  ('a79869b2-bf6c-4ae7-9502-90bd785ea93f', 'active', 'pro', now())
ON CONFLICT (user_id) 
DO UPDATE SET 
  status = 'active',
  plan_type = 'pro',
  purchased_at = COALESCE(public.subscriptions.purchased_at, now()),
  updated_at = now();