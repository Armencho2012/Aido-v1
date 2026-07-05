-- Add generation_status column to track what has been generated for each content item
ALTER TABLE public.user_content 
ADD COLUMN IF NOT EXISTS generation_status JSONB DEFAULT '{
  "quiz": false,
  "flashcards": false,
  "map": false,
  "course": false,
  "podcast": false
}'::jsonb;

-- Add content_type column to distinguish between 'analyse' and 'chat' content
ALTER TABLE public.user_content 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'analyse';

-- Add podcast_url column for storing generated podcast audio
ALTER TABLE public.user_content 
ADD COLUMN IF NOT EXISTS podcast_url TEXT;

-- Add course_data column for storing course content
ALTER TABLE public.user_content 
ADD COLUMN IF NOT EXISTS course_data JSONB;