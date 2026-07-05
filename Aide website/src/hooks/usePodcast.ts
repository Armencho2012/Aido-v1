import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UsePodcastReturn {
  podcastAudio: string | null;
  isPlaying: boolean;
  isGenerating: boolean;
  error: string | null;
  audioRef: React.RefObject<HTMLAudioElement>;
  generatePodcast: (prompt: string, language: string) => Promise<string>;
  togglePlayback: () => void;
  clearError: () => void;
  clearAudio: () => void;
}

/**
 * Custom hook for managing podcast generation and playback
 * Handles all podcast-related state and logic
 */
export const usePodcast = (): UsePodcastReturn => {
  const [podcastAudio, setPodcastAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-play when audio URL changes
  useEffect(() => {
    if (podcastAudio && audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch((err) => {
        console.error('Auto-play failed:', err);
        setIsPlaying(false);
      });
    }
  }, [podcastAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const generatePodcast = useCallback(
    async (prompt: string, language: string): Promise<string> => {
      setIsGenerating(true);
      setError(null);

      try {
        const { data, error: podcastError } = await supabase.functions.invoke(
          'generate-podcast',
          {
            body: { prompt, language },
          }
        );

        if (podcastError) {
          // Check for rate limit errors
          if (
            podcastError.message?.includes('limit') ||
            podcastError.message?.includes('429') ||
            podcastError.message?.includes('Daily')
          ) {
            setError('Daily podcast limit reached');
            throw new Error('Rate limit exceeded');
          }

          setError(podcastError.message || 'Failed to generate podcast');
          throw new Error(podcastError.message || 'Failed to generate podcast');
        }

        if (!data?.podcast_url) {
          throw new Error('No podcast URL returned');
        }

        // Validate URL
        try {
          new URL(data.podcast_url);
        } catch {
          throw new Error('Invalid podcast URL received');
        }

        setPodcastAudio(data.podcast_url);
        return data.podcast_url;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const togglePlayback = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch((err) => {
          console.error('Playback failed:', err);
          setError('Could not play audio');
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPodcastAudio(null);
    setIsPlaying(false);
    setError(null);
  }, []);

  return {
    podcastAudio,
    isPlaying,
    isGenerating,
    error,
    audioRef,
    generatePodcast,
    togglePlayback,
    clearError,
    clearAudio,
  };
};
