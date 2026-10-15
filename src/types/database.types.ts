export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CardState = 'new' | 'learning' | 'reviewing' | 'mastered';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  current_streak: number;
  longest_streak: number;
  daily_goal_cards: number;
  audio_auto_play: boolean;
  preferred_voice: string;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color_code: string;
  created_at: string;
  updated_at: string;
}

export interface StudySet {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  is_public: boolean;
  tags: string[];
  total_cards: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  set_id: string;
  term: string;
  ipa: string | null;
  part_of_speech: string | null;
  definition: string;
  example: string | null;
  synonyms: string[];
  audio_url: string | null;
  image_url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface UserCardProgress {
  id: string;
  user_id: string;
  card_id: string;
  box_level: number;
  repetition: number;
  interval_days: number;
  ease_factor: number;
  state: CardState;
  last_reviewed_at: string | null;
  next_review_at: string;
  total_reviews: number;
  consecutive_correct: number;
  created_at: string;
  updated_at: string;
  card?: Card;
}

export interface StudyLog {
  id: string;
  user_id: string;
  card_id: string;
  rating: ReviewRating;
  time_taken_ms: number | null;
  reviewed_date: string;
  created_at: string;
}
