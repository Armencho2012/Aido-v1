import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UseUsageLimitReturn {
  usageCount: number;
  dailyLimit: number;
  userPlan: 'free' | 'pro' | 'class';
  isLocked: boolean;
  isLoading: boolean;
  refreshUsage: (userId: string) => Promise<void>;
}

const DAILY_LIMIT_FREE = 1;
const DAILY_LIMIT_PRO = 50;
const DAILY_LIMIT_CLASS = Infinity;

/**
 * Custom hook for managing usage limits and plan information
 * Handles fetching subscription data and remaining analyses
 */
export const useUsageLimit = (): UseUsageLimitReturn => {
  const [usageCount, setUsageCount] = useState(1);
  const [dailyLimit, setDailyLimit] = useState(DAILY_LIMIT_FREE);
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'class'>('free');
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshUsage = useCallback(async (userId: string) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const normalizePlan = (value: string | null | undefined) => {
        const normalized = (value || '').toLowerCase();
        if (normalized === 'pro' || normalized === 'class') {
          return normalized as 'pro' | 'class';
        }
        return 'free';
      };

      const isActiveStatus = (status: string | null | undefined) => {
        const normalized = (status || '').toLowerCase();
        return normalized === 'active' || normalized === 'trialing';
      };

      // Get subscription info (latest row if multiple exist)
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .select('status, plan_type, expires_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let plan: 'free' | 'pro' | 'class' = 'free';
      let limit = DAILY_LIMIT_FREE;

      if (!subError && subscriptionData) {
        const notExpired =
          !subscriptionData.expires_at ||
          new Date(subscriptionData.expires_at) > new Date();
        const normalizedPlan = normalizePlan(subscriptionData.plan_type);
        const isActive = isActiveStatus(subscriptionData.status) && normalizedPlan !== 'free' && notExpired;

        if (isActive) {
          plan = normalizedPlan;
          limit =
            plan === 'class'
              ? DAILY_LIMIT_CLASS
              : plan === 'pro'
              ? DAILY_LIMIT_PRO
              : DAILY_LIMIT_FREE;
        }
      } else if (subError) {
        console.warn('Subscription fetch error:', subError);
      }

      // Optional fallback to RPC if subscription row is missing or blocked by RLS
      if (plan === 'free' && !subscriptionData) {
        const { data: rpcPlan, error: rpcError } = await supabase.rpc('get_user_plan', {
          p_user_id: userId
        });
        if (!rpcError && rpcPlan) {
          const normalized = normalizePlan(rpcPlan);
          if (normalized !== 'free') {
            plan = normalized;
            limit = normalized === 'class' ? DAILY_LIMIT_CLASS : DAILY_LIMIT_PRO;
          }
        } else if (rpcError) {
          console.warn('get_user_plan RPC error:', rpcError);
        }
      }

      setUserPlan(plan);
      setDailyLimit(limit);

      // Get usage count
      if (plan === 'class') {
        setUsageCount(Infinity);
        setIsLocked(false);
      } else {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const { count, error: countError } = await supabase
          .from('usage_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('action_type', 'analysis')
          .gte('created_at', today.toISOString());

        const usedCount = countError ? 0 : count ?? 0;
        const remainingCount = Math.max(0, limit - usedCount);

        setUsageCount(remainingCount);
        setIsLocked(remainingCount <= 0 && plan === 'free');
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
      // Default to free tier on error
      setUserPlan('free');
      setDailyLimit(DAILY_LIMIT_FREE);
      setUsageCount(0);
      setIsLocked(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    usageCount,
    dailyLimit,
    userPlan,
    isLocked,
    isLoading,
    refreshUsage,
  };
};
