/**
 * Shared type definitions for the Gamma Timetable Extension
 * These types are used across both the extension and web dashboard
 */

// Core data types based on existing JSDoc in timetable.js
export interface Slide {
  id: string;
  title: string;
  content: string[];
}

export interface TimetableItem {
  id: string;
  title: string;
  content: string[];
  startTime: string;
  duration: number;
  endTime: string;
}

export interface Timetable {
  startTime: string;
  items: TimetableItem[];
  totalDuration: number;
}

// Settings and configuration types
export interface TimetableSettings {
  defaultDuration: number;
  startTime: string;
  breakDuration: number;
  timeFormat: '12h' | '24h';
}

// Future types for Sprint 1+
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  subscription_tier?: 'free' | 'pro' | 'team';
  created_at?: Date;
  last_sync_at?: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  autoSync?: boolean;
  shareDurationData?: boolean; // Opt-in to share duration data for better suggestions
  defaultDuration?: number;
  syncInterval?: number; // in minutes
  exportFormat?: 'xlsx' | 'csv';
  notifications?: boolean;
}

export interface Presentation {
  id: string;
  user_id?: string;
  gamma_presentation_id: string;
  url: string;
  title: string;
  total_slides: number;
  version: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Chrome extension specific types
export interface ChromeMessage {
  type: string;
  data?: any;
  tabId?: number;
}

// Export type guards and utilities
export const isSlide = (obj: any): obj is Slide => {
  return (
    obj && typeof obj.id === 'string' && typeof obj.title === 'string' && Array.isArray(obj.content)
  );
};

export const isTimetableItem = (obj: any): obj is TimetableItem => {
  return obj && typeof obj.id === 'string' && typeof obj.duration === 'number';
};

// Sprint 36: Slide Duration Prediction Types
export interface DurationSuggestion {
  averageDuration: number;        // Suggested duration in minutes
  confidence: 'high' | 'medium' | 'low';
  sampleSize: number;             // Number of similar slides used
  durationRange: {
    p25: number;                  // 25th percentile
    median: number;               // 50th percentile (median)
    p75: number;                  // 75th percentile
  };
  matchQuality: {
    titleSimilarity: number;      // 0-1 score
    contentSimilarity: number;    // 0-1 score
  };
}

export interface DurationSuggestionRequest {
  title: string;
  content: string[];
}

export interface DurationSuggestionResponse {
  success: boolean;
  suggestion?: DurationSuggestion;
  message?: string;
  error?: string;
}
