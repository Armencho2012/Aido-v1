import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthChecked: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/**
 * Custom hook for managing authentication state
 * Centralizes auth logic and reduces prop drilling
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const navigate = useNavigate();

  // Initialize auth state and set up listeners
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for existing session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setUser(null);
          navigate('/auth');
          return;
        }

        setUser(session?.user ?? null);

        if (!session) {
          navigate('/auth');
        }
      } catch (err) {
        console.error('Failed to get session:', err);
        setUser(null);
        navigate('/auth');
      } finally {
        setIsLoading(false);
        setIsAuthChecked(true);
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (!session && event !== 'SIGNED_OUT') {
        navigate('/auth');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;
      setUser(currentUser ?? null);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthChecked,
    signOut,
    refreshUser,
  };
};
