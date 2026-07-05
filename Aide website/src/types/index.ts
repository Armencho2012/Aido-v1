/**
 * Comprehensive TypeScript interfaces for type-safe data handling
 * Replaces usage of `any` type across the application
 */

export interface AnalysisSummary {
  summary: string[];
}

export interface KeyTerm {
  term: string;
  definition: string;
  importance?: 'high' | 'medium' | 'low';
}

export interface LessonSection {
  title: string;
  summary: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface StudyPlan {
  days: Array<{
    day: number;
    topics: string[];
    tasks: string[];
  }>;
}

export interface AnalysisData {
  language_detected?: string;
  three_bullet_summary: string[];
  key_terms: KeyTerm[] | string[];
  lesson_sections?: LessonSection[];
  quick_quiz_question?: QuizQuestion;
  quiz_questions?: QuizQuestion[];
  flashcards?: Flashcard[];
  study_plan?: StudyPlan;
}

export interface GenerationStatus {
  quiz?: boolean;
  flashcards?: boolean;
  map?: boolean;
  course?: boolean;
  podcast?: boolean;
}

export interface UserContent {
  id: string;
  user_id: string;
  original_text: string;
  analysis_data: AnalysisData;
  language: string;
  title: string;
  content_type: 'analyse' | 'chat' | 'course';
  generation_status: GenerationStatus;
  podcast_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: 'active' | 'cancelled' | 'expired';
  plan_type: 'free' | 'pro' | 'class';
  expires_at?: string | null;
  created_at: string;
}

export interface PodcastGenerationRequest {
  prompt: string;
  language: string;
  contentId?: string;
}

export interface PodcastGenerationResponse {
  podcast_url: string;
  success: boolean;
  generated_at: string;
}

export interface AnalysisRequest {
  text: string;
  media?: {
    data: string;
    mimeType: string;
  } | null;
  isCourse: boolean;
  generationOptions: GenerationStatus;
}

export type Language = 'en' | 'ru' | 'hy' | 'ko';

export interface UILabels {
  title: string;
  subtitle: string;
  placeholder: string;
  analyze: string;
  usage: string;
  analyzing: string;
  signOut: string;
  errorNoInput: string;
  freeTierUsage: string;
  remainingAnalyses: string;
  limitReached: string;
  dailyLimitReached: string;
  upgradeDesc: string;
  upgradeToPro: string;
  attach: string;
  fileAttached: string;
  courseMode: string;
  upgradeToContinue: string;
  library: string;
  upgrade: string;
  profile: string;
  of: string;
  [key: string]: string;
}
