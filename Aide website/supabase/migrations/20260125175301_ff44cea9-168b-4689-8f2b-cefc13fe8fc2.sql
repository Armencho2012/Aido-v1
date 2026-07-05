-- Fix RLS policies to use (select auth.uid()) for better performance
-- and remove duplicate permissive policies

-- ============================================
-- PROFILES TABLE - Fix 3 policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING ((select auth.uid()) = user_id);

-- ============================================
-- USAGE_LOGS TABLE - Fix 2 policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their own usage logs" ON public.usage_logs;
DROP POLICY IF EXISTS "Users can insert their own usage logs" ON public.usage_logs;

CREATE POLICY "Users can view their own usage logs" 
ON public.usage_logs FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own usage logs" 
ON public.usage_logs FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- USER_CONTENT TABLE - Fix 5 policies, remove duplicate SELECT
-- ============================================
DROP POLICY IF EXISTS "Users can read their own content" ON public.user_content;
DROP POLICY IF EXISTS "Users can modify their own content" ON public.user_content;
DROP POLICY IF EXISTS "Users can insert their own content" ON public.user_content;
DROP POLICY IF EXISTS "Users can delete their own content" ON public.user_content;
DROP POLICY IF EXISTS "Users can update their own content" ON public.user_content;

-- Single SELECT policy (removed duplicate "modify" policy)
CREATE POLICY "Users can read their own content" 
ON public.user_content FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own content" 
ON public.user_content FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own content" 
ON public.user_content FOR UPDATE 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own content" 
ON public.user_content FOR DELETE 
USING ((select auth.uid()) = user_id);

-- ============================================
-- SUBSCRIPTIONS TABLE - Fix 3 policies, consolidate service role
-- ============================================
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;

-- User policies with optimized auth calls
CREATE POLICY "Users can view their own subscription" 
ON public.subscriptions FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own subscription" 
ON public.subscriptions FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

-- Service role policy - use TO clause to restrict to service_role only
CREATE POLICY "Service role can manage all subscriptions" 
ON public.subscriptions FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- Add missing index for foreign key performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_content_user_id ON public.user_content(user_id);