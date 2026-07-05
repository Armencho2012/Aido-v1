import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface GenerationStatus {
  quiz?: boolean;
  flashcards?: boolean;
  map?: boolean;
  course?: boolean;
  podcast?: boolean;
}

export interface ContentItem {
  id: string;
  title: string | null;
  original_text: string;
  analysis_data: any;
  language: string | null;
  created_at: string | null;
  user_id: string;
  content_type: string | null;
  generation_status: GenerationStatus | null;
  podcast_url: string | null;
  course_data?: any | null;
}

interface UseContentOptions {
  id?: string;
  redirectOnNotFound?: boolean;
}

interface UseContentResult {
  user: User | null;
  content: ContentItem | null;
  contentList: ContentItem[];
  isLoading: boolean;
  isAuthChecked: boolean;
  deleteContent: (id: string) => Promise<void>;
  refetch: () => void;
}

export const useContent = (options: UseContentOptions = {}): UseContentResult => {
  const { id, redirectOnNotFound = true } = options;
  const [user, setUser] = useState<User | null>(null);
  const [content, setContent] = useState<ContentItem | null>(null);
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const navigate = useNavigate();

  const fetchContent = useCallback(async (userId: string, contentId?: string, contentType?: string) => {
    try {
      // Build query with optional content_type filter
      let query = supabase
        .from('user_content')
        .select('*')
        .eq('user_id', userId);
      
      // Filter by content_type if provided
      if (contentType) {
        query = query.eq('content_type', contentType);
      }
      
      const { data: items, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching content from Supabase:', error);
        setContentList([]);
        setIsLoading(false);
        return;
      }

      // Map the Supabase data to ContentItem type
      const typedItems: ContentItem[] = (items || []).map(item => ({
        ...item,
        generation_status: item.generation_status as GenerationStatus | null
      }));
      setContentList(typedItems);

      if (contentId) {
        const item = typedItems.find(i => i.id === contentId);
        if (!item && redirectOnNotFound) {
          navigate('/library');
          return;
        }
        setContent(item || null);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      if (redirectOnNotFound && id) {
        navigate('/library');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, redirectOnNotFound, id]);

  const deleteContent = useCallback(async (contentId: string) => {
    if (!user) return;
    
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('user_content')
        .delete()
        .eq('id', contentId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting content from Supabase:', error);
        return;
      }
      
      setContentList(prev => prev.filter(item => item.id !== contentId));
      if (content?.id === contentId) {
        setContent(null);
      }
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  }, [user, content]);

  const refetch = useCallback(() => {
    if (user) {
      setIsLoading(true);
      fetchContent(user.id, id);
    }
  }, [user, id, fetchContent]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (!session) {
          setIsAuthChecked(true);
          setIsLoading(false);
          navigate('/auth');
          return;
        }

        setUser(session.user);
        setIsAuthChecked(true);
        await fetchContent(session.user.id, id);
      } catch (error) {
        console.error('Auth error:', error);
        if (isMounted) {
          setIsAuthChecked(true);
          setIsLoading(false);
          navigate('/auth');
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, id, fetchContent]);

  return {
    user,
    content,
    contentList,
    isLoading,
    isAuthChecked,
    deleteContent,
    refetch,
  };
};
